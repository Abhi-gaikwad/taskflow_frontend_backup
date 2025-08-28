// import { User, Company, BackendUserResponse } from '../types';

// export function transformBackendUser(backendUser: BackendUserResponse): User {
//   console.log('[Transform] transformBackendUser: Input backend user:', backendUser);
//   console.log('[Transform] transformBackendUser: can_assign_tasks from backend:', backendUser.can_assign_tasks);
  
//   const transformed: User = {
//     id: backendUser.id, // Keep as number
//     email: backendUser.email,
//     username: backendUser.username,
//     name: backendUser.full_name || backendUser.username,
//     role: backendUser.role,
//     is_active: backendUser.is_active,
//     createdAt: new Date(backendUser.created_at),
    
//     // Handle can_assign_tasks field - ensure it's properly set
//     canAssignTasks: Boolean(backendUser.can_assign_tasks),
//     can_assign_tasks: Boolean(backendUser.can_assign_tasks),
    
//     // Company information
//     company_id: backendUser.company_id,
//     companyId: backendUser.company_id,
//     fullName: backendUser.full_name,
    
//     company: backendUser.company ? {
//       id: backendUser.company.id,
//       name: backendUser.company.name,
//       description: backendUser.company.description,
//       is_active: backendUser.company.is_active,
//       createdAt: new Date(backendUser.company.created_at),
//       company_username: backendUser.company.company_username,
//     } : undefined,
//   };
  
//   console.log('[Transform] transformBackendUser: Output transformed user:', {
//     id: transformed.id,
//     role: transformed.role,
//     canAssignTasks: transformed.canAssignTasks,
//     can_assign_tasks: transformed.can_assign_tasks,
//     company_id: transformed.company_id,
//   });
  
//   return transformed;
// }

// // Utility to check if user can assign tasks - Enhanced with debugging
// export function userCanAssignTasks(user: User | null): boolean {
//   console.log('[Transform] userCanAssignTasks: Called with user:', user ? {
//     id: user.id,
//     role: user.role,
//     canAssignTasks: user.canAssignTasks,
//     can_assign_tasks: user.can_assign_tasks
//   } : null);

//   if (!user) {
//     console.log('[Transform] userCanAssignTasks: No user provided, returning false');
//     return false;
//   }
  
//   // Admin roles can always assign tasks
//   if (['super_admin', 'company', 'admin'].includes(user.role)) {
//     console.log('[Transform] userCanAssignTasks: User has admin role, returning true');
//     return true;
//   }
  
//   // Regular users need explicit permission
//   if (user.role === 'user') {
//     const hasPermission = Boolean(user.canAssignTasks || user.can_assign_tasks);
//     console.log('[Transform] userCanAssignTasks: Regular user, checking permissions:', {
//       canAssignTasks: user.canAssignTasks,
//       can_assign_tasks: user.can_assign_tasks,
//       hasPermission
//     });
//     return hasPermission;
//   }
  
//   console.log('[Transform] userCanAssignTasks: Unknown role, returning false');
//   return false;
// }

export interface User {
  id: number;
  mobile?: string;
  phone_number?: string;
  username: string;
  role: string;
  company_id?: number;
  is_active: boolean;
  created_at: string;
  full_name?: string;
  department?: string;
  can_assign_tasks?: boolean;
  company?: {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    company_username?: string;
  };
}

interface BackendUserResponse {
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

export const transformBackendUser = (backendUser: BackendUserResponse): User => {
  return {
    id: backendUser.id,
    mobile: backendUser.mobile_no || backendUser.phone_number,
    phone_number: backendUser.phone_number || backendUser.mobile_no,
    username: backendUser.username,
    role: backendUser.role,
    company_id: backendUser.company_id,
    is_active: backendUser.is_active,
    created_at: backendUser.created_at,
    full_name: backendUser.full_name,
    department: backendUser.department,
    can_assign_tasks: backendUser.can_assign_tasks || false,
    company: backendUser.company,
  };
};