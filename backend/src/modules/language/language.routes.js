/**
 * Language module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const languageController = require('./language.controller');
const { protect } = require('../../middleware/auth.middleware');
const { thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');
const validate = require('../../middleware/validate.middleware');
const { historyIdRules, historyQueryRules, translateRules } = require('./language.validation');

const router = express.Router();
//  route wires  to validation, access checks, and controller logic.
router.get('/languages', protect, languageController.getLanguages);
//  route wires  to validation, access checks, and controller logic.
router.get('/history', protect, historyQueryRules, validate, languageController.getHistory);
//  route wires  to validation, access checks, and controller logic.
router.post('/translate', protect, thirdPartyApiRateLimit, translateRules, validate, languageController.translateText);
//  route wires  to validation, access checks, and controller logic.
router.delete('/history/:id', protect, historyIdRules, validate, languageController.deleteHistory);
module.exports = router;
