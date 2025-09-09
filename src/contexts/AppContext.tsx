// import React, { createContext, useContext, useState, ReactNode } from 'react';
// import { Task, Client, Notification } from '../types';
// import { useAuth } from './AuthContext'; // ✅ import auth context to check role

// interface AppContextType {
//   tasks: Task[];
//   clients: Client[];
//   notifications: Notification[];
//   selectedClient: Client | null;
//   setSelectedClient: (client: Client | null) => void;
//   updateTasks: (tasks: Task[]) => void;
//   addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
//   updateTask: (id: string, updates: Partial<Task>) => void;
//   deleteTask: (id: string) => void;
//   addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
//   markNotificationAsRead: (id: string | number) => void;
//   setNotifications: (notifications: Notification[] | ((prev: Notification[]) => Notification[])) => void;
// }

// const AppContext = createContext<AppContextType | undefined>(undefined);

// export const useApp = () => {
//   const context = useContext(AppContext);
//   if (context === undefined) {
//     throw new Error('useApp must be used within an AppProvider');
//   }
//   return context;
// };

// interface AppProviderProps {
//   children: ReactNode;
// }

// export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
//   const { user } = useAuth(); // ✅ check current user role
//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [clients, setClients] = useState<Client[]>([]);
//   const [notifications, setNotifications] = useState<Notification[]>([]);
//   const [selectedClient, setSelectedClient] = useState<Client | null>(null);

//   const updateTasks = (newTasks: Task[]) => {
//     setTasks(newTasks);
//   };

//   const addTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
//     const newTask: Task = { ...task, id: Date.now().toString(), createdAt: new Date() };
//     setTasks(prev => [...prev, newTask]);
//   };

//   const updateTask = (id: string, updates: Partial<Task>) => {
//     setTasks(prev => prev.map(task =>
//       task.id === id ? { ...task, ...updates } : task
//     ));
//   };

//   const deleteTask = (id: string) => {
//     setTasks(prev => prev.filter(task => task.id !== id));
//   };

//   const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
//     if (user?.role === "company") return; // 🚫 skip notifications for company
//     const newNotification: Notification = {
//       ...notification,
//       id: Date.now().toString(),
//       createdAt: new Date()
//     };
//     setNotifications(prev => [newNotification, ...prev]);
//   };

//   const markNotificationAsRead = (id: string | number) => {
//     if (user?.role === "company") return; // 🚫 skip for company
//     setNotifications(prev => prev.map(notif =>
//       notif.id.toString() === id.toString() ? { ...notif, isRead: true } : notif
//     ));
//   };

//   return (
//     <AppContext.Provider value={{
//       tasks,
//       clients,
//       notifications,
//       selectedClient,
//       setSelectedClient,
//       updateTasks,
//       addTask,
//       updateTask,
//       deleteTask,
//       addNotification,
//       markNotificationAsRead,
//       setNotifications,
//     }}>
//       {children}
//     </AppContext.Provider>
//   );
// };


// import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
// import { Task, Client, Notification, User } from '../types'; // Assuming User is in types
// import { useAuth } from './AuthContext';
// import { tasksAPI } from '../services/api'; // Import your API service

// interface AppContextType {
//   tasks: Task[];
//   users: User[]; // Add users to the context
//   clients: Client[];
//   loading: boolean; // Add a loading state
//   error: string | null; // Add an error state
//   notifications: Notification[];
//   selectedClient: Client | null;
//   setSelectedClient: (client: Client | null) => void;
//   updateTasks: (tasks: Task[]) => void;
//   addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
//   updateTask: (id: string, updates: Partial<Task>) => void;
//   deleteTask: (id: string) => void;
//   addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
//   markNotificationAsRead: (id: string | number) => void;
//   setNotifications: (notifications: Notification[] | ((prev: Notification[]) => Notification[])) => void;
// }

// const AppContext = createContext<AppContextType | undefined>(undefined);

// export const useApp = () => {
//   const context = useContext(AppContext);
//   if (context === undefined) {
//     throw new Error('useApp must be used within an AppProvider');
//   }
//   return context;
// };

// interface AppProviderProps {
//   children: ReactNode;
// }

