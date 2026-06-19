/**
 * Notification HTTP controllers.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const notificationService = require('./notification.service');

/**
 * Retrieves all notifications for the authenticated user.
 * Supports sorting by creation date.
 * 
 * @param {Object} req - Express request object with user info and sort query
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with notifications
 */
const getMyNotifications = catchAsync(async (req, res) => {
  const result = await notificationService.listNotifications(req.user.id, req.query.sort);
  sendSuccess(res, 200, result);
});

/**
 * Marks a specific notification as read for the authenticated user.
 * Verifies ownership before updating.
 * 
 * @param {Object} req - Express request object with notification ID in params and user info
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with updated notification
 */
const markNotificationRead = catchAsync(async (req, res) => {
  const result = await notificationService.markNotificationRead(req.params.id, req.user.id);
  sendSuccess(res, 200, result, 'Notification marked as read');
});

/**
 * Marks all notifications as read for the authenticated user.
 * Bulk update operation for clearing the notification list.
 * 
 * @param {Object} req - Express request object with user info
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with update result
 */
const markAllNotificationsRead = catchAsync(async (req, res) => {
  const result = await notificationService.markAllNotificationsRead(req.user.id);
  sendSuccess(res, 200, result, 'Notifications marked as read');
});

module.exports = {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
};