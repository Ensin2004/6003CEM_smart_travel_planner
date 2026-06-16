/**
 * Transportation module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const TransportationCache = require('./transportation.model');

/**
 * Finds a valid (non-expired) cache entry by its unique key.
 * Returns lean document for better performance (plain JavaScript object).
 * 
 * @param {string} cacheKey - Unique cache key for the transportation search
 * @returns {Promise<Object|null>} Cached data or null if not found or expired
 */
const findValidCache = (cacheKey) =>
  TransportationCache.findOne({
    cacheKey,
    expiresAt: { $gt: new Date() }, // Only return if expiration date is in the future
  }).lean(); // Convert Mongoose document to plain JavaScript object

/**
 * Insert or update a cache entry with the provided data and expiration date.
 * Uses upsert to handle both create and update in one operation.
 * 
 * @param {string} cacheKey - Unique cache key for the search
 * @param {Object} data - Data to store in the cache
 * @param {Date} expiresAt - Expiration date for the cache entry
 * @returns {Promise<Object>} The updated or created cache document
 */
const upsertCache = (cacheKey, data, expiresAt) =>
  TransportationCache.findOneAndUpdate(
    { cacheKey }, // Find by unique cache key
    { cacheKey, data, expiresAt },
    {
      new: true, // Return the updated document instead of the original
      upsert: true, // Create a new document if none exists
      setDefaultsOnInsert: true, // Apply schema defaults when creating new document
    }
  ).lean(); // Return lean document (plain JavaScript object)

module.exports = { findValidCache, upsertCache };