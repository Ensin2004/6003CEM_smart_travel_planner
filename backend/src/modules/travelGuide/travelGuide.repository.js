/**
 * Travel Guide module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const TravelGuideCache = require('./travelGuide.model');

/**
 * Finds a valid (non-expired) cache entry by its key.
 * Returns null if no valid entry exists.
 */
const findValidCache = (cacheKey) =>
  TravelGuideCache.findOne({
    cacheKey,
    expiresAt: { $gt: new Date() }, // Ensure entry is not expired
  }).lean(); // Return plain JavaScript object for performance

/**
 * Creates or updates a cache entry with the given data.
 * Uses upsert to handle both insert and update operations.
 */
const upsertCache = (cacheKey, category, payload, expiresAt) =>
  TravelGuideCache.findOneAndUpdate(
    { cacheKey }, // Find by unique cache key
    { cacheKey, category, payload, expiresAt }, // Update or insert with this data
    { upsert: true, new: true, setDefaultsOnInsert: true } // Create if missing, return updated document, apply defaults
  ).lean(); // Return plain JavaScript object for performance

// Export database helper functions
module.exports = {
  findValidCache,
  upsertCache,
};