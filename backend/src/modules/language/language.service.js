/**
 * LibreTranslate adapter and translation-history service.
 * Synchronizes provider languages and persists successful user translations.
 */
const axios = require('axios');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');
const { classifyExternalApiError } = require('../../utils/externalApiError');
const languageRepository = require('./language.repository');

// Cache TTL for translation results (30 minutes)
const CACHE_TTL_MS = 30 * 60 * 1000;
// Language sync TTL (12 hours)
const LANGUAGE_SYNC_TTL_MS = 12 * 60 * 60 * 1000;
// Default LibreTranslate base URL (local instance)
const DEFAULT_LIBRETRANSLATE_BASE_URL = 'http://127.0.0.1:5001';
// Timestamp of the last language sync
let lastLanguageSyncAt = 0;

/**
 * Gets the translation service base URL from environment or default.
 * Removes trailing slash for consistent URL construction.
 * 
 * @returns {string} Base URL for LibreTranslate API
 */
const getTranslationBaseUrl = () =>
  String(env.libreTranslateBaseUrl || DEFAULT_LIBRETRANSLATE_BASE_URL).replace(/\/$/, '');

/**
 * Records language API events to the logging service.
 * @param {string} message - Error or event message
 * @param {number} statusCode - HTTP status code
 * @param {Object} metadata - Additional context
 * @param {string} errorCode - Standardized error code
 * @returns {Promise<void>}
 */
const recordLanguageEvent = (message, statusCode, metadata = {}, errorCode) =>
  apiLogService
    .recordEvent({
      service: 'libretranslate',
      category: 'api',
      severity: statusCode === 429 ? 'warning' : 'error',
      endpoint: 'language',
      status: 'fail',
      statusCode,
      errorCode,
      message,
      metadata,
    })
    .catch((error) => logger.error(`Failed to record language API event: ${error.message}`));

/**
 * Format Language converts raw values into readable display text.
 * Maps database language document to public API format.
 * 
 * @param {Object} language - Language document from database
 * @returns {Object} Formatted language object
 */
const formatLanguage = (language) => ({
  id: language._id,
  code: language.code,
  name: language.name,
  provider: language.provider,
});

/**
 * Normalize Provider Languages prepares incoming data for consistent storage.
 * Transforms raw provider language data into database-ready format.
 * 
 * @param {Array} languages - Raw language list from provider
 * @returns {Array} Normalized language objects
 */
const normalizeProviderLanguages = (languages = []) =>
  languages
    .map((language) => ({
      code: String(language.code || '').trim(),
      name: String(language.name || language.code || '').trim(),
      provider: 'libretranslate',
    }))
    .filter((language) => language.code && language.name);

/**
 * Determines whether languages should be synced from the provider.
 * Syncs if no languages exist or if the sync TTL has expired.
 * 
 * @param {Array} languages - Current languages from database
 * @returns {boolean} True if sync is needed
 */
const shouldSyncLanguages = (languages) => {
  if (!languages.length) return true;
  return Date.now() - lastLanguageSyncAt > LANGUAGE_SYNC_TTL_MS;
};

/**
 * Synchronizes supported languages from LibreTranslate provider.
 * Fetches and upserts language entries into the database.
 * 
 * @returns {Promise<Array>} Updated language list
 * @throws {AppError} If provider response is incomplete
 */
const syncLanguagesFromProvider = async () => {
  const response = await axios.get(`${getTranslationBaseUrl()}/languages`, { timeout: 8000 });
  const providerLanguages = normalizeProviderLanguages(response.data);
  if (!providerLanguages.length) {
    throw new AppError('Translation language response was incomplete', 502);
  }

  lastLanguageSyncAt = Date.now();
  return languageRepository.upsertLanguages(providerLanguages);
};

/**
 * Returns supported languages, refreshing repository data from LibreTranslate when stale.
 * @returns {Promise<Array<object>>} Normalized language options.
 */
