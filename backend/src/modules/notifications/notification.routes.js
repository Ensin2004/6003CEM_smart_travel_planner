/**
 * Notification routes.
 */
const express = require('express');
const { param, query } = require('express-validator');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const notificationController = require('./notification.controller');

const router = express.Router();

// Apply authentication to all notification routes
router.use(protect);

/**
 * GET / - Retrieves all notifications for the authenticated user.
 * Supports optional sorting by creation date.
 * 
 * Middleware chain:
 * 1. query('sort') - Optional sort direction validation (asc or desc)
 * 2. validate - Validation result processing
 * 3. notificationController.getMyNotifications - Route handler
 */
router.get(
  '/',
  query('sort').optional().isIn(['asc', 'desc']).withMessage('Sort must be asc or desc'),
  validate,
  notificationController.getMyNotifications
);

/**
 * PATCH /read-all - Marks all notifications as read for the authenticated user.
 * Bulk update operation with no validation required.
 * 
 * Middleware chain:
 * 1. notificationController.markAllNotificationsRead - Route handler
 */
router.patch('/read-all', notificationController.markAllNotificationsRead);

/**
 * PATCH /:id/read - Marks a specific notification as read.
 * Validates notification ID parameter before updating.
 * 
 * Middleware chain:
 * 1. param('id') - URL parameter validation (MongoDB ObjectId)
 * 2. validate - Validation result processing
 * 3. notificationController.markNotificationRead - Route handler
 */
router.patch(
  '/:id/read',
  param('id').isMongoId().withMessage('Notification id is invalid'),
  validate,
  notificationController.markNotificationRead
);

module.exports = router;