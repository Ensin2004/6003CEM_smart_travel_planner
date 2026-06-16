/**
 * Comparison controller.
 * Request handlers read HTTP data, call the service, and return response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const comparisonService = require('./comparison.service');

/**
 * Generates a recommendation for the best place among compared items.
 * Compares multiple places based on user preferences and context.
 * 
 * @param {Object} req - Express request object with items and context in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with recommendation
 */
const recommendBestPlace = catchAsync(async (req, res) => {
  const recommendation = comparisonService.getRecommendation({
    items: req.body.items, // Array of places to compare
    context: req.body.context, // User preferences and trip context
  });

  sendSuccess(res, 200, { recommendation }, 'Comparison recommendation ready');
});

module.exports = {
  recommendBestPlace,
};