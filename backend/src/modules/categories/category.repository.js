/**
 * Categories module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const Category = require('./category.model');

/**
 * Retrieves all categories sorted by type and name.
 * Provides consistent ordering for admin management and client display.
 * 
 * @returns {Promise<Array>} Array of all category documents sorted by type then name
 */
const findAll = () =>
  Category.find()
    .collation({ locale: 'en', strength: 2, numericOrdering: true })
    .sort({ type: 1, name: 1 });

/**
 * Finds a category by its MongoDB ObjectId.
 * 
 * @param {string} id - Category ID
 * @returns {Promise<Object|null>} Category document or null if not found
 */
const findById = (id) => Category.findById(id);

/**
 * Finds a category by type and value with optional exclusion.
 * Used for uniqueness validation when creating or updating categories.
 * 
 * @param {string} type - Category type (hotel, attraction, food)
 * @param {string} value - Category value (lowercase string)
 * @param {string} excludedId - Optional category ID to exclude from the query
 * @returns {Promise<Object|null>} Category document or null if not found
 */
const findByTypeAndValue = (type, value, excludedId) =>
  Category.findOne({
    type,
    value,
    ...(excludedId ? { _id: { $ne: excludedId } } : {}), // Exclude specified ID when provided
  });

/**
 * Creates a new category.
 * 
 * @param {Object} data - Category data (type, name, value)
 * @returns {Promise<Object>} Created category document
 */
const create = (data) => Category.create(data);

/**
 * Updates an existing category by ID.
 * Returns the updated document with validation applied.
 * 
 * @param {string} id - Category ID to update
 * @param {Object} data - Updated category data
 * @returns {Promise<Object|null>} Updated category document or null if not found
 */
const updateById = (id, data) =>
  Category.findByIdAndUpdate(id, data, {
    new: true, // Return the updated document
    runValidators: true, // Apply schema validation on update
  });

/**
 * Deletes a category by ID.
 * 
 * @param {string} id - Category ID to delete
 * @returns {Promise<Object|null>} Deleted category document or null if not found
 */
const deleteById = (id) => Category.findByIdAndDelete(id);

module.exports = {
  findAll,
  findById,
  findByTypeAndValue,
  create,
  updateById,
  deleteById,
};
