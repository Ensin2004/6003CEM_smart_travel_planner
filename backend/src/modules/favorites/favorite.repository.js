/**
 * Favorites module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const Favorite = require('./favorite.model');

/**
 * Creates a new favorite document.
 * @param {Object} data - Favorite data to store
 * @returns {Promise<Object>} Created favorite document
 */
const create = (data) => Favorite.create(data);

/**
 * Retrieves all favorites for a specific user.
 * Sorted by creation date (newest first).
 * 
 * @param {string} userId - User ID to fetch favorites for
 * @returns {Promise<Array>} Array of favorite documents
 */
const findByUserId = (userId) => Favorite.find({ userId }).sort({ createdAt: -1 });

/**
 * Finds an existing favorite by user, type, and either externalId or title.
 * Used to prevent duplicate favorites with same external ID or title.
 * 
 * @param {Object} params - Search parameters
 * @param {string} params.userId - User ID
 * @param {string} params.type - Favorite type (hotel, attraction, etc.)
 * @param {string} params.externalId - External identifier from source API
 * @param {string} params.title - Title of the favorite
 * @returns {Promise<Object|null>} Matching favorite or null
 */
const findExisting = ({ userId, type, externalId, title }) =>
  Favorite.findOne({
    userId,
    type,
    $or: [{ externalId }, { title }], // Match either externalId OR title
  });

/**
 * Trip favourites use a stable external id so ordinary saved locations with the same title remain separate.
 * Finds a favorite by user, type, and externalId (exact match).
 * 
 * @param {Object} params - Search parameters
 * @param {string} params.userId - User ID
 * @param {string} params.type - Favorite type
 * @param {string} params.externalId - External identifier
 * @returns {Promise<Object|null>} Matching favorite or null
 */
const findByUserIdTypeAndExternalId = ({ userId, type, externalId }) =>
  Favorite.findOne({ userId, type, externalId });

/**
 * Delete By Id And User Id removes a record after ownership checks.
 * Deletes a favorite only if it belongs to the specified user.
 * 
 * @param {string} id - Favorite ID to delete
 * @param {string} userId - User ID for ownership verification
 * @returns {Promise<Object|null>} Deleted document or null if not found
 */
const deleteByIdAndUserId = (id, userId) => Favorite.findOneAndDelete({ _id: id, userId });

module.exports = {
  create,
  deleteByIdAndUserId,
  findByUserId,
  findByUserIdTypeAndExternalId,
  findExisting,
};