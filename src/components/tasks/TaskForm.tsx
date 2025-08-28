// src/components/tasks/TaskForm.tsx

import React, { useState, useEffect } from 'react';
import { Calendar, User, Tag, AlertCircle, Users, Check, X, Search } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';
import { Toast } from '../common/Toast';
import { Task } from '../../types';
import { usersAPI, tasksAPI } from '../../services/api';

interface TaskFormProps {
  onSubmit: () => void;
  onClose: () => void;
}

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name?: string;
  is_active: boolean;
  can_assign_tasks?: boolean;
}

interface UserGroup {
  admins: UserData[];
  users: UserData[];
  all: UserData[];
}

export const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, onClose }) => {
  const { addNotification } = useApp();
  const { user: currentUser, canAssignTasks, isLoading: authLoading, isAuthenticated } = useAuth();

  const [userGroups, setUserGroups] = useState<UserGroup>({
    admins: [],
    users: [],
    all: []
  });
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [assignmentMode, setAssignmentMode] = useState<'individual' | 'group'>('individual');
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [groupSelections, setGroupSelections] = useState({
    allAdmins: false,
    allUsers: false,
    everyone: false
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    dueDate: '',
    reminderSet: '',
    tags: '',
  });

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isLoading, setIsLoading] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      console.log('[TaskForm] fetchUsers called, auth state:', {
        authLoading,
        isAuthenticated,
        currentUser: currentUser?.id,
        userRole: currentUser?.role,
        canAssignTasksValue: currentUser?.canAssignTasks,
        can_assign_tasks: currentUser?.can_assign_tasks
      });

      if (authLoading) {
        console.log('[TaskForm] Auth is still loading, waiting...');
        setUsersLoading(true);
        return;
      }

      if (!isAuthenticated || !currentUser) {
        console.log('[TaskForm] User not authenticated');
        setUsersError("You must be logged in to assign tasks.");
        setUsersLoading(false);
        return;
      }

      const hasPermission = canAssignTasks();
      console.log('[TaskForm] Permission check result:', hasPermission);
      
      if (!hasPermission) {
        console.log('[TaskForm] User cannot assign tasks:', {
          role: currentUser?.role,
          canAssignTasks: currentUser?.canAssignTasks,
          can_assign_tasks: currentUser?.can_assign_tasks,
          userId: currentUser?.id
        });
        setUsersError(
          currentUser.role === 'user' 
            ? "You do not have permission to assign tasks. Contact your administrator to grant you task assignment permissions."
            : "You do not have permission to assign tasks."
        );
        setUsersLoading(false);
        return;
      }

      setUsersLoading(true);
      setUsersError(null);
      
      try {
        console.log('[TaskForm] Fetching users for task assignment');
        const data: UserData[] = await usersAPI.getUsers();
        
        const filteredUsers = data.filter((u: UserData) => u.id !== currentUser?.id && u.is_active);
        
        const admins = filteredUsers.filter(u => u.role === 'admin');
        const regularUsers = filteredUsers.filter(u => u.role === 'user');
        
        console.log('[TaskForm] Users loaded:', {
          total: filteredUsers.length,
          admins: admins.length,
          users: regularUsers.length
        });
        
        setUserGroups({
          admins,
          users: regularUsers,
          all: filteredUsers
        });
      } catch (err: any) {
        console.error('[TaskForm] Error loading users:', err);
        
        if (err.message && err.message.includes("permission")) {
          setUsersError("You do not have permission to view other users for assignment. Check your role or task assignment permissions.");
        } else if (err.message && err.message.includes("Insufficient permissions")) {
          setUsersError("Insufficient permissions to view users. Contact your administrator.");
        } else {
          setUsersError(err.message || 'Error loading users. Please try again.');
        }
      } finally {
        setUsersLoading(false);
      }
    }

    fetchUsers();
  }, [currentUser, canAssignTasks, authLoading, isAuthenticated]);

  const handleGroupSelection = (groupType: keyof typeof groupSelections) => {
    const newGroupSelections = { ...groupSelections };
    newGroupSelections[groupType] = !groupSelections[groupType];
    
    if (newGroupSelections[groupType]) {
      let usersToAdd: number[] = [];
      
      switch (groupType) {
        case 'everyone':
          newGroupSelections.allAdmins = false;
          newGroupSelections.allUsers = false;
          usersToAdd = userGroups.all.map(u => u.id);
          break;
        case 'allAdmins':
          newGroupSelections.everyone = false;
          usersToAdd = userGroups.admins.map(u => u.id);
          break;
        case 'allUsers':
          newGroupSelections.everyone = false;
          usersToAdd = userGroups.users.map(u => u.id);
          break;
      }
      
      setSelectedUsers(new Set(usersToAdd));
    } else {
      const newSelectedUsers = new Set(selectedUsers);
      
      switch (groupType) {
        case 'everyone':
          newSelectedUsers.clear();
          break;
        case 'allAdmins':
          userGroups.admins.forEach(u => newSelectedUsers.delete(u.id));
          break;
        case 'allUsers':
          userGroups.users.forEach(u => newSelectedUsers.delete(u.id));
          break;
      }
      
      setSelectedUsers(newSelectedUsers);
    }
    
    setGroupSelections(newGroupSelections);
  };

  const handleUserSelection = (userId: number) => {
    const newSelectedUsers = new Set(selectedUsers);
    
    if (selectedUsers.has(userId)) {
      newSelectedUsers.delete(userId);
    } else {
      newSelectedUsers.add(userId);
    }
    
    setSelectedUsers(newSelectedUsers);
    
    const newGroupSelections = {
      allAdmins: userGroups.admins.every(u => newSelectedUsers.has(u.id)) && userGroups.admins.length > 0,
      allUsers: userGroups.users.every(u => newSelectedUsers.has(u.id)) && userGroups.users.length > 0,
      everyone: userGroups.all.every(u => newSelectedUsers.has(u.id)) && userGroups.all.length > 0
    };
    
    setGroupSelections(newGroupSelections);
  };

  // 🆕 Helper function to create notifications for both creator and assigned users
  const createNotificationsForTask = async (task: any, assignedUserId: number) => {
    try {
      // Notification for the assigned user
      addNotification({
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: ${formData.title}`,
        userId: assignedUserId.toString(),
        taskId: task.id?.toString() || '',
        isRead: false,
      });

      // Notification for the creator (current user) - confirmation of successful assignment
      // if (currentUser?.id && currentUser.id !== assignedUserId) {
      //   const assignedUserName = getUserNameById(assignedUserId);
      //   addNotification({
      //     type: 'task_created', // Different type for creator notifications
      //     title: 'Task Created Successfully',
      //     message: `Task "${formData.title}" has been successfully assigned to ${assignedUserName}`,
      //     userId: currentUser.id.toString(),
      //     taskId: task.id?.toString() || '',
      //     isRead: false,
      //   });
      // }

      console.log(`✅ Notifications created for task ${task.id}: assigned user ${assignedUserId} and creator ${currentUser?.id}`);
    } catch (error) {
      console.error('Error creating notifications:', error);
    }
  };

  // 🆕 Helper function to get user name by ID
  const getUserNameById = (userId: number): string => {
    const user = userGroups.all.find(u => u.id === userId);
    return user ? getUserDisplayName(user) : `User ${userId}`;
  };

  const createTasksForUsers = async (userIds: number[]) => {
    try {
      console.log('[TaskForm] Creating bulk tasks for users:', userIds);
      
      const taskPayload = {
        title: formData.title.trim(),
        description: formData.description.trim() || "",
        assigned_to_ids: userIds,
        due_date: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        priority: formData.priority,
        company_id: currentUser?.company_id,
      };

      console.log('[TaskForm] Task payload:', taskPayload);

      const bulkResult = await tasksAPI.createBulkTasks(taskPayload);
      
      console.log('[TaskForm] Bulk task creation result:', bulkResult);
      
      // 🆕 Create notifications for both assigned users and creator
      for (const task of bulkResult.successful) {
        await createNotificationsForTask(task, task.assigned_to_id);
      }

      return {
        successful: bulkResult.successful.map((task: any) => task.assigned_to_id),
        failed: bulkResult.failed.map((failure: any) => ({
          userId: failure.user_id,
          error: failure.error
        }))
      };

    } catch (error: any) {
      console.warn('[TaskForm] Bulk API failed, falling back to individual task creation:', error.message);
      
      const results = {
        successful: [] as number[],
        failed: [] as { userId: number; error: string }[]
      };

      for (const userId of userIds) {
        try {
          const taskPayload = {
            title: formData.title.trim(),
            description: formData.description.trim() || "",
            assigned_to_id: userId,
            due_date: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
            priority: formData.priority,
            company_id: currentUser?.company_id,
          };

          console.log('[TaskForm] Creating individual task:', taskPayload);

          const newTask = await tasksAPI.createTask(taskPayload);

          results.successful.push(userId);

          // 🆕 Create notifications for both assigned user and creator
          await createNotificationsForTask(newTask, userId);

        } catch (error: any) {
          console.error('[TaskForm] Failed to create individual task for user', userId, ':', error.message);
          results.failed.push({
            userId,
            error: error.message || 'Unknown error'
          });
        }
      }

      return results;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  console.log('[TaskForm] Form submission started');

  if (!formData.title.trim()) {
    setToastMessage('Task title is required');
    setToastType('error');
    setShowToast(true);
    setIsLoading(false);
    return;
  }

  if (selectedUsers.size === 0) {
    setToastMessage('Please select at least one user to assign the task to');
    setToastType('error');
    setShowToast(true);
    setIsLoading(false);
    return;
  }

  if (!formData.dueDate) {
    setToastMessage('Due date is required');
    setToastType('error');
    setShowToast(true);
    setIsLoading(false);
    return;
  }

  try {
    const userIds = Array.from(selectedUsers);
    console.log('[TaskForm] Creating tasks for users:', userIds);
    
    const results = await createTasksForUsers(userIds);

    console.log('[TaskForm] Task creation results:', results);

    const taskTitle = formData.title; // Store before reset

    // Reset form
    setFormData({
      title: '',
      description: '',
      priority: 'medium' as Task['priority'],
      dueDate: '',
      reminderSet: '',
      tags: '',
    });
    setSelectedUsers(new Set());
    setGroupSelections({
      allAdmins: false,
      allUsers: false,
      everyone: false
    });

    // ✅ Show success/failure alerts in addition to toast
    if (results.failed.length === 0) {
      setToastMessage(`Task "${taskTitle}" successfully assigned to ${results.successful.length} user! Notifications sent to all parties.`);
      setToastType('success');
      window.alert(`✅ Task "${taskTitle}" assigned successfully to ${results.successful.length} user!`);
    } else if (results.successful.length === 0) {
      setToastMessage(`Failed to assign task to any users. Please try again.`);
      setToastType('error');
      window.alert(`❌ Failed to assign task. Please try again.`);
    } else {
      setToastMessage(`Task assigned to ${results.successful.length} user(s). ${results.failed.length} assignment(s) failed. Notifications sent for successful assignments.`);
      setToastType('success');
      window.alert(`⚠️ Task assigned to ${results.successful.length} user(s), but ${results.failed.length} failed.`);
    }

    setShowToast(true);

    if (results.successful.length > 0) {
      onSubmit();
      setTimeout(() => {
        onClose();
      }, 2000);
    }

  } catch (error: any) {
    console.error('[TaskForm] Task creation error:', error);
    setToastMessage('Error creating tasks: ' + (error.message || 'Unknown error'));
    setToastType('error');
    setShowToast(true);

    // ❌ Error alert
    window.alert(`❌ Error creating tasks: ${error.message || 'Unknown error'}`);
  } finally {
    setIsLoading(false);
  }
};


  const getUserDisplayName = (user: UserData) => {
    return user.full_name || user.username || user.email || 'Unknown User';
  };

  const getSelectedCount = () => selectedUsers.size;

  // Filter users based on search term
  const filterUsers = (users: UserData[]) => {
    if (!searchTerm.trim()) return users;
    
    const searchLower = searchTerm.toLowerCase();
    return users.filter(user => 
      getUserDisplayName(user).toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.username.toLowerCase().includes(searchLower)
    );
  };

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="px-4 py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="px-4 py-8 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-600 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="mb-4">Please log in to create tasks.</p>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (!canAssignTasks()) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="px-4 py-8 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Permission Denied</h3>
          <p className="mb-4">
            You do not have permission to assign tasks.
            {currentUser?.role === 'user' && (
              <>
                <br />
                Contact your administrator to grant you task assignment permissions.
              </>
            )}
          </p>
          <div className="text-sm text-red-500 mb-4 p-3 bg-red-100 rounded border">
            <strong>Debug Info:</strong><br />
            Role: {currentUser?.role}<br />
            Can Assign Tasks: {currentUser?.canAssignTasks ? 'Yes' : 'No'}<br />
            User ID: {currentUser?.id}
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Row 1: Title and Priority */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 
                         border-gray-300 focus:ring-blue-500"
              placeholder="Enter task title"
              required
              disabled={isLoading}
            />
          </div>
          <div className="col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Row 2: Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter task description"
            disabled={isLoading}
          />
        </div>

        {/* Row 3: Due Date and Tags */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Due Date *
            </label>
            <input
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
          </div>
          <div className="col-span-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. design, urgent, frontend"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Row 4: User Assignment */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              <Users className="w-4 h-4 inline mr-1" />
              Assign To ({getSelectedCount()} selected) *
            </label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowUserList(!showUserList)}
              disabled={isLoading || usersLoading}
            >
              {showUserList ? 'Hide' : 'Show'} User Selection
            </Button>
          </div>

          {usersLoading ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-2"></div>
              Loading users...
            </div>
          ) : usersError ? (
            <div className="px-4 py-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {usersError}
            </div>
          ) : showUserList ? (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isLoading}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="group"
                      checked={assignmentMode === 'group'}
                      onChange={(e) => setAssignmentMode(e.target.value as 'group')}
                      className="mr-2"
                      disabled={isLoading}
                    />
                    Group Selection
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="individual"
                      checked={assignmentMode === 'individual'}
                      onChange={(e) => setAssignmentMode(e.target.value as 'individual')}
                      className="mr-2"
                      disabled={isLoading}
                    />
                    Individual Selection
                  </label>
                </div>
              </div>

              {assignmentMode === 'group' && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Select Groups:</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <label className="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupSelections.everyone}
                        onChange={() => handleGroupSelection('everyone')}
                        className="mr-3"
                        disabled={isLoading}
                      />
                      <div>
                        <div className="font-medium">Everyone</div>
                        <div className="text-xs text-gray-500">
                          {filterUsers(userGroups.all).length} users {searchTerm && `(filtered from ${userGroups.all.length})`}
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupSelections.allAdmins}
                        onChange={() => handleGroupSelection('allAdmins')}
                        className="mr-3"
                        disabled={isLoading}
                      />
                      <div>
                        <div className="font-medium">All Admins</div>
                        <div className="text-xs text-gray-500">
                          {filterUsers(userGroups.admins).length} admins {searchTerm && `(filtered from ${userGroups.admins.length})`}
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupSelections.allUsers}
                        onChange={() => handleGroupSelection('allUsers')}
                        className="mr-3"
                        disabled={isLoading}
                      />
                      <div>
                        <div className="font-medium">All Users</div>
                        <div className="text-xs text-gray-500">
                          {filterUsers(userGroups.users).length} users {searchTerm && `(filtered from ${userGroups.users.length})`}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Individual Users:</h4>
                
                {filterUsers(userGroups.admins).length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                      Admins ({filterUsers(userGroups.admins).length}{searchTerm && ` of ${userGroups.admins.length}`})
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      {filterUsers(userGroups.admins).map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center p-2 border rounded hover:bg-white cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => handleUserSelection(user.id)}
                            className="mr-3"
                            disabled={isLoading}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {getUserDisplayName(user)}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {user.email}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {filterUsers(userGroups.users).length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                      Users ({filterUsers(userGroups.users).length}{searchTerm && ` of ${userGroups.users.length}`})
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      {filterUsers(userGroups.users).map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center p-2 border rounded hover:bg-white cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => handleUserSelection(user.id)}
                            className="mr-3"
                            disabled={isLoading}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {getUserDisplayName(user)}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {user.email}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {filterUsers(userGroups.all).length === 0 && searchTerm && (
                  <div className="text-center py-4 text-gray-500">
                    <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No users found matching "{searchTerm}"</p>
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="mt-2 text-blue-500 hover:text-blue-600 text-sm underline"
                    >
                      Clear search
                    </button>
                  </div>
                )}

                {userGroups.all.length === 0 && !searchTerm && (
                  <div className="text-center py-4 text-gray-500">
                    No users available for assignment in your company
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              {getSelectedCount() > 0 
                ? `${getSelectedCount()} user(s) selected for task assignment`
                : 'Click "Show User Selection" to choose users'
              }
            </div>
          )}
        </div>

        {/* Row 5: Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || selectedUsers.size === 0 || !formData.title.trim() || !formData.dueDate}
          >
            {isLoading ? 'Creating Tasks...' : `Create Task${selectedUsers.size > 1 ? 's' : ''} (${selectedUsers.size})`}
          </Button>
        </div>

      </form>

      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};