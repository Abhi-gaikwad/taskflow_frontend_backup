// src/services/api.ts - Enhanced with comprehensive debugging and error handling
import axios, { AxiosResponse } from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});



// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('[API] Request:', config.method?.toUpperCase(), config.url, {
      headers: config.headers,
      data: config.data instanceof FormData ? 'FormData' : config.data
    });
    return config;
  },
  (error) => {
    console.error('[API] Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log('[API] Response Success:', response.status, response.config.url, {
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  (error) => {
    console.error('[API] Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data,
      message: error.message,
      code: error.code
    });
    
    if (error.response?.status === 401) {
      console.log('[API] 401 Unauthorized - clearing tokens and redirecting to login');
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth');
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  /**
   * Regular user login (includes static superadmin)
   * For SuperAdmin access, use:
   * - Email: superadmin@test.com
   * - Password: 123
   */
  login: async (email: string, password: string) => {
    console.log('[API] Regular login attempt for:', email);
    
    // Log if this is a superadmin login attempt
    
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await api.post('/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      
      
      // Validate response structure
      if (!response.data.access_token || !response.data.user) {
        throw new Error('Invalid response structure: missing access_token or user');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('[API] Regular login failed for:', email, error.response?.data || error.message);
      throw error;
    }
  },

  companyLogin: async (company_username: string, company_password: string) => {
    console.log('[API] Company login attempt for:', company_username);
    
    try {
      const formData = new FormData();
      formData.append('username', company_username);
      formData.append('password', company_password);

      console.log('[API] Company login FormData prepared');
      
      const response = await api.post('/company-login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      console.log('[API] Company login API call completed successfully');
      
      // Validate response structure
      if (!response.data) {
        throw new Error('Empty response from server');
      }
      
      if (!response.data.access_token) {
        console.error('[API] Missing access_token in response:', response.data);
        throw new Error('Invalid response: missing access_token');
      }
      
      if (!response.data.user) {
        console.error('[API] Missing user data in response:', response.data);
        throw new Error('Invalid response: missing user data');
      }
      
      console.log('[API] Company login successful for:', company_username, {
        hasToken: !!response.data.access_token,
        hasUser: !!response.data.user,
        userId: response.data.user?.id,
        userRole: response.data.user?.role
      });
      
      return response.data;
    } catch (error: any) {
      console.error('[API] Company login failed for:', company_username, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  },

  getCurrentUser: async () => {
    console.log('[API] Getting current user');
    try {
      const response = await api.get('/users/me');
      console.log('[API] Current user retrieved successfully:', {
        id: response.data?.id,
        email: response.data?.email,
        role: response.data?.role,
        isStaticSuperAdmin: response.data?.id === -999
      });
      return response.data;
    } catch (error: any) {
      console.error('[API] Get current user failed:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Helper function to check if current user is the static superadmin
   */
 
};

// Users API
export const usersAPI = {
  getUsers: async (params?: {
    skip?: number;
    limit?: number;
    company_id?: number;
    role?: string;
    is_active?: boolean;
  }): Promise<User[]> => {
    try {
      const response: AxiosResponse<User[]> = await api.get('/users', { params });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  getUser: async (userId: string | number): Promise<User> => {
    try {
      const response: AxiosResponse<User> = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  createUser: async (data: {
    email: string;
    username: string;
    password: string;
    role?: string;
    company_id?: number;
    is_active?: boolean;
    full_name?: string;
    phone_number?: string;
    department?: string;
    can_assign_tasks?: boolean;
  }): Promise<User> => {
    try {
      const response: AxiosResponse<User> = await api.post('/users', data);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  updateUser: async (
    userId: string | number,
    updates: Partial<{
      email: string;
      username: string;
      password: string;
      role: string;
      company_id: number;
      is_active: boolean;
      full_name: string;
      phone_number: string;
      department: string;
      can_assign_tasks: boolean;
      canAssignTasks: boolean; // For frontend compatibility
      isActive: boolean; // For frontend compatibility
    }>
  ): Promise<User> => {
    try {
      const backendUpdates: any = { ...updates };
      if ('canAssignTasks' in updates) {
        backendUpdates.can_assign_tasks = updates.canAssignTasks;
        delete backendUpdates.canAssignTasks;
      }
      if ('isActive' in updates) {
        backendUpdates.is_active = updates.isActive;
        delete backendUpdates.isActive;
      }

      const response: AxiosResponse<User> = await api.put(`/users/${userId}`, backendUpdates);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  deleteUser: async (userId: string | number): Promise<{ message: string }> => {
    try {
      const response: AxiosResponse<{ message: string }> = await api.delete(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  activateUser: async (userId: string | number): Promise<{ message: string }> => {
    try {
      const response: AxiosResponse<{ message: string }> = await api.post(`/users/${userId}/activate`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  getProfile: async (): Promise<User> => {
    try {
      const response: AxiosResponse<User> = await api.get('/profile');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  updateProfile: async (updates: Partial<{
    email: string;
    username: string;
    password: string;
    full_name: string;
    phone_number: string;
    department: string;
  }>): Promise<User> => {
    try {
      const response: AxiosResponse<User> = await api.put('/profile', updates);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};

// Company API
export const companyAPI = {
  createCompany: async (data: { 
    name: string; 
    description?: string; 
    company_username: string; 
    company_password: string; 
  }) => {
    console.log('[API] Creating company with data:', {
      name: data.name,
      description: data.description,
      company_username: data.company_username,
      hasPassword: !!data.company_password
    });
    
    const response = await api.post('/companies', data);
    return response.data;
  },

  listCompanies: async () => {
    const response = await api.get('/companies');
    return response.data;
  },

  getCompany: async (companyId: number) => {
    const response = await api.get(`/companies/${companyId}`);
    return response.data;
  },

  updateCompany: async (companyId: number, updates: {
    name?: string;
    description?: string;
    is_active?: boolean;
  }) => {
    const response = await api.put(`/companies/${companyId}`, updates);
    return response.data;
  },
};

// Tasks API - Enhanced with bulk creation
export const tasksAPI = {
  // Create single task
  createTask: async (data: {
    title: string;
    description?: string;
    assigned_to_id: number;
    due_date?: string;
    priority?: string;
  }) => {
    console.log('[API] Creating single task:', {
      title: data.title,
      assigned_to_id: data.assigned_to_id,
      priority: data.priority
    });
    
    try {
      const response = await api.post('/tasks', data);
      console.log('[API] Single task created successfully:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('[API] Failed to create single task:', error.response?.data || error.message);
      throw error;
    }
  },

  // Create bulk tasks
  createBulkTasks: async (data: {
    title: string;
    description?: string;
    assigned_to_ids: number[];
    due_date?: string;
    priority?: string;
  }) => {
    console.log('[API] Creating bulk tasks:', {
      title: data.title,
      assigned_to_ids: data.assigned_to_ids,
      user_count: data.assigned_to_ids.length,
      priority: data.priority
    });
    
    try {
      const response = await api.post('/tasks/bulk', data);
      console.log('[API] Bulk tasks created:', {
        successful: response.data.success_count,
        failed: response.data.failure_count,
        total: response.data.total_attempted
      });
      return response.data;
    } catch (error: any) {
      console.error('[API] Failed to create bulk tasks:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get user's tasks
  getMyTasks: async (params?: {
    status?: string;
    skip?: number;
    limit?: number;
  }) => {
    console.log('[API] Getting my tasks with params:', params);
    
    try {
      const response = await api.get('/my-tasks', { params });
      console.log('[API] Retrieved tasks:', response.data.length);
      return response.data;
    } catch (error: any) {
      console.error('[API] Failed to get my tasks:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get all tasks (admin view)
  getAllTasks: async (params?: {
    status?: string;
    assigned_to_id?: number;
    created_by?: number;
    company_id?: number;
    skip?: number;
    limit?: number;
  }) => {
    console.log('[API] Getting all tasks with params:', params);
    
    try {
      const response = await api.get('/tasks', { params });
      console.log('[API] Retrieved all tasks:', response.data.length);
      return response.data;
    } catch (error: any) {
      console.error('[API] Failed to get all tasks:', error.response?.data || error.message);
      throw error;
    }
  },

  // Update task status
  updateTaskStatus: async (taskId: number, status: string) => {
    console.log('[API] Updating task status:', { taskId, status });
    
    try {
      const response = await api.put(`/tasks/${taskId}/status?status=${status}`);
      console.log('[API] Task status updated successfully');
      return response.data;
    } catch (error: any) {
      console.error('[API] Failed to update task status:', error.response?.data || error.message);
      throw error;
    }
  },

  // Update task (full update)
  updateTask: async (taskId: number, updates: {
    title?: string;
    description?: string;
    status?: string;
    due_date?: string;
  }) => {
    console.log('[API] Updating task:', { taskId, updates });
    
    try {
      const response = await api.put(`/tasks/${taskId}`, updates);
      console.log('[API] Task updated successfully');
      return response.data;
    } catch (error: any) {
      console.error('[API] Failed to update task:', error.response?.data || error.message);
      throw error;
    }
  },

  // Delete task
  deleteTask: async (taskId: number) => {
    console.log('[API] Deleting task:', taskId);
    
    try {
      const response = await api.delete(`/tasks/${taskId}`);
      console.log('[API] Task deleted successfully');
      return response.data;
    } catch (error: any) {
      console.error('[API] Failed to delete task:', error.response?.data || error.message);
      throw error;
    }
  }
};

export const handleApiError = (error: any): string => {
  console.log('[API] Handling API Error:', {
    hasResponse: !!error.response,
    status: error.response?.status,
    data: error.response?.data,
    message: error.message,
    code: error.code
  });
  
  // Handle network errors
  if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
    return 'Network error. Please check your connection and try again.';
  }
  
  // Handle timeout errors
  if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  // Handle response errors
  if (error.response?.data?.detail) {
    if (typeof error.response.data.detail === 'string') {
      return error.response.data.detail;
    }
    
    if (Array.isArray(error.response.data.detail)) {
      return error.response.data.detail
        .map((err: any) => err.msg || err.message || String(err))
        .join(', ');
    }
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Handle specific status codes
  if (error.response?.status === 500) {
    return 'Server error. Please try again later.';
  }
  
  if (error.response?.status === 404) {
    return 'The requested resource was not found.';
  }
  
  if (error.response?.status === 403) {
    return 'You do not have permission to access this resource.';
  }
  
  if (error.response?.status === 401) {
    return 'Authentication failed. Please check your credentials.';
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

// Type definitions for TypeScript support
export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to_id: number;
  created_by: number;
  company_id: number;
  created_at: string;
  due_date?: string;
  completed_at?: string;
  assignee_name?: string;
  creator_name?: string;
}

export interface BulkTaskResponse {
  successful: Task[];
  failed: Array<{
    user_id: number;
    error: string;
  }>;
  total_attempted: number;
  success_count: number;
  failure_count: number;
}

export interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  company_id?: number;
  is_active: boolean;
  created_at: string;
  full_name?: string;
  phone_number?: string;
  department?: string;
  can_assign_tasks?: boolean;
  company?: {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
  };
}
// Notifications API
export const notificationsAPI = {
  getNotifications: async (params?: { skip?: number; limit?: number }) => {
    console.log('[API] Getting notifications with params:', params);

    try {
      const response = await api.get('/notifications', { params });
      console.log('[API] Retrieved notifications:', response.data.length);
      return response.data;
    } catch (error: any) {
      console.error('[API] Failed to get notifications:', error.response?.data || error.message);
      throw new Error(handleApiError(error));
    }
  },

  markAsRead: async (notificationId: number) => {
    console.log('[API] Marking notification as read:', notificationId);

    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      console.log('[API] Notification marked as read successfully');
      return response.data;
    } catch (error: any) {
      console.error('[API] Failed to mark notification as read:', error.response?.data || error.message);
      throw new Error(handleApiError(error));
    }
  },
};
// ==== Analytics API (NEW) ====
export interface AnalyticsResponse {
  scope: "global" | "company" | "user";
  role: string;
  user_id?: number;
  company_id?: number;
  totals: {
    total_companies?: number;
    total_users?: number;
    active_users?: number;
    inactive_users?: number;

    total_tasks: number;
    pending_tasks?: number;
    in_progress_tasks?: number;
    completed_tasks?: number;
    overdue_tasks?: number;
    upcoming_tasks?: number;
  };
  priority_summary: Record<string, number>;
  average_completion_time_hours: number;
  recent_activity: {
    tasks_created_last_7_days: number;
    tasks_completed_last_7_days: number;
  };
}

export const analyticsAPI = {
  getDashboardAnalytics: async (): Promise<AnalyticsResponse> => {
    const response = await api.get('/analytics');
    return response.data;
  },
};

export default api;