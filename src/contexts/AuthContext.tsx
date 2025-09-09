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

  // 🔧 FIXED: Better error handling in refreshUser
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.log('[AUTH] No token found, cannot refresh user');
      setAuthState({ user: null, isAuthenticated: false, isLoading: false, token: null });
      return;
    }

    try {
      console.log('[AUTH] Refreshing user data...');
      const currentUserFromAPI: UserResponse = await authAPI.getCurrentUser();
      const updatedUser = transformBackendUser(currentUserFromAPI);
      
      console.log('[AUTH] User refreshed successfully:', updatedUser.role);
      localStorage.setItem('auth', JSON.stringify(updatedUser));
      setAuthState(prev => ({ 
        ...prev, 
        user: updatedUser, 
        isAuthenticated: true, 
        isLoading: false, 
        token
      }));
    } catch (error) {
      console.error('[AUTH] Failed to refresh user:', error);
      
      // 🔧 FIXED: Don't automatically logout on refresh failure
      // Instead, try to use saved auth data
      const savedAuth = localStorage.getItem('auth');
      if (savedAuth) {
        try {
          const authData = JSON.parse(savedAuth);
          console.log('[AUTH] Using saved auth data as fallback');
          setAuthState(prev => ({ 
            ...prev, 
            user: authData, 
            isAuthenticated: true, 
            isLoading: false, 
            token
          }));
          return;
        } catch (parseError) {
          console.error('[AUTH] Failed to parse saved auth data:', parseError);
        }
      }
      
      // Only logout if we really can't recover
      console.log('[AUTH] Cannot recover auth state, logging out');
      localStorage.removeItem('auth');
      localStorage.removeItem('access_token');
      setAuthState({ user: null, isAuthenticated: false, isLoading: false, token: null });
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AUTH] Initializing auth...');
      const token = localStorage.getItem('access_token');
      const savedAuth = localStorage.getItem('auth');
      
      if (token) {
        if (savedAuth) {
          try {
            const authData = JSON.parse(savedAuth);
            console.log('[AUTH] Found saved auth data for role:', authData.role);
            setAuthState(prev => ({ 
              ...prev, 
              user: authData, 
              isAuthenticated: true, 
              isLoading: false,
              token 
            }));
            
            // 🔧 FIXED: Only refresh if not company user or if refresh is critical
            // Company users might not have access to getCurrentUser endpoint
            if (authData.role !== 'company') {
              console.log('[AUTH] Refreshing user data for non-company user');
              await refreshUser(); 
            } else {
              console.log('[AUTH] Skipping refresh for company user');
            }
          } catch (error) {
            console.error('[AuthContext] Error parsing saved auth data:', error);
            localStorage.removeItem('auth');
            localStorage.removeItem('access_token');
            setAuthState({ user: null, isAuthenticated: false, isLoading: false, token: null });
          }
        } else {
          console.log('[AUTH] No saved auth, refreshing...');
          await refreshUser();
        }
      } else {
        console.log('[AUTH] No token found');
        setAuthState({ user: null, isAuthenticated: false, isLoading: false, token: null });
      }
    };
    initializeAuth();
  }, [refreshUser]);

  const commonLoginLogic = useCallback((accessToken: string, userData: UserResponse) => {
    const user = transformBackendUser(userData);
    console.log('[AUTH] Setting auth state for user:', user.role);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('auth', JSON.stringify(user));
    setAuthState({ user, isAuthenticated: true, isLoading: false, token: accessToken });
  }, []);

  // Updated login function for mobile-based authentication
  const login = async (mobile: string, password: string): Promise<{ success: boolean; error?: string }> => {
    console.log('[AUTH] Regular login attempt for:', mobile);
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await authAPI.login(mobile, password);
      commonLoginLogic(response.access_token, response.user);
      
      // 🔧 FIXED: Only refresh for non-company users
      if (response.user.role !== 'company') {
        await refreshUser();
      }
      return { success: true };
    } catch (error: any) {
      console.error('[AUTH] Login failed:', error);
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
    console.log('[AUTH] Company login attempt for:', mobile);
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await authAPI.companyLogin(mobile, password);
      if (!response.access_token || !response.user) {
        throw new Error('Invalid response from server - missing token or user data');
      }
      
      console.log('[AUTH] Company login successful, user role:', response.user.role);
      commonLoginLogic(response.access_token, response.user);
      
      // 🔧 FIXED: Don't refresh user data for company login
      // Company users might not have access to getCurrentUser endpoint
      console.log('[AUTH] Skipping user refresh for company login');
      
      return { success: true };
    } catch (error: any) {
      console.error('[AUTH] Company login failed:', error);
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
        
        // 🔧 FIXED: Only refresh for non-company users
        if (response.user.role !== 'company') {
          await refreshUser();
        }
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
    console.log('[AUTH] Logging out user');
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