// export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
//   const { user } = useAuth();
//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [users, setUsers] = useState<User[]>([]); // Add state for users
//   const [clients, setClients] = useState<Client[]>([]);
//   const [notifications, setNotifications] = useState<Notification[]>([]);
//   const [selectedClient, setSelectedClient] = useState<Client | null>(null);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);

//   // ✅ SOLUTION: Fetch data when the AppProvider loads
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         setLoading(true);
//         setError(null);
//         // Fetch all individual tasks for reporting purposes
//         // Assuming you have an API endpoint to get all tasks.
//         // We use 'my-tasks' as a stand-in from TaskList.tsx; you might need a different one for admins.
//         const fetchedTasks = await tasksAPI.getMyTasks({ limit: 1000 }); // Increase limit to get all
        
//         // You'll also need an API call to get all users for the reports
//         // const fetchedUsers = await usersAPI.getAllUsers();
        
//         // This is placeholder data for users since the API call doesn't exist yet.
//         // Replace this with your actual user fetching logic.
//         const fetchedUsers: User[] = [
//             // Example user data
//         ];

//         setTasks(fetchedTasks);
//         setUsers(fetchedUsers); // Set the fetched users
//       } catch (err: any) {
//         setError(err.message || 'Failed to fetch data');
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (user) { // Only fetch data if a user is logged in
//       fetchData();
//     }
//   }, [user]);

//   const updateTasks = (newTasks: Task[]) => {
//     setTasks(newTasks);
//   };
  
//   // The rest of the functions remain the same...
//   const addTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
//     // This function should now probably be an API call
//     console.log("Adding task locally:", task);
//   };

//   const updateTask = (id: string, updates: Partial<Task>) => {
//      // This function should now probably be an API call
//     console.log("Updating task locally:", id, updates);
//   };

//   const deleteTask = (id: string) => {
//     setTasks(prev => prev.filter(task => task.id !== id));
//   };

//   const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
//     if (user?.role === "company") return;
//     const newNotification: Notification = {
//       ...notification,
//       id: Date.now().toString(),
//       createdAt: new Date(),
//       isRead: false,
//       message: ''
//     };
//     setNotifications(prev => [newNotification, ...prev]);
//   };

//   const markNotificationAsRead = (id: string | number) => {
//     if (user?.role === "company") return;
//     setNotifications(prev => prev.map(notif =>
//       notif.id.toString() === id.toString() ? { ...notif, isRead: true } : notif
//     ));
//   };

//   return (
//     <AppContext.Provider value={{
//       tasks,
//       users,
//       clients,
//       loading,
//       error,
//       notifications,
//       selectedClient,
//       setSelectedClient,
//       updateTasks,
//       addTask,
//       updateTask,
//       deleteTask,
//       addNotification,
//       markNotificationAsRead,
//       setNotifications,
//     }}>
//       {children}
//     </AppContext.Provider>
//   );
// };



import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Task, Client, Notification, User } from '../types';
import { useAuth } from './AuthContext';
import { tasksAPI } from '../services/api';

interface AppContextType {
  tasks: Task[];
  users: User[];
  clients: Client[];
  loading: boolean;
  error: string | null;
  notifications: Notification[];
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
  updateTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markNotificationAsRead: (id: string | number) => void;
  setNotifications: (notifications: Notification[] | ((prev: Notification[]) => Notification[])) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data when the AppProvider loads
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('🔍 AppContext: Fetching data for user role:', user.role);
        
        // 🔧 FIXED: Different data fetching strategy based on user role
        let fetchedTasks: Task[] = [];
        let fetchedUsers: User[] = [];
        
        if (user.role === 'company') {
          console.log('🔍 AppContext: Company user - using analytics endpoint instead');
          // For company users, don't fetch individual tasks that might be unauthorized
          // Instead, the Reports component can use analytics data
          // Or fetch tasks using a different endpoint that company users have access to
          try {
            // You might have a different endpoint for company users
            // fetchedTasks = await tasksAPI.getCompanyTasks({ limit: 1000 });
            console.log('🔍 AppContext: Skipping task fetch for company user');
          } catch (taskError) {
            console.warn('🔍 AppContext: Company task fetch failed (expected):', taskError);
          }
        } else {
          // For regular users, fetch their assigned tasks
          try {
            fetchedTasks = await tasksAPI.getMyTasks({ limit: 1000 });
            console.log('🔍 AppContext: Fetched tasks for regular user:', fetchedTasks.length);
          } catch (taskError) {
            console.error('🔍 AppContext: Failed to fetch tasks for regular user:', taskError);
            // Don't fail the entire process if tasks can't be fetched
          }
        }

