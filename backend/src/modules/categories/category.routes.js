/**
 * Categories module.
 * Reading is available to signed-in users; writes require an administrator.
 */
const express = require('express');
const categoryController = require('./category.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const { categoryRules, categoryIdRule } = require('./category.validation');

const router = express.Router();

/**
 * GET / - Retrieves all categories.
 * Available to any authenticated user (no admin role required).
 * 
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. categoryController.getCategories - Route handler
 */
router.get('/', protect, categoryController.getCategories);

/**
 * POST / - Creates a new category.
 * Admin-only operation. Validates request body before creation.
 * 
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. restrictTo('admin') - Admin role verification
 * 3. categoryRules - Request body validation
 * 4. validate - Validation result processing
 * 5. categoryController.createCategory - Route handler
 */
router.post('/', protect, restrictTo('admin'), categoryRules, validate, categoryController.createCategory);

/**
 * PUT /:id - Updates an existing category by ID.
 * Admin-only operation. Validates both ID parameter and request body.
 * 
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. restrictTo('admin') - Admin role verification
 * 3. categoryIdRule - URL parameter validation (MongoDB ObjectId)
 * 4. categoryRules - Request body validation
 * 5. validate - Validation result processing
 * 6. categoryController.updateCategory - Route handler
 */
router.put(
  '/:id',
  protect,
  restrictTo('admin'),
  categoryIdRule,
  categoryRules,
  validate,
  categoryController.updateCategory
);

/**
 * DELETE /:id - Deletes a category by ID.
 * Admin-only operation. Validates ID parameter before deletion.
 * 
 * Middleware chain:
 * 1. protect - Authentication verification
 * 2. restrictTo('admin') - Admin role verification
 * 3. categoryIdRule - URL parameter validation (MongoDB ObjectId)
 * 4. validate - Validation result processing
 * 5. categoryController.deleteCategory - Route handler
 */
router.delete(
  '/:id',
  protect,
  restrictTo('admin'),
  categoryIdRule,
  validate,
  categoryController.deleteCategory
);

module.exports = router;