/**
 * Categories module.
 * Business rules and category normalization live in this layer.
 */
const AppError = require('../../utils/AppError');
const categoryRepository = require('./category.repository');
const { toCategoryValue } = require('./category.utils');

/**
 * Retrieves all categories from the repository.
 * Returns categories sorted by type and name.
 * 
 * @returns {Promise<Array>} Array of all category documents
 */
const getCategories = () => categoryRepository.findAll();

/**
 * Builds a normalized category data object from input.
 * Converts the display name to a lowercase value for consistent matching.
 * 
 * @param {Object} data - Raw category input data
 * @param {string} data.type - Category type (hotel, attraction, food)
 * @param {string} data.name - Display name of the category
 * @returns {Object} Normalized category data with type, name, and value
 */
const buildCategoryData = (data) => ({
  type: data.type,
  name: data.name.trim(),
  value: toCategoryValue(data.name), // Convert name to lowercase value for internal use
});

/**
 * Asserts that a category with the same type and value does not exist.
 * Used to enforce uniqueness within a category type.
 * 
 * @param {Object} params - Category parameters
 * @param {string} params.type - Category type
 * @param {string} params.value - Category value
 * @param {string} excludedId - Optional category ID to exclude from check (for updates)
 * @throws {AppError} If duplicate category exists with status 409
 */
const assertUnique = async ({ type, value }, excludedId) => {
  const duplicate = await categoryRepository.findByTypeAndValue(type, value, excludedId);
  if (duplicate) throw new AppError('A category with this name already exists for the selected type', 409);
};

/**
 * Creates a new category.
 * Normalizes input data and checks for uniqueness before creation.
 * 
 * @param {Object} data - Category creation data
 * @returns {Promise<Object>} Created category document
 * @throws {AppError} If category name already exists for the type
 */
const createCategory = async (data) => {
  const categoryData = buildCategoryData(data);
  await assertUnique(categoryData);
  return categoryRepository.create(categoryData);
};

/**
 * Updates an existing category by ID.
 * Normalizes input data, checks uniqueness excluding the current ID.
 * 
 * @param {string} id - Category ID to update
 * @param {Object} data - Updated category data
 * @returns {Promise<Object>} Updated category document
 * @throws {AppError} If category not found or name already exists for the type
 */
const updateCategory = async (id, data) => {
  const existingCategory = await categoryRepository.findById(id);
  if (!existingCategory) throw new AppError('Category not found', 404);

  const categoryData = buildCategoryData(data);
  await assertUnique(categoryData, id); // Exclude current ID from duplicate check
  return categoryRepository.updateById(id, categoryData);
};

/**
 * Deletes a category by ID.
 * 
 * @param {string} id - Category ID to delete
 * @returns {Promise<Object>} Deleted category document
 * @throws {AppError} If category not found
 */
const deleteCategory = async (id) => {
  const category = await categoryRepository.deleteById(id);
  if (!category) throw new AppError('Category not found', 404);
  return category;
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };