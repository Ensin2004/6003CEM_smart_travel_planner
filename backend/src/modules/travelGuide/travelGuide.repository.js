/**
 * Travel Guide module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const TravelGuideCache = require('./travelGuide.model');
const findValidCache = (cacheKey) =>
  TravelGuideCache.findOne({
    cacheKey,
    expiresAt: { $gt: new Date() },
  }).lean();
const upsertCache = (cacheKey, category, payload, expiresAt) =>
  TravelGuideCache.findOneAndUpdate(
    { cacheKey },
    { cacheKey, category, payload, expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
module.exports = {
  findValidCache,
  upsertCache,
};
