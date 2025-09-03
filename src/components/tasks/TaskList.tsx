// src/components/tasks/TaskList.tsx

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  Play, 
  Pause,
  Eye,
  Edit3,
  Trash2,
  Users,
  ChevronRight,
  ArrowLeft,
  Filter,
  Search,
  Target,
  TrendingUp,
  Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';
import { Toast } from '../common/Toast';
import { tasksAPI } from '../../services/api';

// Types based on your API responses
interface TaskGroupedResponse {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  due_date: string;
}

interface TaskAssigneeDetails {
  assigned_to_id: number;
  full_name: string;
  completed_at: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  task_id?: number; // Add task_id to track individual tasks
}

interface TaskDetailResponse {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  due_date: string;
  assignees: TaskAssigneeDetails[];
  analytics: {
    total_assignees: number;
    completed: number;
    in_progress: number;
    pending: number;
  };
}

interface IndividualTask {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to_id: number;
  created_by: number;
  company_id: number;
  created_at: string;
  due_date: string;
  completed_at?: string;
  assignee_name?: string;
  creator_name?: string;
}

interface TaskListProps {
  onCreateTask?: () => void;
}

// Extended API methods for the task operations
const tasksAPIExtended = {
  ...tasksAPI,
  
  getAssignedTasksGrouped: async (params?: any) => {
    console.log("[API] Getting assigned tasks grouped with params:", params);
    try {
      const queryString = params ? new URLSearchParams(params).toString() : '';
      const url = `${import.meta.env.VITE_ENV == "PRODUCTION" 
        ? import.meta.env.VITE_BACKEND_PROD 
        : import.meta.env.VITE_BACKEND_DEV}/api/v1/tasks-assigned${queryString ? '?' + queryString : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("[API] Retrieved assigned tasks grouped:", data.length);
      return data;
    } catch (error: any) {
      console.error("[API] Failed to get assigned tasks grouped:", error.message);
      throw error;
    }
  },

  getAllTasksGrouped: async (params?: any) => {
    console.log("[API] Getting all tasks grouped with params:", params);
    try {
      const queryString = params ? new URLSearchParams(params).toString() : '';
      const url = `${import.meta.env.VITE_ENV == "PRODUCTION" 
        ? import.meta.env.VITE_BACKEND_PROD 
        : import.meta.env.VITE_BACKEND_DEV}/api/v1/tasks/all${queryString ? '?' + queryString : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("[API] Retrieved all tasks grouped:", data.length);
      return data;
    } catch (error: any) {
      console.error("[API] Failed to get all tasks grouped:", error.message);
      throw error;
    }
  },

  getTaskDetails: async (title: string, params?: any) => {
    console.log("[API] Getting task details for title:", title);
    try {
      const queryParams = new URLSearchParams({ title, ...params });
      const response = await fetch(`${import.meta.env.VITE_ENV == "PRODUCTION" 
        ? import.meta.env.VITE_BACKEND_PROD 
        : import.meta.env.VITE_BACKEND_DEV}/api/v1/task-details?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("[API] Retrieved task details for:", title);
      return data;
    } catch (error: any) {
      console.error("[API] Failed to get task details:", error.message);
      throw error;
    }
  },

  // NEW: Get individual tasks by title to find task IDs for status updates
  getIndividualTasksByTitle: async (title: string): Promise<IndividualTask[]> => {
    console.log("[API] Getting individual tasks by title:", title);
    try {
      // Use the my-tasks endpoint with search parameter
      const response = await fetch(`${import.meta.env.VITE_ENV == "PRODUCTION" 
        ? import.meta.env.VITE_BACKEND_PROD 
        : import.meta.env.VITE_BACKEND_DEV}/api/v1/my-tasks?search=${encodeURIComponent(title)}&limit=1000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // Filter to exact title match
      const exactMatches = data.filter((task: IndividualTask) => task.title === title);
      console.log("[API] Retrieved individual tasks by title:", exactMatches.length);
      return exactMatches;
    } catch (error: any) {
      console.error("[API] Failed to get individual tasks:", error.message);
      throw error;
    }
  },

  updateTaskByTitle: async (title: string, updates: any) => {
    console.log("[API] Updating task by title:", title, "with updates:", updates);
    try {
      const response = await fetch(`${import.meta.env.VITE_ENV == "PRODUCTION" 
        ? import.meta.env.VITE_BACKEND_PROD 
        : import.meta.env.VITE_BACKEND_DEV}/api/v1/tasks/by-title?title=${encodeURIComponent(title)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("[API] Task updated by title successfully");
      return data;
    } catch (error: any) {
      console.error("[API] Failed to update task by title:", error.message);
      throw error;
    }
  }
};

export const TaskList = ({ onCreateTask }: TaskListProps) => {
  const { user: currentUser, canAssignTasks } = useAuth();
  
  // State management
  const [tasks, setTasks] = useState<TaskGroupedResponse[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetailResponse | null>(null);
  const [individualTasks, setIndividualTasks] = useState<IndividualTask[]>([]);
  const [myTasks, setMyTasks] = useState<IndividualTask[]>([]); // Tasks assigned TO current user
  const [createdTasks, setCreatedTasks] = useState<IndividualTask[]>([]); // Tasks created BY current user
  const [hasCreatedTasks, setHasCreatedTasks] = useState(false); // Track if user has created any tasks
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Helper function to convert individual tasks to grouped format
  const convertToGroupedFormat = (tasks: any[]): TaskGroupedResponse[] => {
    const grouped = new Map();
    
    tasks.forEach(task => {
      const key = `${task.title}-${task.description}-${task.priority}-${task.created_at?.split('T')[0]}-${task.due_date?.split('T')[0]}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          title: task.title,
          description: task.description,
          priority: task.priority,
          created_at: task.created_at?.split('T')[0],
          due_date: task.due_date?.split('T')[0]
        });
      }
    });
    
    return Array.from(grouped.values());
  };

  // Check if current user created any tasks
  const checkUserCreatedTasks = async () => {
    try {
      if (canAssignTasks() || currentUser?.role === 'admin' || currentUser?.role === 'super_admin') {
        // Check if user has created any tasks by looking at tasks-assigned endpoint
        const createdTasksData = await tasksAPIExtended.getAssignedTasksGrouped();
        setHasCreatedTasks(createdTasksData.length > 0);
      }
    } catch (error) {
      console.warn('Could not check created tasks:', error);
      setHasCreatedTasks(false);
    }
  };

  // Fetch grouped tasks - FIXED VERSION
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Determine which endpoint to call based on user permissions
      let tasksData: TaskGroupedResponse[] = [];
      let myTasksData: IndividualTask[] = [];
      
      if (currentUser?.role === 'super_admin') {
        // Super admin can see all tasks across all companies
        tasksData = await tasksAPIExtended.getAllTasksGrouped();
        setHasCreatedTasks(true); // Super admin can always see all tasks
      } else if (currentUser?.role === 'admin' || currentUser?.role === 'company') {
        // Admin/Company can see all tasks in their company
        tasksData = await tasksAPIExtended.getAllTasksGrouped();
        setHasCreatedTasks(true); // Admin can always see all tasks in their company
      } else if (canAssignTasks()) {
        // User with task creation permission - FIXED LOGIC
        await checkUserCreatedTasks();
        
        // Always fetch user's assigned tasks first
        try {
          myTasksData = await tasksAPI.getMyTasks();
        } catch (error) {
          console.warn('Could not fetch assigned tasks:', error);
        }
        
        if (hasCreatedTasks) {
          // If user has created tasks, show combined view: tasks they created + tasks assigned to them
          try {
            const createdTasksData = await tasksAPIExtended.getAssignedTasksGrouped();
            
            // Combine created tasks and assigned tasks, removing duplicates
            const allTaskTitles = new Set();
            const combinedGroupedTasks: TaskGroupedResponse[] = [];
            
            // Add created tasks
            createdTasksData.forEach(task => {
              const key = `${task.title}-${task.priority}-${task.due_date}`;
              if (!allTaskTitles.has(key)) {
                allTaskTitles.add(key);
                combinedGroupedTasks.push(task);
              }
            });
            
            // Add assigned tasks (converted to grouped format) that aren't already included
            const assignedGrouped = convertToGroupedFormat(myTasksData);
            assignedGrouped.forEach(task => {
              const key = `${task.title}-${task.priority}-${task.due_date}`;
              if (!allTaskTitles.has(key)) {
                allTaskTitles.add(key);
                combinedGroupedTasks.push(task);
              }
            });
            
            tasksData = combinedGroupedTasks;
          } catch (error) {
            console.warn('Could not fetch created tasks, showing only assigned tasks:', error);
            tasksData = convertToGroupedFormat(myTasksData);
          }
        } else {
          // If user hasn't created any tasks yet, show only their assigned tasks
          tasksData = convertToGroupedFormat(myTasksData);
        }
      } else {
        // For regular users without task creation permission, only show tasks assigned TO them
        try {
          myTasksData = await tasksAPI.getMyTasks();
          tasksData = convertToGroupedFormat(myTasksData);
        } catch (error) {
          console.warn('Could not fetch assigned tasks:', error);
        }
      }
      
      setTasks(tasksData);
      setMyTasks(myTasksData);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  // Fetch task details with individual task data for status updates
  const fetchTaskDetail = async (title: string) => {
    try {
      setDetailLoading(true);
      
      // For regular users without created tasks, build detail view from individual tasks data only
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin' && (!canAssignTasks() || !hasCreatedTasks)) {
        const individualTasksData = await tasksAPIExtended.getIndividualTasksByTitle(title);
        const userTask = individualTasksData.find(task => task.assigned_to_id === currentUser?.id);
        
        if (!userTask) {
          throw new Error('Task not found or not assigned to you');
        }
        
        // Build detail response from individual task data
        const mockDetail: TaskDetailResponse = {
          title: userTask.title,
          description: userTask.description,
          priority: userTask.priority,
          created_at: userTask.created_at,
          due_date: userTask.due_date,
          assignees: [{
            assigned_to_id: userTask.assigned_to_id,
            full_name: userTask.assignee_name || 'You',
            completed_at: userTask.completed_at || null,
            status: userTask.status,
            task_id: userTask.id
          }],
          analytics: {
            total_assignees: 1,
            completed: userTask.status === 'completed' ? 1 : 0,
            in_progress: userTask.status === 'in_progress' ? 1 : 0,
            pending: userTask.status === 'pending' ? 1 : 0,
          }
        };
        
        setSelectedTask(mockDetail);
        setIndividualTasks([userTask]);
        setShowDetail(true);
      } else {
        // For admins and users who have created tasks, use the original logic with full task details
        const [detail, individualTasksData] = await Promise.all([
          tasksAPIExtended.getTaskDetails(title),
          tasksAPIExtended.getIndividualTasksByTitle(title)
        ]);
        
        // Enhance assignees with task IDs from individual tasks
        const enhancedAssignees = detail.assignees.map((assignee: TaskAssigneeDetails) => {
          const individualTask = individualTasksData.find(
            (task: IndividualTask) => task.assigned_to_id === assignee.assigned_to_id
          );
          return {
            ...assignee,
            task_id: individualTask?.id
          };
        });
        
        const enhancedDetail = {
          ...detail,
          assignees: enhancedAssignees
        };
        
        setSelectedTask(enhancedDetail);
        setIndividualTasks(individualTasksData);
        setShowDetail(true);
      }
    } catch (err: any) {
      console.error('Error fetching task details:', err);
      showErrorToast(err.message || 'Failed to fetch task details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Update task status (for assignees) - IMPROVED VERSION
  const handleUpdateTaskStatus = async (
    taskId: number,
    newStatus: 'pending' | 'in_progress' | 'completed'
  ) => {
    try {
      // Update the status using the correct task ID and API endpoint
      await tasksAPI.updateTaskStatus(taskId, newStatus);
      showSuccessToast(`Task status updated to ${newStatus.replace('_', ' ')}`);
      
      // Refresh the task list and detail view
      fetchTasks();
      if (selectedTask) {
        fetchTaskDetail(selectedTask.title);
      }
    } catch (err: any) {
      console.error('Error updating task status:', err);
      showErrorToast(err.message || 'Failed to update task status');
    }
  };

  // Quick status update from main list
  const handleQuickStatusUpdate = async (
    taskTitle: string,
    taskId: number,
    newStatus: 'pending' | 'in_progress' | 'completed'
  ) => {
    try {
      await tasksAPI.updateTaskStatus(taskId, newStatus);
      showSuccessToast(`"${taskTitle}" status updated to ${newStatus.replace('_', ' ')}`);
      fetchTasks(); // Refresh the task list
    } catch (err: any) {
      console.error('Error updating task status:', err);
      showErrorToast(err.message || 'Failed to update task status');
    }
  };

  // Check if current user has this task assigned to them
  const getUserTaskForTitle = (taskTitle: string): IndividualTask | null => {
    return myTasks.find(task => 
      task.title === taskTitle && task.assigned_to_id === currentUser?.id
    ) || null;
  };

  // Update task (for creators/admins)
  const handleUpdateTask = async (title: string, updates: any) => {
    try {
      await tasksAPIExtended.updateTaskByTitle(title, updates);
      showSuccessToast('Task updated successfully');
      fetchTasks(); // Refresh the list
      if (selectedTask && selectedTask.title === title) {
        fetchTaskDetail(title); // Refresh detail view
      }
    } catch (err: any) {
      console.error('Error updating task:', err);
      showErrorToast(err.message || 'Failed to update task');
    }
  };

  // Delete task - Updated permissions
  const handleDeleteTask = async (taskId: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await tasksAPI.deleteTask(taskId);
      showSuccessToast('Task deleted successfully');
      fetchTasks();
      setShowDetail(false);
    } catch (err: any) {
      console.error('Error deleting task:', err);
      showErrorToast(err.message || 'Failed to delete task');
    }
  };

  // Check if user can delete a task
  const canDeleteTask = (task: any): boolean => {
    // Super admin can delete any task
    if (currentUser?.role === 'super_admin') return true;
    
    // Admin can delete tasks in their company
    if (currentUser?.role === 'admin') return true;
    
    // Task creator can delete their own tasks
    if (individualTasks.some(t => t.created_by === currentUser?.id)) return true;
    
    return false;
  };

  // Toast helpers
  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setToastType('success');
    setShowToast(true);
  };

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setToastType('error');
    setShowToast(true);
  };

  // Priority styling
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return <AlertCircle className="w-4 h-4" />;
      case 'high': return <TrendingUp className="w-4 h-4" />;
      case 'medium': return <Target className="w-4 h-4" />;
      case 'low': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Status styling
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'pending': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesPriority;
  });

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if date is overdue
  const isOverdue = (dueDateString: string) => {
    return new Date(dueDateString) < new Date();
  };

  useEffect(() => {
    fetchTasks();
  }, [hasCreatedTasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading tasks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={fetchTasks} 
          className="mt-2"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Detail View
  if (showDetail && selectedTask) {
    return (
      <div className="space-y-6">
        {/* Detail Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setShowDetail(false)}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Tasks
            </Button>
            <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Always show Create Task button if onCreateTask is provided */}
            {onCreateTask && (
              <Button onClick={onCreateTask} className="flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            )}
            
            {/* Edit Button */}
            {(canAssignTasks() || currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  const newTitle = prompt('Enter new title:', selectedTask.title);
                  const newDescription = prompt('Enter new description:', selectedTask.description);
                  
                  if (newTitle !== null && newDescription !== null) {
                    handleUpdateTask(selectedTask.title, {
                      title: newTitle.trim() || selectedTask.title,
                      description: newDescription.trim() || selectedTask.description
                    });
                  }
                }}
              >
                <Edit3 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
            
            {/* Delete Button */}
            {canDeleteTask(selectedTask) && individualTasks.length > 0 && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  const taskToDelete = individualTasks[0];
                  if (taskToDelete?.id) {
                    handleDeleteTask(taskToDelete.id);
                  }
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {detailLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading details...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Task Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {selectedTask.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Created: {formatDate(selectedTask.created_at)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Due: {formatDate(selectedTask.due_date)}
                        {isOverdue(selectedTask.due_date) && (
                          <span className="ml-1 text-red-600 font-medium">(Overdue)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full border text-sm font-medium flex items-center ${getPriorityColor(selectedTask.priority)}`}>
                    {getPriorityIcon(selectedTask.priority)}
                    <span className="ml-1 capitalize">{selectedTask.priority}</span>
                  </div>
                </div>
                
                {selectedTask.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                    <p className="text-gray-600 leading-relaxed">{selectedTask.description}</p>
                  </div>
                )}
              </div>

              {/* Assignees List */}
              <div className="bg-white rounded-lg border p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || canAssignTasks()) && hasCreatedTasks
                    ? `Assigned Users (${selectedTask.assignees.length})`
                    : 'Your Assignment'
                  }
                </h4>
                
                <div className="space-y-3">
                  {selectedTask.assignees.map((assignee, index) => {
                    const isCurrentUserAssignee = currentUser?.id === assignee.assigned_to_id;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center flex-1">
                          <User className="w-8 h-8 text-gray-400 mr-3" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {assignee.full_name}
                              {isCurrentUserAssignee && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                            {assignee.completed_at && (
                              <div className="text-sm text-gray-500">
                                Completed: {formatDate(assignee.completed_at)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {/* Status Display/Selector - All users can change their own status */}
                          {assignee.task_id ? (
                            <select
                              value={assignee.status}
                              onChange={async (e) => {
                                const newStatus = e.target.value as 'pending' | 'in_progress' | 'completed';
                                
                                if (window.confirm(`Update task status to ${newStatus.replace('_', ' ')}?`)) {
                                  if (assignee.task_id) {
                                    await handleUpdateTaskStatus(assignee.task_id, newStatus);
                                  }
                                }
                              }}
                              className={`px-3 py-1 rounded-full text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${getStatusColor(assignee.status)}`}
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          ) : (
                            <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${getStatusColor(assignee.status)}`}>
                              {getStatusIcon(assignee.status)}
                              <span className="ml-1 capitalize">{assignee.status.replace('_', ' ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Status Update Instructions */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Status Updates:</p>
                      <ul className="mt-1 space-y-1 text-xs">
                        <li>• <strong>Pending:</strong> Task not started yet</li>
                        <li>• <strong>In Progress:</strong> Currently working on the task</li>
                        <li>• <strong>Completed:</strong> Task finished successfully</li>
                      </ul>
                      <p className="mt-2 text-xs text-blue-600">
                        You can update your task status using the dropdown above. Changes are saved automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Progress Overview</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Assignees</span>
                    <span className="font-semibold text-gray-900">{selectedTask.analytics.total_assignees}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-green-600 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Completed
                    </span>
                    <span className="font-semibold text-green-600">{selectedTask.analytics.completed}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-blue-600 flex items-center">
                      <Play className="w-4 h-4 mr-1" />
                      In Progress
                    </span>
                    <span className="font-semibold text-blue-600">{selectedTask.analytics.in_progress}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-600 flex items-center">
                      <Pause className="w-4 h-4 mr-1" />
                      Pending
                    </span>
                    <span className="font-semibold text-yellow-600">{selectedTask.analytics.pending}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Completion Rate</span>
                    <span>
                      {Math.round((selectedTask.analytics.completed / selectedTask.analytics.total_assignees) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(selectedTask.analytics.completed / selectedTask.analytics.total_assignees) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
          <p className="text-gray-600">Manage and track your tasks</p>
        </div>
        
        {/* Always show Create Task button if onCreateTask is provided */}
        {onCreateTask && (
          <Button onClick={onCreateTask} className="flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tasks by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center"
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Task Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task, index) => {
          const userTask = getUserTaskForTitle(task.title);
          
          return (
            <div
              key={`${task.title}-${index}`}
              className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => fetchTaskDetail(task.title)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                      {task.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                      {task.description || 'No description provided'}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className={`px-2 py-1 rounded-full border text-xs font-medium flex items-center ${getPriorityColor(task.priority)}`}>
                    {getPriorityIcon(task.priority)}
                    <span className="ml-1 capitalize">{task.priority}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(task.created_at)}
                  </div>
                  <div className={`flex items-center ${isOverdue(task.due_date) ? 'text-red-600' : ''}`}>
                    <Clock className="w-4 h-4 mr-1" />
                    {formatDate(task.due_date)}
                    {isOverdue(task.due_date) && <span className="ml-1 font-medium">(Overdue)</span>}
                  </div>
                </div>
              </div>

              <div className="px-6 pb-4">
                <div className="flex items-center justify-between">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchTaskDetail(task.title);
                    }}
                    className="flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {/* Edit button for task creators and admins */}
                    {((canAssignTasks() && hasCreatedTasks) || currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newTitle = prompt('Enter new title:', task.title);
                          const newDescription = prompt('Enter new description:', task.description);
                          
                          if (newTitle !== null && newDescription !== null) {
                            handleUpdateTask(task.title, {
                              title: newTitle.trim() || task.title,
                              description: newDescription.trim() || task.description
                            });
                          }
                        }}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {/* Delete button for task creators and admins */}
                    {((canAssignTasks() && hasCreatedTasks) || currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          
                          // Get the individual task ID to delete
                          try {
                            const individualTasksData = await tasksAPIExtended.getIndividualTasksByTitle(task.title);
                            if (individualTasksData.length > 0) {
                              const taskToDelete = individualTasksData[0];
                              handleDeleteTask(taskToDelete.id);
                            }
                          } catch (error) {
                            showErrorToast('Could not find task to delete');
                          }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No tasks match your search criteria.' : 
             (!hasCreatedTasks && canAssignTasks()) ? 
             'You will see both your created tasks and assigned tasks here. Create your first task or check if any tasks have been assigned to you.' :
             'You haven\'t been assigned any tasks yet.'}
          </p>
          {/* Always show Create Task button if onCreateTask is provided */}
          {onCreateTask && (
            <Button onClick={onCreateTask} className="flex items-center justify-center">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Task
            </Button>
          )}
        </div>
      )}

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