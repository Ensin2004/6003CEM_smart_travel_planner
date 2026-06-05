/**
 * Notification routes.
 */
const express = require('express');
const { param, query } = require('express-validator');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const notificationController = require('./notification.controller');

const router = express.Router();

router.use(protect);

router.get(
  '/',
  query('sort').optional().isIn(['asc', 'desc']).withMessage('Sort must be asc or desc'),
  validate,
  notificationController.getMyNotifications
);
router.patch('/read-all', notificationController.markAllNotificationsRead);
router.patch(
  '/:id/read',
  param('id').isMongoId().withMessage('Notification id is invalid'),
  validate,
  notificationController.markNotificationRead
);

module.exports = router;
