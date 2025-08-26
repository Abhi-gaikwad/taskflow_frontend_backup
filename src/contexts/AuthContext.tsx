import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '../types';
import { authAPI } from '../services/api';
import { transformBackendUser } from '../utils/transform';
import { handleApiError } from '../services/api';

// Backend user response interface
interface UserResponse {
  id: number;
  mobile_no?: string;
  phone_number?: string;
  username: string;
  is_active: boolean;
  role: 'super_admin' | 'admin' | 'user' | 'company';
  created_at: string;
  full_name?: string;
  department?: string;
  company_id?: number;
  company?: {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    company_username?: string;
  };
  can_assign_tasks?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

interface AuthContextType extends AuthState {
  login: (mobile: string, password: string) => Promise<{ success: boolean; error?: string }>;
  companyLogin: (mobile: string, password: string) => Promise<{ success: boolean; error?: string }>;
  smartLogin: (mobile: string, password: string, otp: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canAccessRoute: (route: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  canAssignTasks: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Role-based permissions and route access
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['manage_companies', 'manage_all_users', 'view_dashboard', 'view_assignable_users'],
  admin: ['manage_company_users', 'manage_company_tasks', 'view_dashboard', 'view_assignable_users'],
  company: ['manage_company_users', 'manage_company_tasks', 'view_dashboard', 'view_assignable_users'],
  user: ['view_own_tasks', 'update_own_tasks', 'view_dashboard'],
};

const ROUTE_ACCESS: Record<string, string[]> = {
  '/dashboard': ['super_admin', 'admin', 'user', 'company'],
  '/users': ['super_admin', 'admin', 'company'],
  '/companies': ['super_admin'],
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    token: localStorage.getItem('access_token'),
  });

  const refreshUser = useCallback(async () => {
    try {
      const currentUserFromAPI: UserResponse = await authAPI.getCurrentUser();
      const updatedUser = transformBackendUser(currentUserFromAPI);
      
      localStorage.setItem('auth', JSON.stringify(updatedUser));
      setAuthState(prev => ({ 
        ...prev, 
        user: updatedUser, 
        isAuthenticated: true, 
        isLoading: false, 
        token: localStorage.getItem('access_token')
      }));
    } catch (error) {
      console.error('Failed to refresh user, logging out.', error);
      localStorage.removeItem('auth');
      localStorage.removeItem('access_token');
      setAuthState({ user: null, isAuthenticated: false, isLoading: false, token: null });
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('access_token');
      const savedAuth = localStorage.getItem('auth');
      
      if (token) {
        if (savedAuth) {
          try {
            const authData = JSON.parse(savedAuth);
            setAuthState(prev => ({ 
              ...prev, 
              user: authData.user || null, 
              isAuthenticated: true, 
              token 
            }));
            await refreshUser(); 
          } catch (error) {
            console.error('[AuthContext] Error parsing saved auth data:', error);
            localStorage.removeItem('auth');
            localStorage.removeItem('access_token');
            setAuthState({ user: null, isAuthenticated: false, isLoading: false, token: null });
          }
        } else {
          await refreshUser();
        }
      } else {
        setAuthState({ user: null, isAuthenticated: false, isLoading: false, token: null });
      }
    };
    initializeAuth();
  }, [refreshUser]);

  const commonLoginLogic = useCallback((accessToken: string, userData: UserResponse) => {
    const user = transformBackendUser(userData);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('auth', JSON.stringify({ ...userData, user }));
    setAuthState({ user, isAuthenticated: true, isLoading: false, token: accessToken });
  }, []);

  // Updated login function for mobile-based authentication
  const login = async (mobile: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await authAPI.login(mobile, password);
      commonLoginLogic(response.access_token, response.user);
      await refreshUser();
      return { success: true };
    } catch (error: any) {
      const errorMessage = handleApiError(error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: errorMessage };
    }
  };

