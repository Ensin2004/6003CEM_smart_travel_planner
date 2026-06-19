/**
 * Language module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const {
  TranslationHistory,
  TranslationLanguage,
} = require('./language.model');

// In-memory cache for translation results to reduce API calls
const cache = new Map();

// Daily usage tracking for translation API quota management
let dailyUsage = { date: new Date().toISOString().slice(0, 10), count: 0 };

/**
 * Build Cache Key transforms source data into the shape required nearby.
 * Creates a unique cache key from translation parameters.
 * 
 * @param {Object} payload - Translation parameters
 * @param {string} payload.sourceLanguage - Source language code
 * @param {string} payload.targetLanguage - Target language code
 * @param {string} payload.text - Text to translate
 * @returns {string} Cache key
 */
const buildCacheKey = ({ sourceLanguage, targetLanguage, text }) =>
  `${sourceLanguage}:${targetLanguage}:${text.toLowerCase()}`;

/**
 * Retrieves a cached translation if available and not expired.
 * 
 * @param {Object} payload - Translation parameters
 * @param {number} ttlMs - Time-to-live in milliseconds
 * @returns {Object|null} Cached translation data or null
 */
const getCachedTranslation = (payload, ttlMs) => {
  const cacheKey = buildCacheKey(payload);
  const cached = cache.get(cacheKey);

  // Check if cache entry exists and is still within TTL
  if (!cached || Date.now() - cached.createdAt > ttlMs) {
    cache.delete(cacheKey);
    return null;
  }

  return { ...cached.data, cached: true };
};

/**
 * Stores a translation result in the cache.
 * 
 * @param {Object} payload - Translation parameters
 * @param {Object} data - Translation result data
 */
const cacheTranslation = (payload, data) => {
  cache.set(buildCacheKey(payload), { data, createdAt: Date.now() });
};

/**
 * Resets daily usage counter if the date has changed.
 */
const resetDailyUsageIfNeeded = () => {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyUsage.date !== today) {
    dailyUsage = { date: today, count: 0 };
  }
};

/**
 * Gets the current daily API usage count.
 * @returns {number} Number of API calls made today
 */
const getDailyUsage = () => {
  resetDailyUsageIfNeeded();
  return dailyUsage.count;
};

/**
 * Increments the daily API usage counter by 1.
 * @returns {number} New usage count after increment
 */
const incrementDailyUsage = () => {
  resetDailyUsageIfNeeded();
  dailyUsage.count += 1;
  return dailyUsage.count;
};

/**
 * Retrieves all active languages sorted by name.
 * @returns {Promise<Array>} Array of language documents
 */
const findLanguages = () => TranslationLanguage.find({ isActive: true }).sort({ name: 1 });

/**
 * Finds a language by its code.
 * @param {string} code - Language code
 * @returns {Promise<Object|null>} Language document or null
 */
const findLanguageByCode = (code) => TranslationLanguage.findOne({ code, isActive: true });

/**
 * Creates or updates multiple language entries in the database.
 * Uses bulk write for efficient upsert operations.
 * 
 * @param {Array} languages - Array of language objects with code and name
 * @returns {Promise<Array>} Updated list of active languages
 */
const upsertLanguages = async (languages) => {
  if (!languages.length) return [];

  // Perform bulk upsert for all language entries
  await TranslationLanguage.bulkWrite(
    languages.map((language) => ({
      updateOne: {
        filter: { code: language.code },
        update: {
          $set: {
            code: language.code,
            name: language.name,
            provider: language.provider || 'libretranslate',
            isActive: true,
            lastSyncedAt: new Date(),
          },
        },
        upsert: true, // Create if doesn't exist
      },
    }))
  );

  return findLanguages();
};

/**
 * Create History builds a new record from validated input.
 * Creates a translation history entry.
 * 
 * @param {Object} data - History data
 * @returns {Promise<Object>} Created history document
 */
const createHistory = (data) => TranslationHistory.create(data);

/**
 * Retrieves translation history for a user with pagination and search.
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.userId - User ID
 * @param {number} params.limit - Items per page
 * @param {number} params.page - Page number (1-indexed)
 * @param {string} params.search - Optional search term
 * @returns {Promise<Array>} Array of history documents with populated language references
 */
const findHistoryByUserId = ({ userId, limit, page, search }) => {
  const filter = { userId };
  const normalizedSearch = search?.trim();

  // Apply search filter if provided
  if (normalizedSearch) {
    const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { sourceText: new RegExp(escapedSearch, 'i') },
      { translatedText: new RegExp(escapedSearch, 'i') },
    ];
  }

  return TranslationHistory.find(filter)
    .populate('sourceLanguageId', 'code name') // Populate source language reference
    .populate('targetLanguageId', 'code name') // Populate target language reference
    .sort({ createdAt: -1 }) // Newest first
    .skip((page - 1) * limit) // Pagination offset
    .limit(limit);
};

/**
 * Counts total translation history entries for a user.
 * Used for pagination metadata.
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.userId - User ID
 * @param {string} params.search - Optional search term
 * @returns {Promise<number>} Total count
 */
const countHistoryByUserId = ({ userId, search }) => {
  const filter = { userId };
  const normalizedSearch = search?.trim();

  // Apply search filter if provided
  if (normalizedSearch) {
    const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { sourceText: new RegExp(escapedSearch, 'i') },
      { translatedText: new RegExp(escapedSearch, 'i') },
    ];
  }

  return TranslationHistory.countDocuments(filter);
};

/**
 * Delete History By Id And User Id removes a record after ownership checks.
 * Deletes a history entry only if it belongs to the specified user.
 * 
 * @param {string} id - History ID to delete
 * @param {string} userId - User ID for ownership verification
 * @returns {Promise<Object|null>} Deleted document or null
 */
const deleteHistoryByIdAndUserId = (id, userId) =>
  TranslationHistory.findOneAndDelete({ _id: id, userId });

module.exports = {
  cacheTranslation,
  countHistoryByUserId,
  createHistory,
  deleteHistoryByIdAndUserId,
  findHistoryByUserId,
  findLanguageByCode,
  findLanguages,
  getCachedTranslation,
  getDailyUsage,
  incrementDailyUsage,
  upsertLanguages,
};