/**
 * Map module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const MapSearchCache = require('./map.model');
const findValidCache = async (cacheKey) =>
  MapSearchCache.findOne({
    cacheKey,
    expiresAt: { $gt: new Date() },
  }).lean();
const upsertCache = async (cacheKey, data, ttlMs) =>
  MapSearchCache.findOneAndUpdate(
    { cacheKey },
    {
      cacheKey,
      data,
      expiresAt: new Date(Date.now() + ttlMs),
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).lean();
module.exports = { findValidCache, upsertCache };
