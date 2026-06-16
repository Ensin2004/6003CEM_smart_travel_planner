/**
 * Map module.
 * Database queries stay isolated behind focused persistence helpers.
 */

// Import the Map Cache model for database operations
const MapSearchCache = require('./map.model');

/**
 * Find valid (non-expired) cache entry by its unique key.
 * Returns lean document for better performance (plain JavaScript object).
 * 
 * @param {string} cacheKey - Unique cache key for the search
 * @returns {Promise<Object|null>} Cached data or null if not found or expired
 */
const findValidCache = async (cacheKey) =>
  MapSearchCache.findOne({
    cacheKey,
    expiresAt: { $gt: new Date() },  // Only return if expiration date is in the future
  }).lean(); // Convert Mongoose document to plain JavaScript object

/**
 * Insert or update a cache entry with the provided data and time-to-live.
 * Uses upsert to handle both create and update in one operation.
 * 
 * @param {string} cacheKey - Unique cache key for the search
 * @param {Object} data - Data to store in the cache
 * @param {number} ttlMs - Time-to-live in milliseconds
 * @returns {Promise<Object>} The updated or created cache document
 */
const upsertCache = async (cacheKey, data, ttlMs) =>
  MapSearchCache.findOneAndUpdate(
    { cacheKey },  // Find by unique cache key
    {
      cacheKey,
      data,
      expiresAt: new Date(Date.now() + ttlMs),  // Calculate expiration from current time
    },
    {
      new: true,                // Return the updated document instead of the original
      upsert: true,             // Create a new document if none exists
      setDefaultsOnInsert: true, // Apply schema defaults when creating new document
    }
  ).lean();  // Return lean document (plain JavaScript object)

// Export database helper functions for use in service layer
module.exports = { findValidCache, upsertCache };