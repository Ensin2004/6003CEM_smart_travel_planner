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

const getClientBaseUrl = () => env.clientOrigin.split(',')[0]?.trim() || 'http://localhost:5173';
const toPlainNotification = (notification) =>
  typeof notification.toJSON === 'function' ? notification.toJSON() : notification;

const getNotificationActionUrl = (notification) => {
  if (notification.metadata?.url) return `${getClientBaseUrl()}${notification.metadata.url}`;
  return `${getClientBaseUrl()}/notifications`;
};

const isNotificationAllowed = (user, type) => {
  const preferences = user.notificationPreferences || {};
  if (preferences.notificationsOff) return false;
  if (type === 'trip-reminder' && preferences.tripAlerts === false) return false;
  if (type === 'packing-list' && preferences.packingReminder === false) return false;
  if (['admin-rate-limit', 'admin-error-log', 'admin-login-lock'].includes(type) && preferences.errorLogs === false) return false;
  if (type === 'admin-signup' && preferences.systemAlerts === false) return false;
  return true;
};

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

  notification.sentAt = new Date();
  await notificationRepository.save(notification);

  const unreadCount = await notificationRepository.countUnreadByUserId(notification.userId);
  emitNotification(notification.userId.toString(), toPlainNotification(notification), unreadCount);

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

  if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
    await dispatchNotification(notification);
  }

  return notification;
};

const notifyAdmins = async ({ type = 'system', title, message, metadata = {} }) => {
  const admins = await userRepository.findActiveAdmins();
  const createdNotifications = await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin._id,
        type,
        title,
        message,
        metadata,
      })
    )
  );

  return createdNotifications.filter(Boolean);
};

const getLockedAccountLabel = async (log) => {
  if (log.metadata?.attemptedEmailMasked) return log.metadata.attemptedEmailMasked;
  if (!log.userId) return 'unknown account';

  const lockedUser = await userRepository.findById(log.userId);
  return lockedUser?.name || lockedUser?.email || log.userId.toString();
};

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

  return notifyAdmins({
    type: isLoginLock ? 'admin-login-lock' : isRateLimit ? 'admin-rate-limit' : 'admin-error-log',
    title,
    message,
    metadata: {
      url: '/admin/logging-monitoring',
      apiLogId: log._id,
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

const scheduleTripReminder = async (trip) => {
  if (!trip?.startDate || !trip?.userId) return null;

  const scheduledAt = new Date(trip.startDate);
  scheduledAt.setDate(scheduledAt.getDate() - 1);

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

const schedulePackingListReminder = async (packingList) => {
  if (!packingList?._id || !packingList?.userId) return null;

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

const cancelPackingListReminder = (packingList) => {
  if (!packingList?._id || !packingList?.userId) return null;
  return notificationRepository.deletePendingPackingListReminder(packingList._id, packingList.userId);
};

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

const cancelPackingListRemindersForTrip = async (trip) => {
  if (!trip?._id || !trip?.userId) return [];

  const packingLists = await packingListRepository.findByTripIdAndUserId(trip._id, trip.userId);
  return Promise.all(packingLists.map((packingList) => cancelPackingListReminder(packingList)));
};

const listNotifications = async (userId, sort = 'desc') => {
  const notifications = await notificationRepository.findByUserId(userId, sort === 'asc' ? 'asc' : 'desc');
  const unreadCount = await notificationRepository.countUnreadByUserId(userId);
  return { notifications, unreadCount };
};

const markNotificationRead = async (notificationId, userId) => {
  const notification = await notificationRepository.markReadByIdAndUserId(notificationId, userId);
  if (!notification) throw new AppError('Notification not found', 404);

  const unreadCount = await notificationRepository.countUnreadByUserId(userId);
  emitUnreadCount(userId, unreadCount);
  return { notification, unreadCount };
};

const markAllNotificationsRead = async (userId) => {
  await notificationRepository.markAllReadByUserId(userId);
  emitUnreadCount(userId, 0);
  return { unreadCount: 0 };
};

const processDueNotifications = async () => {
  const notifications = await notificationRepository.findDueUnsent();
  await Promise.all(notifications.map((notification) => dispatchNotification(notification)));
};

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
  notifyAdminsOfNewSignup,
  cancelPackingListReminder,
  cancelPackingListRemindersForTrip,
  processDueNotifications,
  reschedulePackingListRemindersForTrip,
  schedulePackingListReminder,
  scheduleTripReminder,
  startNotificationWorker,
};