const getSupportedLanguages = async () => {
  const cachedLanguages = await languageRepository.findLanguages();

  // Return cached languages if sync is not needed
  if (!shouldSyncLanguages(cachedLanguages)) {
    return {
      available: true,
      source: 'database',
      languages: cachedLanguages.map(formatLanguage),
    };
  }
  
  try {
    // Sync fresh languages from provider
    const languages = await syncLanguagesFromProvider();
    return {
      available: true,
      source: 'libretranslate',
      languages: languages.map(formatLanguage),
    };
  } catch (error) {
    // Log failure and fall back to cached languages if available
    recordLanguageEvent('Translation language list unavailable', error.response?.status || 503, {});
    if (cachedLanguages.length) {
      return {
        available: true,
        source: 'database',
        message: 'Live language list temporarily unavailable. Saved language options are shown.',
        languages: cachedLanguages.map(formatLanguage),
      };
    }

    return {
      available: false,
      source: 'libretranslate',
      message: 'Language options temporarily unavailable. Please try again later.',
      languages: [],
    };
  }
};

/**
 * Build Unavailable Translation transforms source data into the shape required nearby.
 * Creates a standardized unavailable translation response.
 * 
 * @param {string} message - Error message
 * @returns {Object} Unavailable translation object
 */
const buildUnavailableTranslation = (message) => ({
  available: false,
  translatedText: '',
  message,
  cached: false,
});

/**
 * Retrieves source and target language documents for translation.
 * Triggers language sync if either language is not found.
 * 
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<Object>} Source and target language documents
 * @throws {AppError} If either language is not supported
 */
const getLanguagesForTranslation = async (sourceLanguage, targetLanguage) => {
  const [source, target] = await Promise.all([
    languageRepository.findLanguageByCode(sourceLanguage),
    languageRepository.findLanguageByCode(targetLanguage),
  ]);

  if (source && target) {
    return { source, target };
  }

  // Try syncing languages if not found
  await syncLanguagesFromProvider();

  const [syncedSource, syncedTarget] = await Promise.all([
    languageRepository.findLanguageByCode(sourceLanguage),
    languageRepository.findLanguageByCode(targetLanguage),
  ]);
  if (!syncedSource || !syncedTarget) {
    throw new AppError('Selected language is not supported by the translation provider.', 400);
  }

  return { source: syncedSource, target: syncedTarget };
};

/**
 * Create History For Translation builds a new record from validated input.
 * Persists successful translation to user history.
 * 
 * @param {Object} params - History creation parameters
 * @param {string} params.userId - User ID
 * @param {Object} params.source - Source language document
 * @param {Object} params.target - Target language document
 * @param {string} params.sourceText - Original text
 * @param {Object} params.translation - Translation result
 * @returns {Promise<Object|null>} Created history or null if translation unavailable
 */
const createHistoryForTranslation = async ({ userId, source, target, sourceText, translation }) => {
  if (!translation.available) return null;

  return languageRepository.createHistory({
    userId,
    sourceLanguageId: source._id,
    targetLanguageId: target._id,
    sourceText,
    translatedText: translation.translatedText,
    provider: translation.provider,
    cached: translation.cached,
  });
};

/**
 * Translates text and records successful authenticated-user translations.
 * @param {object} input Source text, language codes, and optional user identifier.
 * @returns {Promise<object>} Translation output and provider availability metadata.
 */
