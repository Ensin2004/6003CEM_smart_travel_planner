const express = require('express');
const languageController = require('./language.controller');
const { protect } = require('../../middleware/auth.middleware');
const { thirdPartyApiRateLimit } = require('../../middleware/rateLimit.middleware');
const validate = require('../../middleware/validate.middleware');
const { historyIdRules, historyQueryRules, translateRules } = require('./language.validation');

const router = express.Router();

router.get('/languages', protect, languageController.getLanguages);
router.get('/history', protect, historyQueryRules, validate, languageController.getHistory);
router.post('/translate', protect, thirdPartyApiRateLimit, translateRules, validate, languageController.translateText);
router.delete('/history/:id', protect, historyIdRules, validate, languageController.deleteHistory);

module.exports = router;
