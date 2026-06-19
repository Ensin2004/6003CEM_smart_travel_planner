/**
 * Notifications page component that displays user alerts and admin system notifications.
 * Supports filtering, sorting, and marking notifications as read.
 */
import { Bell, CheckCheck, Clock3, Gauge, LockKeyhole, Luggage, Mail, Plane, ShieldAlert, Star, UserPlus } from 'lucide-react';
import { useContext, useMemo, useState } from 'react';
import AuthContext from '../../context/authContext';
import useNotifications from '../../hooks/useNotifications';
import './NotificationsPage.css';

// Formats a timestamp into a localized date and time string for Malaysian locale
const formatNotificationTime = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

// Maps notification types to their corresponding Lucide icon components
// Returns Bell as the default fallback icon when no specific match is found
const getNotificationIcon = (type) => {
  if (type === 'packing-list') return Luggage;
  if (type === 'trip-reminder') return Plane;
  if (type === 'admin-rate-limit') return Gauge;
  if (type === 'admin-signup') return UserPlus;
  if (type === 'admin-feedback') return Star;
  if (type === 'admin-login-lock') return LockKeyhole;
  if (type === 'admin-error-log') return ShieldAlert;
  return Bell;
};

// Main notifications page component
function NotificationsPage() {
  // State for filtering notifications by read/unread status
  const [statusFilter, setStatusFilter] = useState('all');
  // Retrieves the current authenticated user from context
  const { user } = useContext(AuthContext);
  // Determines if the current user has admin privileges
  const isAdmin = user?.role === 'admin';
  // Custom hook that provides notifications data and management functions
  const {
    markAllAsRead,
    markAsRead,
    notifications,
    setSortOrder,
    sortOrder,
    unreadCount,
  } = useNotifications();
  // Memoized filtered list of notifications based on the selected status filter
  const visibleNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        if (statusFilter === 'read') return notification.isRead;
        if (statusFilter === 'unread') return !notification.isRead;
        return true;
      }),
    [notifications, statusFilter]
  );

  return (
    <section className="notifications-page">
      {/* Hero section with title, description, and summary cards */}
      <div className="notifications-hero">
        <div>
          <span className="notifications-kicker">Notifications</span>
          <h1>{isAdmin ? 'Admin Alerts' : 'Travel Alerts'}</h1>
          <p>
            {isAdmin
              ? 'Review ratings, rate limits, new signups, and system log errors in one place.'
              : 'Review trip reminders, packing list updates, and account alerts in one place.'}
          </p>
        </div>

        {/* Summary cards displaying unread count and total notifications */}
        <div className="notifications-hero-cards" aria-label="Notification summary">
          <span>
            <Mail size={18} aria-hidden="true" />
            <strong>{unreadCount}</strong>
            Unread
          </span>
          <span>
            <Clock3 size={18} aria-hidden="true" />
            <strong>{notifications.length}</strong>
            Total
          </span>
        </div>
      </div>

      {/* Header with sorting, filtering, and bulk action controls */}
      <div className="notifications-header">
        <div className="notifications-actions">
          <select
            aria-label="Sort notifications"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          >
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </select>
          <select
            aria-label="Filter notifications by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All status</option>
            <option value="unread">Unread only</option>
            <option value="read">Read only</option>
          </select>
          <button className="notifications-read-button" type="button" onClick={markAllAsRead} disabled={!unreadCount}>
            <CheckCheck size={17} aria-hidden="true" />
            Mark all read
          </button>
        </div>
      </div>

      {/* Notification list or empty state */}
      {visibleNotifications.length ? (
        <div className="notifications-list">
          {visibleNotifications.map((notification) => {
            // Determines the appropriate icon based on notification type
            const NotificationIcon = getNotificationIcon(notification.type);

            return (
              <article
                className={`notification-row ${notification.isRead ? 'is-read' : 'is-unread'}`}
                key={notification._id}
                onClick={() => {
                  if (!notification.isRead) markAsRead(notification._id);
                }}
                onKeyDown={(event) => {
                  if (!notification.isRead && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    markAsRead(notification._id);
                  }
                }}
                role={!notification.isRead ? 'button' : undefined}
                tabIndex={!notification.isRead ? 0 : undefined}
              >
                {/* Icon column */}
                <div className="notification-row-icon">
                  <NotificationIcon size={18} aria-hidden="true" />
                </div>
                {/* Main content: title, message, and optional error context */}
                <div className="notification-row-body">
                  <div className="notification-row-title">
                    <h2>{notification.title}</h2>
                  </div>
                  <p>{notification.message}</p>
                  {/* Error context metadata displayed for admin notifications */}
                  {(notification.metadata?.errorCode || notification.metadata?.requestId) && (
                    <div className="notification-error-context">
                      {notification.metadata.errorCode && (
                        <code>{notification.metadata.errorCode}</code>
                      )}
                      {notification.metadata.requestId && (
                        <span title={notification.metadata.requestId}>
                          Request ID: {notification.metadata.requestId}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {/* Timestamp and read/unread status */}
                <div className="notification-row-actions">
                  <time>{formatNotificationTime(notification.sentAt || notification.createdAt)}</time>
                  <span className={`notification-status ${notification.isRead ? 'is-read' : 'is-unread'}`}>
                    {notification.isRead ? 'Read' : 'Unread'}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        // Empty state when no notifications match the current filters
        <div className="notifications-empty">
          <Bell size={26} aria-hidden="true" />
          <h2>No notifications yet</h2>
          <p>{isAdmin ? 'Ratings, rate limits, signups, and log errors will appear here.' : 'Trip reminders and packing list alerts will appear here.'}</p>
        </div>
      )}
    </section>
  );
}

export default NotificationsPage;
