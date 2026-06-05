/**
 * Realtime notification provider with Socket.IO and Toastify.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast, ToastContainer } from 'react-toastify';
import {
  getNotifications,
  getSocketBaseURL,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notificationApi';
import AuthContext from './authContext';

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  sortOrder: 'desc',
  setSortOrder: () => {},
  refreshNotifications: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
});

const adminNotificationTypes = new Set(['admin-rate-limit', 'admin-signup', 'admin-error-log', 'admin-login-lock']);

export function NotificationProvider({ children }) {
  const location = useLocation();
  const { isAuthenticated, user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sortOrder, setSortOrder] = useState('desc');

  const refreshNotifications = useCallback(async (sort = sortOrder) => {
    if (!localStorage.getItem('accessToken')) return;
    const response = await getNotifications(sort);
    setNotifications(response.data.data.notifications || []);
    setUnreadCount(response.data.data.unreadCount || 0);
  }, [sortOrder]);

  const markAsRead = useCallback(async (id) => {
    const response = await markNotificationRead(id);
    const updatedNotification = response.data.data.notification;
    setNotifications((current) =>
      current.map((notification) => (notification._id === id ? updatedNotification : notification))
    );
    setUnreadCount(response.data.data.unreadCount || 0);
  }, []);

  const markAllAsRead = useCallback(async () => {
    const response = await markAllNotificationsRead();
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
    setUnreadCount(response.data.data.unreadCount || 0);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    refreshNotifications(sortOrder).catch(() => {});
  }, [isAuthenticated, refreshNotifications, sortOrder]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!isAuthenticated || !token || !user) return undefined;

    const socket = io(getSocketBaseURL(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('notification:new', ({ notification, unreadCount: nextUnreadCount }) => {
      setNotifications((current) => {
        const nextNotifications = current.filter((item) => item._id !== notification._id);
        return sortOrder === 'asc' ? [...nextNotifications, notification] : [notification, ...nextNotifications];
      });
      setUnreadCount(nextUnreadCount || 0);
      const isAdminNotification = adminNotificationTypes.has(notification.type);
      const shouldShowToast =
        !isAdminNotification || (user?.role === 'admin' && location.pathname.startsWith('/admin'));

      if (shouldShowToast) {
        toast.info(notification.title, {
          toastId: notification._id,
          closeOnClick: true,
        });
      }
    });

    socket.on('notification:unread-count', ({ unreadCount: nextUnreadCount }) => {
      setUnreadCount(nextUnreadCount || 0);
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, location.pathname, sortOrder, user]);

  const value = useMemo(
    () => ({
      markAllAsRead,
      markAsRead,
      notifications,
      refreshNotifications,
      setSortOrder,
      sortOrder,
      unreadCount,
    }),
    [markAllAsRead, markAsRead, notifications, refreshNotifications, sortOrder, unreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer autoClose={4500} newestOnTop position="top-right" theme="light" />
    </NotificationContext.Provider>
  );
}

export default NotificationContext;
