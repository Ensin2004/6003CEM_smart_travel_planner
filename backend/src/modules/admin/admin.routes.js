/**
 * Admin module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const { param } = require('express-validator');
const adminController = require('./admin.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');

const router = express.Router();
const objectIdRule = param('id').isMongoId().withMessage('Invalid user id');

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use(protect, restrictTo('admin'));
//  route wires  to validation, access checks, and controller logic.
router.get('/dashboard', adminController.getDashboard);
//  route wires  to validation, access checks, and controller logic.
router.get('/users', adminController.getUsers);
//  route wires  to validation, access checks, and controller logic.
router.delete('/users/:id', objectIdRule, validate, adminController.removeUser);
module.exports = router;
