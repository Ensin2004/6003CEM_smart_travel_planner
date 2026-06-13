/**
 * Notification HTTP controllers.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const notificationService = require('./notification.service');

const getMyNotifications = catchAsync(async (req, res) => {
  const result = await notificationService.listNotifications(req.user.id, req.query.sort);
  sendSuccess(res, 200, result);
});

const markNotificationRead = catchAsync(async (req, res) => {
  const result = await notificationService.markNotificationRead(req.params.id, req.user.id);
  sendSuccess(res, 200, result, 'Notification marked as read');
});

const markAllNotificationsRead = catchAsync(async (req, res) => {
  const result = await notificationService.markAllNotificationsRead(req.user.id);
  sendSuccess(res, 200, result, 'Notifications marked as read');
});

module.exports = {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
};
