/**
 * Settings module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const settingsService = require('./settings.service');
const getContent = catchAsync(async (req, res) => {
  const content = await settingsService.getContent();
  sendSuccess(res, 200, { content });
});
// Update Content applies allowed changes to an existing record.
const updateContent = catchAsync(async (req, res) => {
  const content = await settingsService.updateContent(req.user.role, req.body);
  sendSuccess(res, 200, { content }, 'Settings content updated');
});
module.exports = { getContent, updateContent };
