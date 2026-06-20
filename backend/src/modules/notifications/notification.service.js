/**
 * Notification business rules for reminders, Socket.IO, and email delivery.
 */
const env = require('../../config/env');
const logger = require('../../utils/logger');
const AppError = require('../../utils/AppError');
const { sendNotificationEmail } = require('../../utils/email.service');
const userRepository = require('../users/user.repository');
const { packingListRepository } = require('../travelTools/travelTools.repository');
const notificationRepository = require('./notification.repository');
const { emitNotification, emitUnreadCount } = require('./notification.socket');

const ADMIN_ALERT_COOLDOWNS_MS = {
  'admin-rate-limit': 60 * 60 * 1000,
  'admin-error-log': 30 * 60 * 1000,
  'admin-login-lock': 10 * 60 * 1000,
};

/**
 * Gets the client base URL from environment or falls back to localhost.
 * @returns {string} Client application base URL
 */
const getClientBaseUrl = () => env.clientOrigin.split(',')[0]?.trim() || 'http://localhost:5173';

/**
 * Normalizes volatile alert values so repeated failures group cleanly.
 * @param {string} value - Raw value
 * @returns {string} Normalized value
 */
const normalizeAlertPart = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .split('?')[0]
    .replace(/[0-9a-f]{24}/g, ':id')
    .replace(/\b\d+\b/g, ':num')
    .slice(0, 120);

/**
 * Builds a stable admin alert grouping key from an API log.
 * @param {Object} log - API log document
 * @param {string} type - Notification type
 * @returns {string} Alert grouping key
 */
const getApiLogAlertKey = (log, type) => {
  if (type === 'admin-login-lock') {
    return [
      type,
      normalizeAlertPart(log.metadata?.attemptedEmailMasked || log.userId || 'unknown-account'),
    ].join('|');
  }

  return [
    type,
    normalizeAlertPart(log.errorCode || log.statusCode || 'unknown-code'),
    normalizeAlertPart(log.service || 'system'),
    normalizeAlertPart(log.category || 'api'),
    normalizeAlertPart(log.endpoint || 'unknown-endpoint'),
  ].join('|');
};

/**
 * Converts a notification to plain object if it has a toJSON method.
 * @param {Object} notification - Notification document
 * @returns {Object} Plain notification object
 */
const toPlainNotification = (notification) =>
  typeof notification.toJSON === 'function' ? notification.toJSON() : notification;

/**
 * Generates an action URL for a notification.
 * Uses metadata.url if available, otherwise falls back to notifications list.
 * 
 * @param {Object} notification - Notification document
 * @returns {string} Full action URL
 */
const getNotificationActionUrl = (notification) => {
  if (notification.metadata?.url) return `${getClientBaseUrl()}${notification.metadata.url}`;
  return `${getClientBaseUrl()}/notifications`;
};

/**
 * Checks if a notification should be delivered based on user preferences.
 * Returns false if notifications are globally off or specific types are disabled.
 * 
 * @param {Object} user - User document with notificationPreferences
 * @param {string} type - Notification type
 * @returns {boolean} True if notification is allowed
 */
const isNotificationAllowed = (user, type) => {
  const preferences = user.notificationPreferences || {};
  if (preferences.notificationsOff) return false;
  if (type === 'trip-reminder' && preferences.tripAlerts === false) return false;
  if (type === 'packing-list' && preferences.packingReminder === false) return false;
  if (['admin-rate-limit', 'admin-error-log', 'admin-login-lock'].includes(type) && preferences.errorLogs === false) return false;
  if (type === 'admin-signup' && preferences.systemAlerts === false) return false;
  if (type === 'admin-feedback' && preferences.ratingFeedback === false) return false;
  return true;
};

/**
 * Dispatches a notification to a user via Socket.IO and email.
 * Validates user, preferences, and packing list conditions before sending.
 * 
 * @param {Object} notification - Notification document to dispatch
 * @returns {Promise<Object|null>} Dispatched notification or null if skipped
 */
