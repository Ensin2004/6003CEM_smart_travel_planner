const express = require('express');
const authController = require('./auth.controller');
const validate = require('../../middleware/validate.middleware');
const { registerRules, loginRules } = require('./auth.validation');

const router = express.Router();

router.post('/register', registerRules, validate, authController.register);
router.post('/login', loginRules, validate, authController.login);

module.exports = router;
