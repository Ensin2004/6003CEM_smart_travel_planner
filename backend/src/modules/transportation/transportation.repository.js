const TransportationCache = require('./transportation.model');

const findValidCache = (cacheKey) =>
  TransportationCache.findOne({
    cacheKey,
    expiresAt: { $gt: new Date() },
  }).lean();

const upsertCache = (cacheKey, data, expiresAt) =>
  TransportationCache.findOneAndUpdate(
    { cacheKey },
    { cacheKey, data, expiresAt },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

module.exports = { findValidCache, upsertCache };