const dispatchNotification = async (notification) => {
  const user = await userRepository.findById(notification.userId);
  if (!user) {
    await notificationRepository.deleteById(notification._id);
    return null;
  }

  if (!isNotificationAllowed(user, notification.type)) {
    await notificationRepository.deleteById(notification._id);
    return null;
  }

  // Special validation for packing list reminders
  if (notification.type === 'packing-list') {
    const packingListId = notification.metadata?.packingListId;
    const packingList = packingListId
      ? await packingListRepository.findByIdAndUserId(packingListId, notification.userId)
      : null;
    const hasUnpackedItems = packingList?.items?.some((item) => !item.isPacked);
    const expectedScheduledAt = packingList?.tripStartDate
      ? new Date(packingList.tripStartDate)
      : null;
    if (expectedScheduledAt) {
      expectedScheduledAt.setDate(
        expectedScheduledAt.getDate() - (packingList.reminder?.daysBeforeTrip ?? 2)
      );
    }
    const hasCurrentSchedule =
      expectedScheduledAt &&
      notification.scheduledAt &&
      expectedScheduledAt.getTime() === new Date(notification.scheduledAt).getTime();

    // Delete notification if packing list conditions are not met
    if (
      !packingList ||
      !packingList.tripId ||
      !packingList.tripStartDate ||
      packingList.reminder?.enabled === false ||
      !hasUnpackedItems ||
      !hasCurrentSchedule
    ) {
      await notificationRepository.deleteById(notification._id);
      return null;
    }
  }

  // Mark as sent and save
  notification.sentAt = new Date();
  await notificationRepository.save(notification);

  // Emit via Socket.IO with updated unread count
  const unreadCount = await notificationRepository.countUnreadByUserId(notification.userId);
  emitNotification(notification.userId.toString(), toPlainNotification(notification), unreadCount);

  // Send email notification (best effort)
  try {
    await sendNotificationEmail({
      to: user.email,
      name: user.name,
      title: notification.title,
      message: notification.message,
      actionUrl: getNotificationActionUrl(notification),
    });
  } catch (error) {
    logger.warn(`Notification email failed for ${user.email}: ${error.message}`);
  }

  return notification;
};

/**
 * Creates a new notification and dispatches it immediately or schedules it.
 * @param {Object} params - Notification parameters
 * @param {string} params.userId - Recipient user ID
 * @param {string} params.tripId - Optional trip reference
 * @param {string} params.type - Notification type
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {Date} params.scheduledAt - Schedule time (optional)
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object|null>} Created notification or null if not allowed
 */
const createNotification = async ({ userId, tripId, type = 'system', title, message, scheduledAt, metadata = {} }) => {
  const user = await userRepository.findById(userId);
  if (!user || !isNotificationAllowed(user, type)) return null;

  const notification = await notificationRepository.create({
    userId,
    tripId,
    type,
    title,
    message,
    scheduledAt: scheduledAt || new Date(),
    metadata,
  });

  // Dispatch immediately if scheduled time is now or in the past
  if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
    await dispatchNotification(notification);
  }

  return notification;
};

/**
 * Notifies all active admin users about a system event.
 * @param {Object} params - Notification parameters
 * @param {string} params.type - Notification type (admin-*)
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Array>} Created notifications
 */
const notifyAdmins = async ({ type = 'system', title, message, metadata = {}, cooldownMs = 0 }) => {
  const admins = await userRepository.findActiveAdmins();
  const createdNotifications = await Promise.all(
    admins.map(async (admin) => {
      if (metadata.alertKey && cooldownMs > 0) {
        const existingAlert = await notificationRepository.findRecentAdminAlert({
          userId: admin._id,
          type,
          alertKey: metadata.alertKey,
          since: new Date(Date.now() - cooldownMs),
        });

        if (existingAlert) {
          await notificationRepository.recordAdminAlertDuplicate(existingAlert._id, {
            apiLogId: metadata.apiLogId,
            requestId: metadata.requestId,
            message,
          });
          return null;
        }
      }

      return createNotification({
        userId: admin._id,
        type,
        title,
        message,
        metadata: metadata.alertKey
          ? {
              ...metadata,
              alertFirstSeenAt: new Date(),
              alertLastSeenAt: new Date(),
              suppressedCount: 0,
            }
          : metadata,
      });
    })
  );

  return createdNotifications.filter(Boolean);
};

/**
 * Gets a readable label for a locked account.
 * @param {Object} log - API log document
 * @returns {Promise<string>} Account label
 */
const getLockedAccountLabel = async (log) => {
  if (log.metadata?.attemptedEmailMasked) return log.metadata.attemptedEmailMasked;
  if (!log.userId) return 'unknown account';

  const lockedUser = await userRepository.findById(log.userId);
  return lockedUser?.name || lockedUser?.email || log.userId.toString();
};

/**
 * Notifies admins about API log events (rate limits, errors, lockouts).
 * @param {Object} log - API log document
 * @returns {Promise<Array>} Created notifications
 */
