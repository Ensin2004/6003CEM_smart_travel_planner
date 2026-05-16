const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const settingsService = require('./settings.service');

const getContent = catchAsync(async (req, res) => {
  const content = await settingsService.getContent();
  sendSuccess(res, 200, { content });
});

const updateContent = catchAsync(async (req, res) => {
  const content = await settingsService.updateContent(req.user.role, req.body);
  sendSuccess(res, 200, { content }, 'Settings content updated');
});

module.exports = { getContent, updateContent };
