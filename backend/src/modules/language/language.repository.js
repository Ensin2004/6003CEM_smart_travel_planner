const {
  TranslationHistory,
  TranslationLanguage,
} = require('./language.model');

const cache = new Map();
let dailyUsage = { date: new Date().toISOString().slice(0, 10), count: 0 };

const buildCacheKey = ({ sourceLanguage, targetLanguage, text }) =>
  `${sourceLanguage}:${targetLanguage}:${text.toLowerCase()}`;

const getCachedTranslation = (payload, ttlMs) => {
  const cacheKey = buildCacheKey(payload);
  const cached = cache.get(cacheKey);

  if (!cached || Date.now() - cached.createdAt > ttlMs) {
    cache.delete(cacheKey);
    return null;
  }

  return { ...cached.data, cached: true };
};

const cacheTranslation = (payload, data) => {
  cache.set(buildCacheKey(payload), { data, createdAt: Date.now() });
};

const resetDailyUsageIfNeeded = () => {
  const today = new Date().toISOString().slice(0, 10);

  if (dailyUsage.date !== today) {
    dailyUsage = { date: today, count: 0 };
  }
};

const getDailyUsage = () => {
  resetDailyUsageIfNeeded();
  return dailyUsage.count;
};

const incrementDailyUsage = () => {
  resetDailyUsageIfNeeded();
  dailyUsage.count += 1;
  return dailyUsage.count;
};

const findLanguages = () => TranslationLanguage.find({ isActive: true }).sort({ name: 1 });

const findLanguageByCode = (code) => TranslationLanguage.findOne({ code, isActive: true });

const upsertLanguages = async (languages) => {
  if (!languages.length) return [];

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
        upsert: true,
      },
    }))
  );

  return findLanguages();
};

const createHistory = (data) => TranslationHistory.create(data);

const findHistoryByUserId = ({ userId, limit, page, search }) => {
  const filter = { userId };
  const normalizedSearch = search?.trim();

  if (normalizedSearch) {
    filter.$or = [
      { sourceText: new RegExp(normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { translatedText: new RegExp(normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    ];
  }

  return TranslationHistory.find(filter)
    .populate('sourceLanguageId', 'code name')
    .populate('targetLanguageId', 'code name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

const countHistoryByUserId = ({ userId, search }) => {
  const filter = { userId };
  const normalizedSearch = search?.trim();

  if (normalizedSearch) {
    const safeSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { sourceText: new RegExp(safeSearch, 'i') },
      { translatedText: new RegExp(safeSearch, 'i') },
    ];
  }

  return TranslationHistory.countDocuments(filter);
};

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
