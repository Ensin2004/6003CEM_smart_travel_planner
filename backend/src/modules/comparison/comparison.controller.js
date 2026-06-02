/**
 * Comparison controller.
 * Request handlers read HTTP data, call the service, and return response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const comparisonService = require('./comparison.service');

const recommendBestPlace = catchAsync(async (req, res) => {
  const recommendation = comparisonService.getRecommendation({
    items: req.body.items,
    context: req.body.context,
  });

  sendSuccess(res, 200, { recommendation }, 'Comparison recommendation ready');
});

module.exports = {
  recommendBestPlace,
};
