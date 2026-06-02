/**
 * Settings module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const settingsController = require('./settings.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { updateContentRules } = require('./settings.validation');

const router = express.Router();
//  route wires  to validation, access checks, and controller logic.
router.get('/content', protect, settingsController.getContent);
//  route wires  to validation, access checks, and controller logic.
router.put('/content', protect, updateContentRules, validate, settingsController.updateContent);
module.exports = router;
