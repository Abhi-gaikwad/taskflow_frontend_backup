import React, { useState, useRef, useEffect } from "react";
import {
  Bell,
  Search,
  Plus,
  CheckCircle,
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useApp } from "../../contexts/AppContext";

interface HeaderProps {
  onNewTask: () => void;
}

// Path to your sound file (put in public/sounds/notify.wav)
const NOTIF_SOUND_URL = "/sounds/notify.mp3";

export const Header: React.FC<HeaderProps> = ({ onNewTask }) => {
  const { user, logout } = useAuth();
  const { notifications, setNotifications, markNotificationAsRead } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const bellRef = useRef<HTMLButtonElement | null>(null);
  const profileRef = useRef<HTMLButtonElement | null>(null);
  const notificationDropdownRef = useRef<HTMLDivElement | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement | null>(null);

  // Filter out error notifications before calculating the unread count
  const unreadCount = notifications.filter(
    (n) => !n.isRead && n.type !== "error"
  ).length;
  const [lastUnread, setLastUnread] = useState(unreadCount);

  // Auto-load notifications when component mounts (dashboard loads)
  useEffect(() => {
    if (!notificationsLoaded && user?.role !== "company") {
      fetchNotifications();
    }
  }, [notificationsLoaded, user?.role]);

  // Fetch notifications function
  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_ENV == "PRODUCTION"
            ? import.meta.env.VITE_BACKEND_PROD
            : import.meta.env.VITE_BACKEND_DEV
        }/api/v1/notifications`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();

      // Normalize backend → frontend keys
      const formattedNotifications = data.map((notif: any) => ({
        id: notif.id,
        message: notif.message,
        title: notif.title,
        type: (notif.type || notif.notification_type || "").toLowerCase(),
        isRead: notif.is_read ?? false,
        createdAt: notif.created_at || notif.createdAt,
      }));

      if (setNotifications) {
        setNotifications(formattedNotifications);
      }
      setNotificationsLoaded(true);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotificationsLoaded(true); // Still mark as loaded to avoid infinite retries
    }
  };

  // Play notification sound when new unread notifications arrive
  useEffect(() => {
    if (unreadCount > lastUnread && notificationsLoaded) {
      const audio = new Audio(NOTIF_SOUND_URL);
      audio.play().catch(() => {
        // Silently handle audio play errors
      });
    }
    setLastUnread(unreadCount);
  }, [unreadCount, notificationsLoaded]);

  // Outside click closes dropdowns
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      // Close notifications dropdown
      if (
        showNotifications &&
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }

      // Close profile dropdown
      if (
        showProfile &&
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node) &&
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showNotifications, showProfile]);

  // Mark all as read handler
  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.isRead);

    // Mark all unread notifications as read on the backend
    const promises = unreadNotifications.map(async (n) => {
      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_ENV == "PRODUCTION"
              ? import.meta.env.VITE_BACKEND_PROD
              : import.meta.env.VITE_BACKEND_DEV
          }/api/v1/notifications/${n.id}/read`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          }
        );

        if (response.ok && markNotificationAsRead) {
          markNotificationAsRead(n.id);
        }
      } catch (error) {
        console.error(`Error marking notification ${n.id} as read:`, error);
      }
    });

    await Promise.all(promises);
  };

  // Clear all notifications handler
  const clearAllNotifications = async () => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_ENV == "PRODUCTION"
            ? import.meta.env.VITE_BACKEND_PROD
            : import.meta.env.VITE_BACKEND_DEV
        }/api/v1/notifications/clear`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (response.ok && setNotifications) {
        setNotifications([]);
        setShowNotifications(false);
      }
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  // Navigate to notifications page
  const navigateToNotifications = () => {
    setShowNotifications(false);
    // You can use your routing system here
    window.location.href = "/notifications";
  };

  // Filter notifications to exclude error types for display
  const displayNotifications = notifications.filter((n) => n.type !== "error");

  // Get display name for different user roles
  const getDisplayName = () => {
    if (user?.role === "company") {
      return user?.company?.name || "Company User";
    }
    return user?.name || user?.username || "User";
  };

  // Get role display
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "super_admin":
        return "Super Administrator";
      case "company":
        return "Company Admin";
      case "admin":
        return "Administrator";
      case "user":
        return "User";
      default:
        return role?.replace("_", " ") || "User";
    }
  };

  const handleLogout = () => {
    setShowProfile(false);
    logout();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-5 sticky top-0 z-40">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        
        {/* Left side - Search */}
        <div className="flex items-center space-x-4 flex-1">
          {/* <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks, users, projects…"
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-80 text-sm"
            />
          </div> */}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">

          {/* New Task Button */}
          {(user?.role === "admin" || user?.canAssignTasks) &&
            user?.role !== "super_admin" &&
            user?.role !== "company" && (
              <button
                onClick={onNewTask}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 shadow-md text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Task</span>
              </button>
            )}

          {/* Notification Button */}
          <div className="relative">
            <button
              ref={bellRef}
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfile(false);
              }}
              className="p-2 text-gray-400 hover:text-blue-500 relative hover:bg-blue-50 rounded-full border border-transparent focus:ring-2 focus:ring-blue-300 focus:outline-none transition"
              aria-label="Show Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-white shadow min-w-[20px]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div
                ref={notificationDropdownRef}
                className="absolute z-50 right-0 mt-2 w-80 bg-white shadow-lg border border-gray-200 rounded-lg overflow-hidden max-h-96"
              >
                {/* Notification Header */}
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Notifications
                    </h3>
                    <div className="flex items-center space-x-3">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Mark all read
                        </button>
                      )}
                      {/* {displayNotifications.length > 0 && (
                        <button
                          onClick={clearAllNotifications}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Clear all
                        </button>
                      )} */}
                    </div>
                  </div>
                </div>

                {/* Notification List */}
                <div className="max-h-64 overflow-y-auto">
                  {displayNotifications.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {displayNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                            !notification.isRead ? "bg-blue-50" : ""
                          }`}
                          onClick={() => {
                            if (!notification.isRead && markNotificationAsRead) {
                              markNotificationAsRead(notification.id);
                            }
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              {notification.type === "success" ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <Bell className="w-5 h-5 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {notification.title && (
                                    <p className="text-sm font-medium text-gray-900 mb-1">
                                      {notification.title}
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-600">
                                    {notification.message}
                                  </p>
                                  {notification.createdAt && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(notification.createdAt).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-2"></div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                {displayNotifications.length > 0 && (
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                    <button
                      onClick={navigateToNotifications}
                      className="text-xs text-gray-600 hover:text-gray-700"
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile Button */}
          <div className="relative">
            <button
              ref={profileRef}
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
              className="flex items-center space-x-2 sm:space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <img
                src={
                  user?.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    getDisplayName()
                  )}&background=random`
                }
                alt={`${getDisplayName()}'s avatar`}
                className="w-8 h-8 rounded-full object-cover border border-gray-300 shadow-sm flex-shrink-0"
              />
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {getDisplayName()}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {getRoleDisplay(user?.role || "")}
                </p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform hidden sm:block ${
                  showProfile ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Profile Dropdown */}
            {showProfile && (
              <div
                ref={profileDropdownRef}
                className="absolute z-50 right-0 mt-2 w-64 bg-white shadow-2xl border border-gray-100 rounded-xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.97)",
                  boxShadow: "0 8px 32px rgba(50,60,100,0.18)",
                }}
              >
                {/* Profile Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-5 sticky top-0 z-40">
                  <div className="flex items-center space-x-3">
                    <img
                      src={
                        user?.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          getDisplayName()
                        )}&background=random`
                      }
                      alt={`${getDisplayName()}'s avatar`}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {getDisplayName()}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {getRoleDisplay(user?.role || "")}
                      </p>
                      {user?.email && (
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Menu */}
                <div className="py-2">
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      window.location.href = "/settings";
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 mr-3 text-gray-400" />
                    View Profile
                  </button>

                  <hr className="my-2 border-gray-100" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};