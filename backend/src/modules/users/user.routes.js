/**
 * Users module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const userController = require('./user.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { updateMeRules, changePasswordRules } = require('./user.validation');

const router = express.Router();
//  route wires  to validation, access checks, and controller logic.
router.get('/me', protect, userController.getMe);
//  route wires  to validation, access checks, and controller logic.
router.put('/me', protect, updateMeRules, validate, userController.updateMe);
//  route wires  to validation, access checks, and controller logic.
router.put('/me/password', protect, changePasswordRules, validate, userController.changePassword);
module.exports = router;
