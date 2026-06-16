/**
 * Categories module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const { emitCategoriesUpdated } = require('../notifications/notification.socket');
const categoryService = require('./category.service');

/**
 * Retrieves all categories from the system.
 * Returns the complete list of travel categories for frontend display.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with categories array
 */
const getCategories = catchAsync(async (req, res) => {
  const categories = await categoryService.getCategories();
  sendSuccess(res, 200, { categories });
});

/**
 * Creates a new category.
 * Emits socket event to notify connected clients of the new category.
 * 
 * @param {Object} req - Express request object with category data in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with created category
 */
const createCategory = catchAsync(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  emitCategoriesUpdated('created', category);
  sendSuccess(res, 201, { category }, 'Category created');
});

/**
 * Updates an existing category by ID.
 * Emits socket event to notify connected clients of the update.
 * 
 * @param {Object} req - Express request object with category ID in params and update data in body
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with updated category
 */
const updateCategory = catchAsync(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  emitCategoriesUpdated('updated', category);
  sendSuccess(res, 200, { category }, 'Category updated');
});

/**
 * Deletes a category by ID.
 * Emits socket event to notify connected clients of the deletion.
 * 
 * @param {Object} req - Express request object with category ID in params
 * @param {Object} res - Express response object
 * @returns {void} - Sends success response with deleted category reference
 */
const deleteCategory = catchAsync(async (req, res) => {
  const category = await categoryService.deleteCategory(req.params.id);
  emitCategoriesUpdated('deleted', category);
  sendSuccess(res, 200, { category }, 'Category deleted');
});

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };