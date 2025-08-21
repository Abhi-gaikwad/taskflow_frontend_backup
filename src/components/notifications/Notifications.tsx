import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle,
  Clock,
  AlertTriangle,
  Info,
  Trash2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const { notifications, setNotifications, markNotificationAsRead } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch if we don't have notifications loaded yet
    if (notifications.length === 0) {
      fetchNotifications();
    }
  }, []);

  const fetchNotifications = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

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
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_ENV == "PRODUCTION"
            ? import.meta.env.VITE_BACKEND_PROD
            : import.meta.env.VITE_BACKEND_DEV
        }/api/v1/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (response.ok) {
        if (markNotificationAsRead) {
          markNotificationAsRead(notificationId);
        }
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_ENV == "PRODUCTION"
            ? import.meta.env.VITE_BACKEND_PROD
            : import.meta.env.VITE_BACKEND_DEV
        }/api/v1/notifications/${notificationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (response.ok) {
        if (setNotifications) {
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notificationId)
          );
        }
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task_assigned":
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case "task_creator_assigned":
        return <CheckCircle className="w-5 h-5 text-indigo-600" />;
      case "task_status_updated":
        return <Info className="w-5 h-5 text-purple-600" />;
      case "task_completed":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "task_due_soon":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "task_created":
        return <Plus className="w-5 h-5 text-green-600" />;
      case "bulk_task_assigned":
        return <Plus className="w-5 h-5 text-teal-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationBg = (type: string) => {
    switch (type) {
      case "task_assigned":
        return "bg-blue-50 border-blue-200";
      case "task_creator_assigned":
        return "bg-indigo-50 border-indigo-200";
      case "task_status_updated":
        return "bg-purple-50 border-purple-200";
      case "task_completed":
        return "bg-green-50 border-green-200";
      case "task_due_soon":
        return "bg-red-50 border-red-200";
      case "task_created":
        return "bg-green-50 border-green-200";
      case "bulk_task_assigned":
        return "bg-teal-50 border-teal-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  // Filter out any error-related notifications before rendering
  const filteredNotifications = notifications.filter(
    (notification) => notification.type !== "error"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            Stay updated with your tasks and activities
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => fetchNotifications(true)}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {filteredNotifications.filter((n) => !n.isRead).length} unread
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6">
          {loading && notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-300 mx-auto mb-4" />
              <p className="text-red-500">{error}</p>
              <button
                onClick={() => fetchNotifications(true)}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No notifications yet</p>
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      notification.isRead
                        ? "bg-gray-50 border-gray-200"
                        : getNotificationBg(notification.type)
                    } ${!notification.isRead ? "hover:shadow-md" : ""}`}
                    onClick={() =>
                      !notification.isRead && markAsRead(notification.id)
                    }
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-sm font-medium ${
                              notification.isRead
                                ? "text-gray-600"
                                : "text-gray-900"
                            }`}
                          >
                            {notification.title || notification.message}
                          </p>
                          <div className="flex items-center space-x-2">
                            <p className="text-xs text-gray-500">
                              {notification.createdAt
                                ? new Date(
                                    notification.createdAt
                                  ).toLocaleDateString()
                                : ""}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {notification.title && (
                          <p
                            className={`text-sm mt-1 ${
                              notification.isRead
                                ? "text-gray-500"
                                : "text-gray-700"
                            }`}
                          >
                            {notification.message}
                          </p>
                        )}
                        {!notification.isRead && (
                          <div className="flex items-center mt-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                            <span className="text-xs text-blue-600 font-medium">
                              New
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
