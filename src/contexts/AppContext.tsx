import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Task, Client, Notification } from '../types';
import { useAuth } from './AuthContext'; // ✅ import auth context to check role

interface AppContextType {
  tasks: Task[];
  clients: Client[];
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
  const { user } = useAuth(); // ✅ check current user role
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const updateTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
  };

  const addTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = { ...task, id: Date.now().toString(), createdAt: new Date() };
    setTasks(prev => [...prev, newTask]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, ...updates } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    if (user?.role === "company") return; // 🚫 skip notifications for company
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markNotificationAsRead = (id: string | number) => {
    if (user?.role === "company") return; // 🚫 skip for company
    setNotifications(prev => prev.map(notif =>
      notif.id.toString() === id.toString() ? { ...notif, isRead: true } : notif
    ));
  };

  return (
    <AppContext.Provider value={{
      tasks,
      clients,
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