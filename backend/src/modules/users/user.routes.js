const express = require('express');
const userController = require('./user.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { updateMeRules } = require('./user.validation');

const router = express.Router();

router.get('/me', protect, userController.getMe);
router.put('/me', protect, updateMeRules, validate, userController.updateMe);

module.exports = router;
