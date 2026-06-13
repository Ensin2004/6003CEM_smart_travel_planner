/**
 * Categories module.
 * Business rules and category normalization live in this layer.
 */
const AppError = require('../../utils/AppError');
const categoryRepository = require('./category.repository');
const { toCategoryValue } = require('./category.utils');

const getCategories = () => categoryRepository.findAll();

const buildCategoryData = (data) => ({
  type: data.type,
  name: data.name.trim(),
  value: toCategoryValue(data.name),
});

const assertUnique = async ({ type, value }, excludedId) => {
  const duplicate = await categoryRepository.findByTypeAndValue(type, value, excludedId);
  if (duplicate) throw new AppError('A category with this name already exists for the selected type', 409);
};

const createCategory = async (data) => {
  const categoryData = buildCategoryData(data);
  await assertUnique(categoryData);
  return categoryRepository.create(categoryData);
};

const updateCategory = async (id, data) => {
  const existingCategory = await categoryRepository.findById(id);
  if (!existingCategory) throw new AppError('Category not found', 404);

  const categoryData = buildCategoryData(data);
  await assertUnique(categoryData, id);
  return categoryRepository.updateById(id, categoryData);
};

const deleteCategory = async (id) => {
  const category = await categoryRepository.deleteById(id);
  if (!category) throw new AppError('Category not found', 404);
  return category;
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