  // Updated company login function for mobile-based authentication
  const companyLogin = async (
    mobile: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await authAPI.companyLogin(mobile, password);
      if (!response.access_token || !response.user) {
        throw new Error('Invalid response from server - missing token or user data');
      }
      commonLoginLogic(response.access_token, response.user);
      await refreshUser();
      return { success: true };
    } catch (error: any) {
      const errorMessage = handleApiError(error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: errorMessage };
    }
  };

  // New smart login function that handles mobile + password/OTP
  const smartLogin = async (mobile: string, password: string, otp: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    console.log('[AUTH] Smart login attempt for mobile:', mobile);
    
    try {
      const response = await authAPI.smartLogin(mobile, password, otp);
      
      // Check if this is an OTP response
      if (response.message && !response.access_token) {
        console.log('[AUTH] OTP sent to mobile');
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, message: response.message };
      }
      
      // This is a successful login response
      if (response.access_token && response.user) {
        console.log('[AUTH] Smart login successful, user role:', response.user?.role);
        commonLoginLogic(response.access_token, response.user);
        await refreshUser();
        return { success: true };
      }
      
      throw new Error('Invalid response from server');
      
    } catch (error: any) {
      console.log('[AUTH] Smart login failed:', handleApiError(error));
      
      const errorMessage = handleApiError(error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth');
    localStorage.removeItem('access_token');
    setAuthState({ user: null, isAuthenticated: false, isLoading: false, token: null });
    window.location.href = '/login';
  };

  const updateUser = useCallback((user: User) => {
    localStorage.setItem('auth', JSON.stringify(user));
    setAuthState(prev => ({ ...prev, user }));
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!authState.user) return false;
    
    const { user } = authState;

    switch (permission) {
      case 'view_assignable_users':
      case 'assign_tasks':
        if (['super_admin', 'company', 'admin'].includes(user.role)) return true;
        if (user.role === 'user' && user.can_assign_tasks) return true;
        return false;

      case 'manage_users':
        return ['super_admin', 'company', 'admin'].includes(user.role);

      case 'manage_companies':
        return user.role === 'super_admin';

      case 'view_all_tasks':
        return ['super_admin', 'company', 'admin'].includes(user.role);

      case 'manage_tasks':
        return ['super_admin', 'company', 'admin', 'user'].includes(user.role);

      case 'update_task_status':
        return true;

      case 'create_admin_users':
        return ['super_admin', 'company'].includes(user.role);

      case 'view_company_data':
        return ['super_admin', 'company', 'admin'].includes(user.role);

      default:
        const userPermissions = ROLE_PERMISSIONS[user.role] || [];
        return userPermissions.includes(permission);
    }
  }, [authState.user]);

  const canAccessRoute = useCallback((route: string): boolean => {
    if (!authState.user) return false;
    const allowedRoles = ROUTE_ACCESS[route];
    if (!allowedRoles) return true;
    return allowedRoles.includes(authState.user.role);
  }, [authState.user]);

  const hasRole = useCallback((role: string | string[]): boolean => {
    if (!authState.user) return false;
    const userRole = authState.user.role;
    if (Array.isArray(role)) {
      return role.includes(userRole);
    }
    return userRole === role;
  }, [authState.user]);

  const canAssignTasks = useCallback((): boolean => {
    return hasPermission('assign_tasks');
  }, [hasPermission]);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    companyLogin,
    smartLogin,
    logout,
    updateUser,
    refreshUser,
    hasPermission,
    canAccessRoute,
    hasRole,
    canAssignTasks,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const usePermissions = () => {
  const { user, hasPermission } = useAuth();
  return {
    canManageUsers: hasPermission('manage_users'),
    canManageCompanies: hasPermission('manage_companies'),
    canViewAssignableUsers: hasPermission('view_assignable_users'),
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isSuperAdmin: user?.role === 'super_admin',
  };
};

export const useRouteAccess = () => {
  const { canAccessRoute } = useAuth();
  return {
    canAccessDashboard: canAccessRoute('/dashboard'),
    canAccessUsers: canAccessRoute('/users'),
    canAccessCompanies: canAccessRoute('/companies'),
  };
};