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

// Validation rule for user ID parameter in URL
// Ensures the ID is a valid MongoDB ObjectId format
const objectIdRule = param('id').isMongoId().withMessage('Invalid user id');

// Route section connects URL patterns with validation, authentication, and controller actions.
// Apply authentication and admin role restriction to all routes in this router
router.use(protect, restrictTo('admin'));

// GET /dashboard - Retrieves administrative dashboard metrics and statistics
// route wires endpoint to validation, access checks, and controller logic.
router.get('/dashboard', adminController.getDashboard);

// GET /users - Retrieves all users in the system for administrative management
// route wires endpoint to validation, access checks, and controller logic.
router.get('/users', adminController.getUsers);

// DELETE /users/:id - Removes a specific user account by ID
// Applies ObjectId validation, runs validation middleware, then passes to controller
// route wires endpoint to validation, access checks, and controller logic.
router.delete('/users/:id', objectIdRule, validate, adminController.removeUser);

module.exports = router;