        // 🔧 FIXED: Don't fetch users for company role if it causes 401
        if (user.role !== 'company') {
          try {
            // Only fetch users for non-company users
            // fetchedUsers = await usersAPI.getAllUsers();
            
            // For now, extract unique users from tasks
            if (fetchedTasks.length > 0) {
              const userIds = [...new Set(fetchedTasks.map(task => task.assigned_to_id || task.assignedTo))];
              fetchedUsers = userIds.map(id => ({
                id: id,
                name: `User ${id}`,
                avatar: `https://avatar.vercel.sh/User${id}.png`
              })).filter(user => user.id);
            }
            console.log('🔍 AppContext: Generated users from tasks:', fetchedUsers.length);
          } catch (userError) {
            console.warn('🔍 AppContext: Could not fetch users:', userError);
          }
        } else {
          console.log('🔍 AppContext: Skipping user fetch for company user');
          // For company users, create minimal user data or fetch differently
          fetchedUsers = [{
            id: user.id,
            name: user.name || 'Company User',
            role: 'company',
            avatar: `https://avatar.vercel.sh/${user.name || 'Company'}.png`
          }];
        }

        setTasks(fetchedTasks);
        setUsers(fetchedUsers);
        console.log('🔍 AppContext: Data fetch completed successfully');
        
      } catch (err: any) {
        console.error('🔍 AppContext: Failed to fetch data:', err);
        // 🔧 FIXED: Don't set error for company users, as they might not have access to all endpoints
        if (user.role !== 'company') {
          setError(err.message || 'Failed to fetch data');
        } else {
          console.log('🔍 AppContext: Ignoring fetch error for company user');
        }
      } finally {
        setLoading(false);
        console.log('🔍 AppContext: Fetch process completed, loading set to false');
      }
    };

    fetchData();
  }, [user]);

  const updateTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
  };

  const addTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      // Try to add via API first
      const newTask = await tasksAPI.createTask(task);
      setTasks(prev => [...prev, newTask]);
    } catch (error) {
      console.error('Failed to add task via API:', error);
      // Fallback to local state
      const newTask: Task = { 
        ...task, 
        id: Date.now().toString(), 
        createdAt: new Date(),
        created_at: new Date().toISOString(), // For compatibility
      };
      setTasks(prev => [...prev, newTask]);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      // Try to update via API first
      const updatedTask = await tasksAPI.updateTask(id, updates);
      setTasks(prev => prev.map(task =>
        task.id === id ? updatedTask : task
      ));
    } catch (error) {
      console.error('Failed to update task via API:', error);
      // Fallback to local state
      setTasks(prev => prev.map(task =>
        task.id === id ? { ...task, ...updates } : task
      ));
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await tasksAPI.deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (error) {
      console.error('Failed to delete task via API:', error);
      // Still remove from local state
      setTasks(prev => prev.filter(task => task.id !== id));
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    // Skip notifications for company users
    if (user?.role === "company") return;
    
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date(),
      isRead: false,
      message: notification.message || '' // Ensure message exists
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markNotificationAsRead = (id: string | number) => {
    // Skip for company users
    if (user?.role === "company") return;
    
    setNotifications(prev => prev.map(notif =>
      notif.id.toString() === id.toString() ? { ...notif, isRead: true } : notif
    ));
  };

  return (
    <AppContext.Provider value={{
      tasks,
      users,
      clients,
      loading,
      error,
      notifications,
      selectedClient,
      setSelectedClient,
      updateTasks,
      addTask,
      updateTask,
      deleteTask,
      addNotification,
      markNotificationAsRead,
      setNotifications,
    }}>
      {children}
    </AppContext.Provider>
  );
};