import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const POLL_INTERVAL = 30000; // 30 seconds

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  /**
   * Fetch the unread notification count from the API.
   */
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.count ?? response.data.unread_count ?? 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [isAuthenticated]);

  /**
   * Fetch the full notifications list from the API.
   */
  const fetchNotifications = useCallback(async (params = {}) => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await api.get('/notifications', { params });
      const data = response.data.notifications || response.data.data || response.data;
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Mark a single notification as read.
   */
  const markAsRead = useCallback(async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === id || notif.id === id
            ? { ...notif, read: true, is_read: true }
            : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  /**
   * Mark all notifications as read.
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Poll for unread count when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Fetch immediately
      fetchUnreadCount();

      // Set up polling interval
      intervalRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);
    } else {
      // Clear state when not authenticated
      setNotifications([]);
      setUnreadCount(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, fetchUnreadCount]);

  const contextValue = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      fetchUnreadCount,
      markAsRead,
      markAllAsRead,
    }),
    [notifications, unreadCount, loading, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Custom hook to consume the NotificationContext.
 * Must be used within a <NotificationProvider>.
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
