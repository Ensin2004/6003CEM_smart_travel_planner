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

const getTripRecommendations = catchAsync(async (req, res) => {
  const recommendations = await aiAssistantService.getTripRecommendations({
    prompt: req.body.prompt,
    trip: req.body.trip || {},
    plannedPlaces: req.body.plannedPlaces || [],
    history: req.body.history || [],
  });

  sendSuccess(res, 200, { recommendations });
});

module.exports = { chat, getTripRecommendations };
