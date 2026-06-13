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

router.get('/', protect, categoryController.getCategories);
router.post('/', protect, restrictTo('admin'), categoryRules, validate, categoryController.createCategory);
router.put(
  '/:id',
  protect,
  restrictTo('admin'),
  categoryIdRule,
  categoryRules,
  validate,
  categoryController.updateCategory
);
router.delete(
  '/:id',
  protect,
  restrictTo('admin'),
  categoryIdRule,
  validate,
  categoryController.deleteCategory
);

module.exports = router;
