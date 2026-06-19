/**
 * AI Assistant module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const aiAssistantService = require('./aiAssistant.service');

/**
 * Handles general AI chat requests.
 * Processes user prompts and returns AI-generated responses for travel assistance.
 * 
 * @param {Object} req - Express request object with prompt in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with AI reply
 */
const chat = catchAsync(async (req, res) => {
  const reply = await aiAssistantService.chat({
    prompt: req.body.prompt,
    page: req.body.page, // Contextual page information for better responses
  });

  sendSuccess(res, 200, { reply });
});

/**
 * Handles AI-powered trip recommendation requests.
 * Generates personalized travel recommendations based on user preferences,
 * existing trip data, planned places, and conversation history.
 * 
 * @param {Object} req - Express request object with prompt and trip context in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with recommendations array
 */
const getTripRecommendations = catchAsync(async (req, res) => {
  const recommendations = await aiAssistantService.getTripRecommendations({
    prompt: req.body.prompt, // User's request text
    trip: req.body.trip || {}, // Existing trip details for context
    plannedPlaces: req.body.plannedPlaces || [], // Places already planned for the trip
    history: req.body.history || [], // Previous conversation history for continuity
  });

  sendSuccess(res, 200, { recommendations });
});

const rankWeatherPlaces = catchAsync(async (req, res) => {
  const ranking = await aiAssistantService.rankWeatherPlaces({
    weather: req.body.weather || {},
    trip: req.body.trip || {},
    day: req.body.day || {},
    category: req.body.category || '',
    candidates: req.body.candidates || [],
  });

  sendSuccess(res, 200, { ranking });
});

module.exports = { chat, getTripRecommendations, rankWeatherPlaces };
