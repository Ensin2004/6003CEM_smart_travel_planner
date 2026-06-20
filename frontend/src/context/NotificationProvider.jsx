/**
 * Realtime notification provider with Socket.IO and Toastify.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  subscribeToCategories: () => () => {},
  subscribeToSettingsContent: () => () => {},
  subscribeToFeedback: () => () => {},
  subscribeToAdminUserCreated: () => () => {},
  subscribeToAdminLogEvents: () => () => {},
});

const adminNotificationTypes = new Set([
  'admin-rate-limit',
  'admin-signup',
  'admin-feedback',
  'admin-error-log',
  'admin-login-lock',
]);
const emptyNotifications = [];

export function NotificationProvider({ children }) {
  const location = useLocation();
  const { isAuthenticated, user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sortOrder, setSortOrder] = useState('desc');
  const categorySubscribers = useRef(new Set());
  const settingsContentSubscribers = useRef(new Set());
  const feedbackSubscribers = useRef(new Set());
  const adminUserCreatedSubscribers = useRef(new Set());
  const adminLogEventSubscribers = useRef(new Set());

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

  const subscribeToSettingsContent = useCallback((listener) => {
    settingsContentSubscribers.current.add(listener);
    return () => settingsContentSubscribers.current.delete(listener);
  }, []);

  const subscribeToCategories = useCallback((listener) => {
    categorySubscribers.current.add(listener);
    return () => categorySubscribers.current.delete(listener);
  }, []);

  const subscribeToFeedback = useCallback((listener) => {
    feedbackSubscribers.current.add(listener);
    return () => feedbackSubscribers.current.delete(listener);
  }, []);

  const subscribeToAdminUserCreated = useCallback((listener) => {
    adminUserCreatedSubscribers.current.add(listener);
    return () => adminUserCreatedSubscribers.current.delete(listener);
  }, []);

  const subscribeToAdminLogEvents = useCallback((listener) => {
    adminLogEventSubscribers.current.add(listener);
    return () => adminLogEventSubscribers.current.delete(listener);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    getNotifications(sortOrder)
      .then((response) => {
        setNotifications(response.data.data.notifications || []);
        setUnreadCount(response.data.data.unreadCount || 0);
      })
      .catch(() => {});
  }, [isAuthenticated, sortOrder]);

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

      if (isAdminNotification) {
        adminLogEventSubscribers.current.forEach((listener) => listener(notification));
      }
    });

    socket.on('notification:unread-count', ({ unreadCount: nextUnreadCount }) => {
      setUnreadCount(nextUnreadCount || 0);
    });

    socket.on('settings:content-updated', ({ content }) => {
      settingsContentSubscribers.current.forEach((listener) => listener(content));
    });

    socket.on('categories:updated', ({ action, category }) => {
      categorySubscribers.current.forEach((listener) => listener({ action, category }));
    });

    socket.on('feedback:submitted', ({ feedback }) => {
      feedbackSubscribers.current.forEach((listener) => listener(feedback));
    });

    socket.on('admin:user-created', ({ userId }) => {
      adminUserCreatedSubscribers.current.forEach((listener) => listener(userId));
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, location.pathname, sortOrder, user]);

  const visibleNotifications = isAuthenticated ? notifications : emptyNotifications;
  const visibleUnreadCount = isAuthenticated ? unreadCount : 0;
  const value = useMemo(
    () => ({
      markAllAsRead,
      markAsRead,
      notifications: visibleNotifications,
      refreshNotifications,
      setSortOrder,
      sortOrder,
      subscribeToAdminUserCreated,
      subscribeToAdminLogEvents,
      subscribeToCategories,
      subscribeToFeedback,
      subscribeToSettingsContent,
      unreadCount: visibleUnreadCount,
    }),
    [
      markAllAsRead,
      markAsRead,
      refreshNotifications,
      sortOrder,
      subscribeToAdminUserCreated,
      subscribeToAdminLogEvents,
      subscribeToCategories,
      subscribeToFeedback,
      subscribeToSettingsContent,
      visibleNotifications,
      visibleUnreadCount,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer autoClose={4500} newestOnTop position="top-right" theme="light" />
    </NotificationContext.Provider>
  );
}

export default NotificationContext;