const translateText = async ({ text, sourceLanguage, targetLanguage, userId }) => {
  // Get language documents (triggers sync if needed)
  const { source, target } = await getLanguagesForTranslation(sourceLanguage, targetLanguage);

  // Same language - return original text without API call
  if (sourceLanguage === targetLanguage) {
    const translation = {
      available: true,
      sourceLanguage,
      targetLanguage,
      originalText: text,
      translatedText: text,
      provider: 'browser',
      cached: false,
    };

    await createHistoryForTranslation({ userId, source, target, sourceText: text, translation });
    return translation;
  }

  // Check cache for existing translation
  const cachedTranslation = languageRepository.getCachedTranslation(
    { sourceLanguage, targetLanguage, text },
    CACHE_TTL_MS
  );

  if (cachedTranslation) {
    // Return cached translation and record history
    await createHistoryForTranslation({ userId, source, target, sourceText: text, translation: cachedTranslation });
    return cachedTranslation;
  }

  // Check daily quota before making API call
  if (languageRepository.getDailyUsage() >= env.libreTranslateDailyLimit) {
    const message = 'Daily translation limit reached. Please try again tomorrow.';
    recordLanguageEvent(message, 429, { sourceLanguage, targetLanguage }, 'RATE_LIMIT_EXCEEDED');
    return buildUnavailableTranslation(message);
  }

  languageRepository.incrementDailyUsage();
  
  try {
    // Make API call to LibreTranslate
    const response = await axios.post(
      `${getTranslationBaseUrl()}/translate`,
      {
        q: text,
        source: sourceLanguage,
        target: targetLanguage,
        format: 'text',
        ...(env.libreTranslateApiKey && { api_key: env.libreTranslateApiKey }),
      },
      { timeout: 8000 }
    );

    const translatedText = response.data?.translatedText;
    if (!translatedText) {
      throw new AppError('Translation response was incomplete', 502);
    }

    const translation = {
      available: true,
      sourceLanguage,
      targetLanguage,
      originalText: text,
      translatedText,
      provider: 'libretranslate',
      cached: false,
    };

    // Cache the translation result
    languageRepository.cacheTranslation({ sourceLanguage, targetLanguage, text }, translation);
    
    // Record translation history
    await createHistoryForTranslation({ userId, source, target, sourceText: text, translation });
    return translation;
  } catch (error) {
    // Classify and log API errors
    const failure = classifyExternalApiError(error, {
      invalidApiKeyMessage: 'Translation API key is invalid or unauthorized.',
      networkMessage: 'Translation service could not be reached.',
      rateLimitMessage: 'Translation API rate limit reached.',
      timeoutMessage: 'Translation service request timed out.',
      unavailableMessage: 'Translation service temporarily unavailable.',
    });
    recordLanguageEvent(failure.message, failure.statusCode, {
      sourceLanguage,
      targetLanguage,
    }, failure.errorCode);
    return {
      ...buildUnavailableTranslation(failure.message),
      errorCode: failure.errorCode,
    };
  }
};

/**
 * Format History converts raw values into readable display text.
 * Maps database history document to public API format with populated languages.
 * 
 * @param {Object} history - History document from database
 * @returns {Object} Formatted history object
 */
const formatHistory = (history) => ({
  id: history._id,
  sourceLanguage: history.sourceLanguageId
    ? {
        id: history.sourceLanguageId._id,
        code: history.sourceLanguageId.code,
        name: history.sourceLanguageId.name,
      }
    : null,
  targetLanguage: history.targetLanguageId
    ? {
        id: history.targetLanguageId._id,
        code: history.targetLanguageId.code,
        name: history.targetLanguageId.name,
      }
    : null,
  sourceText: history.sourceText,
  translatedText: history.translatedText,
  provider: history.provider,
  cached: history.cached,
  createdAt: history.createdAt,
});

/**
 * Returns paginated translation history belonging to a user.
 * @param {string} userId Owner of the translation history.
 * @param {object} query Pagination and search options.
 * @returns {Promise<object>} Formatted history items and pagination metadata.
 */
const getHistory = async (userId, query = {}) => {
  const limit = Math.min(Number(query.limit) || 10, 50);
  const page = Math.max(Number(query.page) || 1, 1);
  
  // Fetch items and total count in parallel
  const [items, total] = await Promise.all([
    languageRepository.findHistoryByUserId({ userId, limit, page, search: query.search }),
    languageRepository.countHistoryByUserId({ userId, search: query.search }),
  ]);

  return {
    items: items.map(formatHistory),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Deletes a translation-history record only when it belongs to the user.
 * @param {string} id Translation-history identifier.
 * @param {string} userId Expected owner identifier.
 * @returns {Promise<void>}
 */
const deleteHistory = async (id, userId) => {
  const deletedHistory = await languageRepository.deleteHistoryByIdAndUserId(id, userId);
  if (!deletedHistory) throw new AppError('Translation history not found', 404);
};

module.exports = {
  deleteHistory,
  getHistory,
  getSupportedLanguages,
  translateText,
};