import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  AlertTriangle,
  Clock,
  CheckCircle,
  Edit,
  Trash2,
  ArrowLeft,
  Users,
  BarChart3,
  X,
  Eye,
  Save,
  Layers,
  FileText,
  UserPlus,
  UserCheck,
  Loader2,
} from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";
import { TaskForm } from "./TaskForm";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";

// Enhanced Types
interface Task {
  id: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
  due_date?: string;
  status: "pending" | "in_progress" | "completed";
  assigned_to_id: number;
  assignee_name: string;
  creator_name: string;
  created_by: number;
  completed_at?: string;
}

interface GroupedTask {
  id?: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
  due_date?: string;
  task_type?: "group" | "single";
  created_by?: number;
  assignee_count?: number;
  tasks?: Task[]; // Store individual tasks for status updates
}

interface TaskDetailUser {
  assigned_to_id: number;
  full_name: string;
  completed_at?: string;
  status: "pending" | "in_progress" | "completed";
  is_current_user?: boolean;
  task_id?: number; // Add task_id for status updates
}

interface TaskDetails {
  id?: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
  due_date?: string;
  created_by?: number;
  task_type?: "group" | "single";
  assignees: TaskDetailUser[];
  analytics: {
    total_assignees: number;
    completed: number;
    in_progress: number;
    pending: number;
  };
}

