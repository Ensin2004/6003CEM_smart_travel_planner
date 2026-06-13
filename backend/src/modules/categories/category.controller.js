/**
 * Categories module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const categoryService = require('./category.service');

const getCategories = catchAsync(async (req, res) => {
  const categories = await categoryService.getCategories();
  sendSuccess(res, 200, { categories });
});

const createCategory = catchAsync(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  sendSuccess(res, 201, { category }, 'Category created');
});

const updateCategory = catchAsync(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  sendSuccess(res, 200, { category }, 'Category updated');
});

const deleteCategory = catchAsync(async (req, res) => {
  const category = await categoryService.deleteCategory(req.params.id);
  sendSuccess(res, 200, { category }, 'Category deleted');
});

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