const notifyAdminsOfApiLog = async (log) => {
  const { errorCode, requestId } = log;
  const isRateLimit = errorCode === 'RATE_LIMIT_EXCEEDED';
  const isLoginLock = errorCode === 'ACCOUNT_LOCKED';
  const isError = log.status === 'error' || ['error', 'critical'].includes(log.severity);

  if (!isRateLimit && !isLoginLock && !isError) return Promise.resolve([]);

  const title = isLoginLock
    ? 'Account Lockout Alert'
    : isRateLimit
      ? 'Rate limit alert'
      : `System error${errorCode ? `: ${errorCode}` : ''}`;
  const statusText = log.statusCode ? ` (${log.statusCode})` : '';
  const endpointText = log.endpoint ? ` on ${log.endpoint}` : '';
  const codeText = errorCode ? ` [${errorCode}]` : '';
  const requestText = requestId ? ` Request ID: ${requestId}.` : '';
  const lockedAccount = isLoginLock ? await getLockedAccountLabel(log) : null;
  const message = isLoginLock
    ? `A user account (${lockedAccount}) was locked after repeated failed login attempts.${requestText} Review the authentication logs for possible brute-force activity.`
    : `${log.service || 'System'}${endpointText} recorded ${log.category || 'api'} ${log.status || 'event'}${statusText}${codeText}: ${log.message || 'No message recorded'}.${requestText}`;

  const type = isLoginLock ? 'admin-login-lock' : isRateLimit ? 'admin-rate-limit' : 'admin-error-log';

  return notifyAdmins({
    type,
    title,
    message,
    cooldownMs: ADMIN_ALERT_COOLDOWNS_MS[type],
    metadata: {
      url: '/admin/logging-monitoring',
      apiLogId: log._id,
      alertKey: getApiLogAlertKey(log, type),
      category: log.category,
      severity: log.severity,
      status: log.status,
      statusCode: log.statusCode,
      errorCode,
      requestId,
      service: log.service,
      endpoint: log.endpoint,
    },
  });
};

/**
 * Notifies admins of a new user signup.
 * @param {Object} user - User document
 * @returns {Promise<Array>} Created notifications
 */
const notifyAdminsOfNewSignup = (user) =>
  notifyAdmins({
    type: 'admin-signup',
    title: 'New user signup',
    message: `${user.name} (${user.email}) created a traveller account.`,
    metadata: {
      url: '/admin/users',
      userId: user._id,
      email: user.email,
    },
  });

/**
 * Notifies admins of new feedback submission.
 * @param {Object} feedback - Feedback document
 * @returns {Promise<Array>} Created notifications
 */
const notifyAdminsOfNewFeedback = (feedback) =>
  notifyAdmins({
    type: 'admin-feedback',
    title: 'New rating submitted',
    message: `${feedback.userName} submitted a ${feedback.rating}-star rating${feedback.feedback ? ' with feedback' : ''}.`,
    metadata: {
      url: '/admin/settings?section=feedback',
      feedbackId: feedback._id,
      userId: feedback.userId,
      rating: feedback.rating,
    },
  });

/**
 * Schedules a trip reminder notification.
 * Deletes existing pending reminder before creating new one.
 * 
 * @param {Object} trip - Trip document
 * @returns {Promise<Object|null>} Created notification or null
 */
const scheduleTripReminder = async (trip) => {
  if (!trip?.startDate || !trip?.userId) return null;

  const scheduledAt = new Date(trip.startDate);
  scheduledAt.setDate(scheduledAt.getDate() - 1);

  // Delete any existing pending trip reminder
  await notificationRepository.deletePendingByTripAndType(trip._id, trip.userId, 'trip-reminder');

  return createNotification({
    userId: trip.userId,
    tripId: trip._id,
    type: 'trip-reminder',
    title: 'Trip Reminder',
    message: `Your trip ${trip.title || trip.destination} starts on ${new Date(trip.startDate).toLocaleDateString('en-MY')}. Review your itinerary and final details before you go.`,
    scheduledAt,
    metadata: { url: `/trips/${trip._id}` },
  });
};

/**
 * Schedules a packing list reminder.
 * Validates packing list conditions before creating notification.
 * 
 * @param {Object} packingList - Packing list document
 * @returns {Promise<Object|null>} Created notification or null
 */
const schedulePackingListReminder = async (packingList) => {
  if (!packingList?._id || !packingList?.userId) return null;

  // Delete existing pending reminder for this packing list
  await notificationRepository.deletePendingPackingListReminder(packingList._id, packingList.userId);

  const unpackedCount = packingList.items?.filter((item) => !item.isPacked).length || 0;
  if (
    !packingList.tripId ||
    !packingList.tripStartDate ||
    packingList.reminder?.enabled === false ||
    !unpackedCount
  ) {
    return null;
  }

  const tripDestination = packingList.destination || 'your destination';
  const daysBeforeTrip = packingList.reminder?.daysBeforeTrip ?? 2;
  const scheduledAt = new Date(packingList.tripStartDate);
  scheduledAt.setDate(scheduledAt.getDate() - daysBeforeTrip);

  // Packing-list edits can happen after the reminder window has already passed.
  // In that case, keep the list saved quietly instead of creating a new immediate notification on every action.
  if (scheduledAt <= new Date()) return null;

  return createNotification({
    userId: packingList.userId,
    tripId: packingList.tripId,
    type: 'packing-list',
    title: 'Packing List Reminder',
    message: `There are still unpacked items in your packing list ${packingList.title}, please check your items before the trip to ${tripDestination}.`,
    scheduledAt,
    metadata: { url: '/packing-lists', packingListId: packingList._id },
  });
};

