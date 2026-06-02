/**
 * Language module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const languageService = require('./language.service');
const getLanguages = catchAsync(async (req, res) => {
  const languageOptions = await languageService.getSupportedLanguages();
  sendSuccess(res, 200, languageOptions);
});
const translateText = catchAsync(async (req, res) => {
  const translation = await languageService.translateText({
    text: req.body.text,
    sourceLanguage: req.body.sourceLanguage,
    targetLanguage: req.body.targetLanguage,
    userId: req.user.id,
  });

  sendSuccess(res, 200, { translation });
});
const getHistory = catchAsync(async (req, res) => {
  const history = await languageService.getHistory(req.user.id, req.query);
  sendSuccess(res, 200, { history });
});
// Delete History removes a record after ownership checks.
const deleteHistory = catchAsync(async (req, res) => {
  await languageService.deleteHistory(req.params.id, req.user.id);
  res.status(204).send();
});
module.exports = { deleteHistory, getHistory, getLanguages, translateText };