export const TaskList: React.FC = () => {
  const { addNotification } = useApp();
  const { user, canAssignTasks } = useAuth();
  
  // State management
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [groupedTasks, setGroupedTasks] = useState<GroupedTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);
  
  // Enhanced filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all"); // New filter
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  useEffect(() => {
    fetchAllTasks();
  }, [user]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, priorityFilter, taskTypeFilter, assignmentFilter]);

  const fetchAllTasks = async () => {
    try {
      setLoading(true);
      const baseUrl =
        import.meta.env.VITE_ENV === "PRODUCTION"
          ? import.meta.env.VITE_BACKEND_PROD
          : import.meta.env.VITE_BACKEND_DEV;

      const token = localStorage.getItem("access_token");

      // Fetch from multiple endpoints based on user role
      let endpoints: string[] = [];

      if (user?.role?.toLowerCase() === "admin") {
        endpoints = ["/tasks/all", "/tasks-assigned", "/my-tasks"];
      } else if (user?.role?.toLowerCase() === "user" && canAssignTasks()) {

        console.log("User can assign tasks, fetching all relevant endpoints"); 
        endpoints = ["/tasks-assigned", "/my-tasks"];
      } else {
        endpoints = ["/my-tasks"];
      }

      // Fetch all tasks from different endpoints
        const responses = await Promise.all(
      endpoints.map(async (endpoint) => {
        const res = await fetch(`${baseUrl}/api/v1${endpoint}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          console.warn(`Failed to fetch ${endpoint}: ${res.status}`);
          return [];
        }
        return res.json();
      })
    );

      // Flatten and deduplicate tasks
      const allTasksFlat = responses.flat();
      const uniqueTasksMap = new Map();
      
      allTasksFlat.forEach((task: Task) => {
        const key = `${task.id}`;
        if (!uniqueTasksMap.has(key)) {
          uniqueTasksMap.set(key, task);
        }
      });

      const uniqueTasks = Array.from(uniqueTasksMap.values());
      setAllTasks(uniqueTasks);

      // Group tasks by title, description, priority, and dates
      const grouped = groupTasksByTitleAndDetails(uniqueTasks);
      setGroupedTasks(grouped);

    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const groupTasksByTitleAndDetails = (tasks: Task[]): GroupedTask[] => {
    const groupMap = new Map<string, GroupedTask>();

    tasks.forEach((task) => {
      const key = `${task.title}-${task.description}-${task.priority}-${task.created_at.split('T')[0]}-${task.due_date?.split('T')[0] || 'no-due'}`;
      
      if (groupMap.has(key)) {
        const existing = groupMap.get(key)!;
        existing.assignee_count = (existing.assignee_count || 0) + 1;
        existing.tasks = existing.tasks || [];
        existing.tasks.push(task);
      } else {
        groupMap.set(key, {
          title: task.title,
          description: task.description,
          priority: task.priority,
          created_at: task.created_at,
          due_date: task.due_date,
          created_by: task.created_by,
          assignee_count: 1,
          task_type: "single",
          tasks: [task]
        });
      }
    });

    // Set task type based on assignee count
    return Array.from(groupMap.values()).map(group => ({
      ...group,
      task_type: (group.assignee_count || 0) > 1 ? "group" : "single"
    }));
  };

  const fetchTaskDetails = async (title: string) => {
    try {
      setDetailsLoading(true);
      
      const response = await fetch(
        `${
          import.meta.env.VITE_ENV === "PRODUCTION"
            ? import.meta.env.VITE_BACKEND_PROD
            : import.meta.env.VITE_BACKEND_DEV
        }/api/v1/task-details?title=${encodeURIComponent(title)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Find individual task IDs for each assignee from our allTasks data
      const tasksWithSameTitle = allTasks.filter(t => t.title === title);
      
      const processedData = {
        ...data,
        task_type: data.analytics.total_assignees > 1 ? "group" : "single",
        assignees: data.assignees.map((assignee: any) => {
          const matchingTask = tasksWithSameTitle.find(t => t.assigned_to_id === assignee.assigned_to_id);
          return {
            ...assignee,
            is_current_user: assignee.assigned_to_id === user?.id,
            task_id: matchingTask?.id // Add the specific task ID for this assignee
          };
        })
      };

      setSelectedTask(processedData);
    } catch (error: any) {
      console.error("Error fetching task details:", error);
      addNotification({
        type: "error",
        title: "Error",
        message: "Failed to fetch task details",
        userId: user?.id || "",
        isRead: false,
      });
    } finally {
      setDetailsLoading(false);
    }
  };

    const updateTaskStatus = async (taskId: number, newStatus: string, assigneeName: string) => {
      try {
        setStatusUpdating(taskId);
        
        const baseUrl =
          import.meta.env.VITE_ENV === "PRODUCTION"
            ? import.meta.env.VITE_BACKEND_PROD
            : import.meta.env.VITE_BACKEND_DEV;

        const token = localStorage.getItem("access_token");

        // ✅ normalize to match backend enum
        const normalizedStatus = newStatus.toLowerCase();

        const response = await fetch(
          `${baseUrl}/api/v1/tasks/${taskId}/status?status=${normalizedStatus}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("You can only update the status of tasks assigned to you");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (selectedTask) {
          await fetchTaskDetails(selectedTask.title);
        }
        await fetchAllTasks();

        addNotification({
          type: "success",
          title: "Status Updated",
          message: `Task status updated to ${normalizedStatus.replace('_', ' ')}`,
          userId: user?.id || "",
          isRead: false,
        });
      } catch (error: any) {
        console.error("Error updating task status:", error);
        addNotification({
          type: "error",
          title: "Update Failed",
          message: error.message || "Failed to update task status",
          userId: user?.id || "",
          isRead: false,
        });
      } finally {
        setStatusUpdating(null);
      }
    };

  // Enhanced filter function
  const filteredTasks = groupedTasks.filter((task) => {
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = !searchLower || 
      task.title.toLowerCase().includes(searchLower) ||
      task.description.toLowerCase().includes(searchLower);
    
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    
    const matchesTaskType = taskTypeFilter === "all" || 
      (taskTypeFilter === "group" && (task.assignee_count || 0) > 1) ||
      (taskTypeFilter === "single" && (task.assignee_count || 0) === 1);
    
    // New assignment filter logic
    let matchesAssignment = true;
    if (assignmentFilter === "assigned_by_me") {
      matchesAssignment = task.created_by === user?.id;
    } else if (assignmentFilter === "assigned_to_me") {
      // Check if current user is among the assignees
      const userTasks = task.tasks?.filter(t => t.assigned_to_id === user?.id) || [];
      matchesAssignment = userTasks.length > 0;
    }
    
    return matchesSearch && matchesPriority && matchesTaskType && matchesAssignment;
  });

  // Get user's task from a group for status display/update on cards
  const getUserTaskFromGroup = (groupedTask: GroupedTask): Task | null => {
    return groupedTask.tasks?.find(t => t.assigned_to_id === user?.id) || null;
  };

  // Check if user can update status on card
  const canUpdateStatusOnCard = (groupedTask: GroupedTask): boolean => {
    const userTask = getUserTaskFromGroup(groupedTask);
    return userTask !== null; // User can only update if they're assigned to this task
  };

  // Pagination
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage);

  const handleCreateTask = async () => {
    await fetchAllTasks();
    setIsCreateModalOpen(false);
  };

  const handleCardClick = (task: GroupedTask) => {
    fetchTaskDetails(task.title);
  };

  const handleBackToList = () => {
    setSelectedTask(null);
    fetchAllTasks();
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setPriorityFilter("all");
    setTaskTypeFilter("all");
    setAssignmentFilter("all");
  };

  const getPriorityStyle = (priority: string) => {
    const styles = {
      low: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm",
      medium: "bg-amber-50 text-amber-700 border-amber-200 shadow-sm",
      high: "bg-orange-50 text-orange-700 border-orange-200 shadow-sm",
      urgent: "bg-red-50 text-red-700 border-red-200 shadow-sm",
    };
    return styles[priority as keyof typeof styles] || styles.medium;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertTriangle className="w-3 h-3" />;
      case "high":
        return <Clock className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatusStyle = (status: string) => {
    const styles = {
      pending: "bg-slate-100 text-slate-700 border-slate-200",
      in_progress: "bg-blue-50 text-blue-700 border-blue-200",
      completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "No due date";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, isOverdue: true };
    if (diffDays === 0) return { text: "Due today", isToday: true };
    if (diffDays === 1) return { text: "Due tomorrow", isUpcoming: true };
    if (diffDays <= 7) return { text: `${diffDays} days left`, isUpcoming: true };
    return { text: date.toLocaleDateString(), isNormal: true };
  };

  // Check if user can change status (only assignees can change their own status)
  const canChangeStatus = (assignee: TaskDetailUser) => {
    return assignee.is_current_user;
  };

  // Check if user is task creator or can see all assignees
  const canSeeAllAssignees = (task: TaskDetails) => {
    return user?.role === "admin" || 
           task.created_by === user?.id || 
           canAssignTasks();
  };

  // Filter assignees based on user permissions
  const getVisibleAssignees = (task: TaskDetails) => {
    if (canSeeAllAssignees(task)) {
      return task.assignees;
    }
    return task.assignees.filter(assignee => assignee.assigned_to_id === user?.id);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 border-t-blue-600"></div>
        <p className="text-slate-500 text-sm">Loading your tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Something went wrong</h3>
        <p className="text-slate-600 mb-6">{error}</p>
        <Button onClick={fetchAllTasks}>Try Again</Button>
      </div>
    );
  }

  const isCurrentUserAdmin = user?.role === "admin";
  const userCanAssign = canAssignTasks();

  // Task Details View
  if (selectedTask) {
    const dueDateInfo = formatDate(selectedTask.due_date);
    const visibleAssignees = getVisibleAssignees(selectedTask);
    const isTaskCreator = canSeeAllAssignees(selectedTask);
    
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={handleBackToList}
              className="shadow-sm"
            >
              Back to Tasks
            </Button>
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">{selectedTask.title}</h1>
                <div className="flex items-center space-x-2">
                  {selectedTask.task_type === "group" ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium">
                      <Layers className="w-3 h-3 mr-1" />
                      Group Task
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                      <FileText className="w-3 h-3 mr-1" />
                      Single Task
                    </span>
                  )}
                </div>
              </div>
              <p className="text-slate-600">{selectedTask.description}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
          {/* Task Overview */}
          <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Priority</p>
                <div className={`inline-flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-full border ${getPriorityStyle(selectedTask.priority)}`}>
                  {getPriorityIcon(selectedTask.priority)}
                  <span>{selectedTask.priority.toUpperCase()}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Created</p>
                <p className="text-slate-900 font-medium">
                  {new Date(selectedTask.created_at).toLocaleDateString()}
                </p>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Due Date</p>
                <div className={`flex items-center space-x-2 font-medium ${
                  typeof dueDateInfo === 'object' && dueDateInfo.isOverdue ? 'text-red-600' :
                  typeof dueDateInfo === 'object' && dueDateInfo.isToday ? 'text-orange-600' :
                  typeof dueDateInfo === 'object' && dueDateInfo.isUpcoming ? 'text-blue-600' :
                  'text-slate-600'
                }`}>
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {typeof dueDateInfo === 'object' ? dueDateInfo.text : dueDateInfo}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                  {isTaskCreator ? "All Assignees" : "Your Assignment"}
                </p>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-slate-900 font-medium">
                    {isTaskCreator ? selectedTask.analytics.total_assignees : visibleAssignees.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics - Only show for task creators or admins */}
          {isTaskCreator && (
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Progress Analytics</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium mb-2">Total</p>
                  <p className="text-3xl font-bold text-slate-900">{selectedTask.analytics.total_assignees}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium mb-2">Pending</p>
                  <p className="text-3xl font-bold text-slate-400">{selectedTask.analytics.pending}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <p className="text-sm text-blue-600 font-medium mb-2">In Progress</p>
                  <p className="text-3xl font-bold text-blue-600">{selectedTask.analytics.in_progress}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <p className="text-sm text-emerald-600 font-medium mb-2">Completed</p>
                  <p className="text-3xl font-bold text-emerald-600">{selectedTask.analytics.completed}</p>
                </div>
              </div>
            </div>
          )}

          {/* Assignees List */}
          <div className="p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              {isTaskCreator ? "All Assigned Users" : "Your Task Assignment"}
            </h3>
            
            {detailsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleAssignees.map((assignee, index) => {
                  const canUpdateStatus = canChangeStatus(assignee);
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-slate-200 rounded-full">
                          <User className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-semibold text-slate-900">{assignee.full_name}</p>
                            {assignee.is_current_user && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">ID: {assignee.assigned_to_id}</p>
                          {!isTaskCreator && assignee.is_current_user && (
                            <p className="text-xs text-blue-600 mt-1 font-medium">You can update your task status</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        {canUpdateStatus && assignee.task_id ? (
                          <div className="flex items-center space-x-3">
                            <select
                              value={assignee.status}
                              onChange={(e) => updateTaskStatus(assignee.task_id!, e.target.value, assignee.full_name)}
                              disabled={statusUpdating === assignee.task_id}
                              className={`px-4 py-2 text-sm font-medium rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${getStatusStyle(assignee.status)} ${
                                statusUpdating === assignee.task_id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'
                              }`}
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                            {statusUpdating === assignee.task_id && (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-200 border-t-blue-600"></div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex px-4 py-2 text-sm font-medium rounded-full border ${getStatusStyle(assignee.status)}`}>
                              {assignee.status === "in_progress" ? "In Progress" : 
                               assignee.status === "pending" ? "Pending" : "Completed"}
                            </span>
                            {!assignee.is_current_user && isTaskCreator && (
                              <span className="text-xs text-slate-500 font-medium">
                                (Assignee only)
                              </span>
                            )}
                          </div>
                        )}
                        
                        {assignee.completed_at && (
                          <div className="text-sm text-slate-500">
                            Completed: {new Date(assignee.completed_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Task Cards View
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Task Management</h1>
          <p className="text-slate-600 mt-1">
            {isCurrentUserAdmin || userCanAssign
              ? "Manage and track all your tasks"
              : "Your assigned tasks"}
          </p>
        </div>
        {(isCurrentUserAdmin || userCanAssign) && (
          <Button icon={Plus} onClick={() => setIsCreateModalOpen(true)} className="shadow-sm">
            Create Task
          </Button>
        )}
      </div>

      {/* Enhanced Search and Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/50">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <Button
            variant="secondary"
            icon={Filter}
            onClick={() => setShowFilters(!showFilters)}
            className="shadow-sm"
          >
            Filters
            <ChevronDown className={`ml-2 w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </Button>
        </div>

        {showFilters && (
          <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
              {/* Assignment Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Assignment Type
                </label>
                <select
                  value={assignmentFilter}
                  onChange={(e) => setAssignmentFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                >
                  <option value="all">All Tasks</option>
                  <option value="assigned_by_me">Assigned by Me</option>
                  <option value="assigned_to_me">Assigned to Me</option>
                </select>
              </div>

              {/* Task Type Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Task Type
                </label>
                <select
                  value={taskTypeFilter}
                  onChange={(e) => setTaskTypeFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                >
                  <option value="all">All Tasks</option>
                  <option value="group">Group Tasks</option>
                  <option value="single">Single Tasks</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Priority Level
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Items per page */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Items per page
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                >
                  <option value={6}>6 items</option>
                  <option value={9}>9 items</option>
                  <option value={12}>12 items</option>
                  <option value={18}>18 items</option>
                  <option value={24}>24 items</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              {(searchTerm || priorityFilter !== "all" || taskTypeFilter !== "all" || assignmentFilter !== "all") && (
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <span>Active filters:</span>
                  <div className="flex flex-wrap gap-2">
                    {searchTerm && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        Search: "{searchTerm}"
                      </span>
                    )}
                    {assignmentFilter !== "all" && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        {assignmentFilter === "assigned_by_me" ? "Assigned by Me" : "Assigned to Me"}
                      </span>
                    )}
                    {taskTypeFilter !== "all" && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                        Type: {taskTypeFilter === "group" ? "Group Tasks" : "Single Tasks"}
                      </span>
                    )}
                    {priorityFilter !== "all" && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                        Priority: {priorityFilter}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <Button
                variant="secondary"
                onClick={clearFilters}
                className="ml-auto"
                size="sm"
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Task Cards Grid with Status Update */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedTasks.length > 0 ? (
          paginatedTasks.map((task, index) => {
            //  REPLACE THE EXISTING RETURN BLOCK INSIDE paginatedTasks.map() WITH THIS

          const dueDateInfo = formatDate(task.due_date);
          const isGroupTask = (task.assignee_count || 0) > 1;
          const userTask = getUserTaskFromGroup(task);
          const canUpdateOnCard = canUpdateStatusOnCard(task);
          const isCreatedByUser = task.created_by === user?.id;

          // Conditionally set the click handler and cursor style
          const onCardClick = isCreatedByUser ? () => handleCardClick(task) : undefined;
          const cardCursorClass = isCreatedByUser ? "cursor-pointer" : "";

          return (
            <div
              key={index}
              className="group bg-white rounded-xl shadow-sm border border-slate-200/50 p-5 hover:shadow-md hover:shadow-blue-100/50 hover:border-blue-300/50 transition-all duration-200 hover:-translate-y-1"
            >
              <div className="space-y-4">
                {/* Header with Title and Priority */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div 
                      className={cardCursorClass} // Use conditional cursor
                      onClick={onCardClick} // Use conditional handler
                    >
                      <h3 className="text-base font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
                        {task.title}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      {isGroupTask ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium">
                          <Layers className="w-3 h-3 mr-1" />
                          Group ({task.assignee_count})
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                          <FileText className="w-3 h-3 mr-1" />
                          Single
                        </span>
                      )}
                      
                      {isCreatedByUser && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-medium">
                          <UserPlus className="w-3 h-3 mr-1" />
                          Created by you
                        </span>
                      )}
                      
                      {userTask && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Assigned to you
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-full border ${getPriorityStyle(task.priority)} ml-3 flex-shrink-0`}>
                    {getPriorityIcon(task.priority)}
                    <span>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
                  </div>
                </div>

                {/* Description */}
                <div 
                  className={cardCursorClass} // Use conditional cursor
                  onClick={onCardClick} // Use conditional handler
                >
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>
                </div>

                {/* Status Update Section (only if user is assigned) */}
                {canUpdateOnCard && userTask && (
                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Your Status:</span>
                      <div className="flex items-center space-x-2">
                        <select
                          value={userTask.status}
                          onChange={(e) => updateTaskStatus(userTask.id, e.target.value, userTask.assignee_name)}
                          disabled={statusUpdating === userTask.id}
                          className={`px-3 py-1 text-xs font-medium rounded-full border transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/20 ${getStatusStyle(userTask.status)} ${
                            statusUpdating === userTask.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'
                          }`}
                          onClick={(e) => e.stopPropagation()} // Prevent card click when interacting with dropdown
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                        {statusUpdating === userTask.id && (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Date Information */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Created</span>
                    <span className="text-slate-700">
                      {new Date(task.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Due</span>
                    <div className={`flex items-center space-x-1 font-medium ${
                      typeof dueDateInfo === 'object' && dueDateInfo.isOverdue ? 'text-red-600' :
                      typeof dueDateInfo === 'object' && dueDateInfo.isToday ? 'text-orange-600' :
                      typeof dueDateInfo === 'object' && dueDateInfo.isUpcoming ? 'text-blue-600' :
                      'text-slate-600'
                    }`}>
                      <Calendar className="w-3 h-3" />
                      <span className="text-xs">
                        {typeof dueDateInfo === 'object' ? dueDateInfo.text : dueDateInfo}
                      </span>
                    </div>
                  </div>
                </div>

                {/* View Details Footer - ONLY SHOWS FOR CREATOR */}
                {isCreatedByUser && (
                  <div className="pt-3 border-t border-slate-100">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={onCardClick} // Use conditional handler
                    >
                      <div className="flex items-center space-x-2">
                        <Eye className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <span className="text-sm text-slate-500 group-hover:text-blue-600 transition-colors font-medium">
                          View Details
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
          })
        ) : (
          <div className="col-span-full text-center py-16">
            <div className="flex flex-col items-center">
              <div className="p-4 bg-slate-100 rounded-full mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {searchTerm || priorityFilter !== "all" || taskTypeFilter !== "all" || assignmentFilter !== "all" 
                  ? "No matching tasks found" 
                  : "No tasks found"}
              </h3>
              <p className="text-slate-500 mb-6 max-w-md">
                {searchTerm || priorityFilter !== "all" || taskTypeFilter !== "all" || assignmentFilter !== "all"
                  ? "Try adjusting your search terms or filters to find what you're looking for"
                  : "No tasks have been created yet. Create your first task to get started"}
              </p>
              {(searchTerm || priorityFilter !== "all" || taskTypeFilter !== "all" || assignmentFilter !== "all") && (
                <Button onClick={clearFilters} variant="secondary">
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-slate-200/50">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{startIndex + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(startIndex + itemsPerPage, filteredTasks.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{filteredTasks.length}</span> results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNumber =
                  Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                      currentPage === pageNumber
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="inline-flex items-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Task"
        maxWidth="lg"
      >
        <TaskForm
          onSubmit={handleCreateTask}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </Modal>
    </div>
  );
};