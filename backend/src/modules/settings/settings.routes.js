const express = require('express');
const settingsController = require('./settings.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { updateContentRules } = require('./settings.validation');

const router = express.Router();

router.get('/content', protect, settingsController.getContent);
router.put('/content', protect, updateContentRules, validate, settingsController.updateContent);

module.exports = router;
