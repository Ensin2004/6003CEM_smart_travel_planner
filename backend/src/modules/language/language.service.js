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

const CACHE_TTL_MS = 30 * 60 * 1000;
const LANGUAGE_SYNC_TTL_MS = 12 * 60 * 60 * 1000;
const DEFAULT_LIBRETRANSLATE_BASE_URL = 'http://127.0.0.1:5001';
let lastLanguageSyncAt = 0;
const getTranslationBaseUrl = () =>
  String(env.libreTranslateBaseUrl || DEFAULT_LIBRETRANSLATE_BASE_URL).replace(/\/$/, '');
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
// Format Language converts raw values into readable display text.
const formatLanguage = (language) => ({
  id: language._id,
  code: language.code,
  name: language.name,
  provider: language.provider,
});
// Normalize Provider Languages prepares incoming data for consistent storage.
const normalizeProviderLanguages = (languages = []) =>
  languages
    .map((language) => ({
      code: String(language.code || '').trim(),
      name: String(language.name || language.code || '').trim(),
      provider: 'libretranslate',
    }))
    .filter((language) => language.code && language.name);
const shouldSyncLanguages = (languages) => {
  if (!languages.length) return true;
  return Date.now() - lastLanguageSyncAt > LANGUAGE_SYNC_TTL_MS;
};
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

  if (!shouldSyncLanguages(cachedLanguages)) {
    return {
      available: true,
      source: 'database',
      languages: cachedLanguages.map(formatLanguage),
    };
  }
  try {
    const languages = await syncLanguagesFromProvider();
    return {
      available: true,
      source: 'libretranslate',
      languages: languages.map(formatLanguage),
    };
  } catch (error) {
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
// Build Unavailable Translation transforms source data into the shape required nearby.
const buildUnavailableTranslation = (message) => ({
  available: false,
  translatedText: '',
  message,
  cached: false,
});
const getLanguagesForTranslation = async (sourceLanguage, targetLanguage) => {
  const [source, target] = await Promise.all([
    languageRepository.findLanguageByCode(sourceLanguage),
    languageRepository.findLanguageByCode(targetLanguage),
  ]);

  if (source && target) {
    return { source, target };
  }

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
// Create History For Translation builds a new record from validated input.
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
  const { source, target } = await getLanguagesForTranslation(sourceLanguage, targetLanguage);

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

  const cachedTranslation = languageRepository.getCachedTranslation(
    { sourceLanguage, targetLanguage, text },
    CACHE_TTL_MS
  );

  if (cachedTranslation) {
    await createHistoryForTranslation({ userId, source, target, sourceText: text, translation: cachedTranslation });
    return cachedTranslation;
  }

  if (languageRepository.getDailyUsage() >= env.libreTranslateDailyLimit) {
    const message = 'Daily translation limit reached. Please try again tomorrow.';
    recordLanguageEvent(message, 429, { sourceLanguage, targetLanguage }, 'RATE_LIMIT_EXCEEDED');
    return buildUnavailableTranslation(message);
  }

  languageRepository.incrementDailyUsage();
  try {
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

    languageRepository.cacheTranslation({ sourceLanguage, targetLanguage, text }, translation);
    await createHistoryForTranslation({ userId, source, target, sourceText: text, translation });
    return translation;
  } catch (error) {
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
// Format History converts raw values into readable display text.
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
