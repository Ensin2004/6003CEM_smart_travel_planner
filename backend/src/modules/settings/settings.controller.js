/**
 * Settings module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const { emitSettingsContentUpdated } = require('../notifications/notification.socket');
const settingsService = require('./settings.service');

/**
 * Retrieves the current settings content.
 * Public endpoint - no authentication required for reading settings.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with settings content
 */
const getContent = catchAsync(async (req, res) => {
  const content = await settingsService.getContent();
  sendSuccess(res, 200, { content });
});

/**
 * Update Content applies allowed changes to an existing record.
 * Updates settings content with admin authorization.
 * Emits socket event to notify connected clients of the update.
 * 
 * @param {Object} req - Express request object with user role and body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with updated content
 */
const updateContent = catchAsync(async (req, res) => {
  const content = await settingsService.updateContent(req.user.role, req.body);
  emitSettingsContentUpdated(content);
  sendSuccess(res, 200, { content }, 'Settings content updated');
});

module.exports = { getContent, updateContent };