/**
 * Cancels pending packing list reminders.
 * @param {Object} packingList - Packing list document
 * @returns {Promise<Object>} Delete operation result
 */
const cancelPackingListReminder = (packingList) => {
  if (!packingList?._id || !packingList?.userId) return null;
  return notificationRepository.deletePendingPackingListReminder(packingList._id, packingList.userId);
};

/**
 * Reschedules packing list reminders for all lists in a trip.
 * @param {Object} trip - Trip document
 * @returns {Promise<Array>} Created notifications
 */
const reschedulePackingListRemindersForTrip = async (trip) => {
  if (!trip?._id || !trip?.userId) return [];

  const packingLists = await packingListRepository.findByTripIdAndUserId(trip._id, trip.userId);
  return Promise.all(
    packingLists.map(async (packingList) => {
      packingList.destination = trip.destination;
      packingList.tripStartDate = trip.startDate;
      packingList.tripEndDate = trip.endDate;
      const savedPackingList = await packingListRepository.save(packingList);
      return schedulePackingListReminder(savedPackingList);
    })
  );
};

/**
 * Cancels all packing list reminders for a trip.
 * @param {Object} trip - Trip document
 * @returns {Promise<Array>} Delete results
 */
const cancelPackingListRemindersForTrip = async (trip) => {
  if (!trip?._id || !trip?.userId) return [];

  const packingLists = await packingListRepository.findByTripIdAndUserId(trip._id, trip.userId);
  return Promise.all(packingLists.map((packingList) => cancelPackingListReminder(packingList)));
};

/**
 * Lists notifications for a user with unread count.
 * @param {string} userId - User ID
 * @param {string} sort - Sort direction ('asc' or 'desc')
 * @returns {Promise<Object>} Notifications and unread count
 */
const listNotifications = async (userId, sort = 'desc') => {
  const notifications = await notificationRepository.findByUserId(userId, sort === 'asc' ? 'asc' : 'desc');
  const unreadCount = await notificationRepository.countUnreadByUserId(userId);
  return { notifications, unreadCount };
};

/**
 * Marks a single notification as read.
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID for ownership verification
 * @returns {Promise<Object>} Updated notification and unread count
 * @throws {AppError} If notification not found
 */
const markNotificationRead = async (notificationId, userId) => {
  const notification = await notificationRepository.markReadByIdAndUserId(notificationId, userId);
  if (!notification) throw new AppError('Notification not found', 404);

  const unreadCount = await notificationRepository.countUnreadByUserId(userId);
  emitUnreadCount(userId, unreadCount);
  return { notification, unreadCount };
};

/**
 * Marks all notifications as read for a user.
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated unread count
 */
const markAllNotificationsRead = async (userId) => {
  await notificationRepository.markAllReadByUserId(userId);
  emitUnreadCount(userId, 0);
  return { unreadCount: 0 };
};

/**
 * Processes all due unsent notifications.
 * Used by the notification worker to deliver scheduled notifications.
 * @returns {Promise<void>}
 */
const processDueNotifications = async () => {
  const notifications = await notificationRepository.findDueUnsent();
  await Promise.all(notifications.map((notification) => dispatchNotification(notification)));
};

/**
 * Starts the notification worker that processes due notifications every minute.
 * @returns {NodeJS.Timeout} Interval handle
 */
const startNotificationWorker = () => {
  processDueNotifications().catch((error) => logger.warn(`Notification worker failed: ${error.message}`));
  return setInterval(() => {
    processDueNotifications().catch((error) => logger.warn(`Notification worker failed: ${error.message}`));
  }, 60 * 1000);
};

module.exports = {
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifyAdminsOfApiLog,
  notifyAdminsOfNewFeedback,
  notifyAdminsOfNewSignup,
  cancelPackingListReminder,
  cancelPackingListRemindersForTrip,
  processDueNotifications,
  reschedulePackingListRemindersForTrip,
  schedulePackingListReminder,
  scheduleTripReminder,
  startNotificationWorker,
};
