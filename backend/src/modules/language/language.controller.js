/**
 * Language module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const languageService = require('./language.service');

/**
 * Retrieves the list of supported languages for translation.
 * Returns language codes and display names for UI selection.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with language options
 */
const getLanguages = catchAsync(async (req, res) => {
  const languageOptions = await languageService.getSupportedLanguages();
  sendSuccess(res, 200, languageOptions);
});

/**
 * Translates text from one language to another.
 * Records translation history for the user.
 * 
 * @param {Object} req - Express request object with text, source/target languages, and user info
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with translation result
 */
const translateText = catchAsync(async (req, res) => {
  const translation = await languageService.translateText({
    text: req.body.text,
    sourceLanguage: req.body.sourceLanguage,
    targetLanguage: req.body.targetLanguage,
    userId: req.user.id,
  });

  sendSuccess(res, 200, { translation });
});

/**
 * Retrieves translation history for the authenticated user.
 * Supports pagination and filtering via query parameters.
 * 
 * @param {Object} req - Express request object with user info and query params
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with history entries
 */
const getHistory = catchAsync(async (req, res) => {
  const history = await languageService.getHistory(req.user.id, req.query);
  sendSuccess(res, 200, { history });
});

/**
 * Delete History removes a record after ownership checks.
 * Deletes a translation history entry by ID with ownership verification.
 * 
 * @param {Object} req - Express request object with history ID in params and user info
 * @param {Object} res - Express response object
 * @returns {void} - Sends 204 No Content response on successful deletion
 */
const deleteHistory = catchAsync(async (req, res) => {
  await languageService.deleteHistory(req.params.id, req.user.id);
  res.status(204).send(); // No content response for successful deletion
});

module.exports = { deleteHistory, getHistory, getLanguages, translateText };