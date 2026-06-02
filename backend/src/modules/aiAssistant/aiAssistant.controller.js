/**
 * AI Assistant module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const aiAssistantService = require('./aiAssistant.service');

const chat = catchAsync(async (req, res) => {
  const reply = await aiAssistantService.chat({
    prompt: req.body.prompt,
    page: req.body.page,
  });

  sendSuccess(res, 200, { reply });
});

module.exports = { chat };
