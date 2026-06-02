/**
 * Explore module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');

const aiCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_ITEMS_FOR_PROMPT = 8;
const dailyUsage = {
  date: '',
  count: 0,
};
// Response Schema groups database fields before model registration.
const responseSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    recommendationMode: { type: 'string' },
    stats: {
      type: 'object',
      properties: {
        totalResults: { type: 'integer' },
        averageRating: { type: 'number' },
        openNowCount: { type: 'integer' },
        pricedCount: { type: 'integer' },
        bestValueCount: { type: 'integer' },
      },
      required: ['totalResults', 'averageRating', 'openNowCount', 'pricedCount', 'bestValueCount'],
    },
    picks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          itemName: { type: 'string' },
          reason: { type: 'string' },
          bestFor: { type: 'string' },
          caution: { type: 'string' },
          score: { type: 'integer' },
        },
        required: ['itemName', 'reason', 'bestFor', 'caution', 'score'],
      },
    },
    tips: {
      type: 'array',
      items: { type: 'string' },
    },
    nextActions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['summary', 'recommendationMode', 'stats', 'picks', 'tips', 'nextActions'],
};
const getTodayKey = () => new Date().toISOString().slice(0, 10);
const consumeDailyQuota = () => {
  const today = getTodayKey();
  const dailyLimit = Math.max(Number(env.geminiDailyLimit) || 100, 0);
  if (dailyUsage.date !== today) {
    dailyUsage.date = today;
    dailyUsage.count = 0;
  }

  if (dailyUsage.count >= dailyLimit) {
    return false;
  }

  dailyUsage.count += 1;
  return true;
};
const recordAiFailure = (message, statusCode, metadata = {}) =>
  env.nodeEnv === 'test'
    ? Promise.resolve()
    : apiLogService
        .recordEvent({
          service: 'ai-recommendation',
          category: 'api',
          severity: statusCode === 429 ? 'warning' : 'error',
          endpoint: 'explore/ai-recommendations',
          status: 'fail',
          statusCode,
          message,
          metadata,
        })
        .catch((error) => logger.error(`Failed to record AI recommendation event: ${error.message}`));
const classifyAiError = (error) => {
  if (error.isDailyLimit) {
    return { message: 'Daily AI recommendation limit reached. Please try again tomorrow.', statusCode: 429 };
  }
  if (error.response?.status === 401 || error.response?.status === 403) {
    return { message: 'AI recommendations are temporarily unavailable.', statusCode: 502 };
  }
  if (error.response?.status === 429) {
    return { message: 'AI recommendations are busy right now. Please try again later.', statusCode: 429 };
  }
  if (error.code === 'ECONNABORTED') {
    return { message: 'AI recommendations took too long. Please try again.', statusCode: 503 };
  }
  if (!error.response) {
    return { message: 'AI recommendations could not be reached. Please try again.', statusCode: 503 };
  }

  return { message: 'AI recommendations are temporarily unavailable.', statusCode: error.response.status || 503 };
};
const getOpenNow = (item) => {
  const openState = String(item.openState || '').toLowerCase();

  if (openState.includes('closed')) {
    return false;
  }

  return openState.includes('open');
};
const getLocalStats = (items) => {
  const ratedItems = items.filter((item) => Number(item.rating));
  const ratingSum = ratedItems.reduce((sum, item) => sum + Number(item.rating), 0);

  return {
    totalResults: items.length,
    averageRating: ratedItems.length ? Number((ratingSum / ratedItems.length).toFixed(1)) : 0,
    openNowCount: items.filter(getOpenNow).length,
    pricedCount: items.filter((item) => item.price || item.priceDetail?.display).length,
    bestValueCount: items.filter((item) => Number(item.rating) >= 4.3 && (item.price || item.priceDetail?.display)).length,
  };
};
const fallbackAiRecommendations = (message, items = []) => ({
  available: false,
  message,
  summary: message,
  recommendationMode: 'fallback',
  stats: getLocalStats(items),
  picks: [],
  tips: [],
  nextActions: [],
});
const getItemScore = (item) => {
  const ratingScore = (Number(item.rating) || 0) * 14;
  const reviewScore = Math.min(Math.log10((Number(item.reviewCount) || 0) + 1) * 7, 24);
  const priceScore = item.price || item.priceDetail?.display ? 8 : 0;
  const openScore = getOpenNow(item) ? 8 : 0;

  return Math.max(0, Math.min(Math.round(ratingScore + reviewScore + priceScore + openScore), 100));
};
const getLocalReason = (item) => {
  const reasons = [];

  if (Number(item.rating)) {
    reasons.push(`${Number(item.rating).toFixed(1)} star rating`);
  }

  if (Number(item.reviewCount)) {
    reasons.push(`${Number(item.reviewCount).toLocaleString('en-US')} reviews`);
  }

  if (getOpenNow(item)) {
    reasons.push('open now');
  }

  if (item.price || item.priceDetail?.display) {
    reasons.push('price is shown');
  }

  return reasons.length ? `Strong choice because it has ${reasons.join(', ')}.` : 'Useful option from the loaded results.';
};
const getLocalCaution = (item) => {
  if (!item.openState) return 'Opening hours are not available.';
  if (!item.price && !item.priceDetail?.display) return 'Price is not available.';
  if (!Number(item.rating)) return 'Rating is not available.';
  return '';
};
const getLocalBestFor = (view) => {
  if (view === 'food') return 'easy dining shortlist';
  if (view === 'hotels') return 'quick room comparison';
  return 'practical sightseeing shortlist';
};
// Build Local Recommendations transforms source data into the shape required nearby.
const buildLocalRecommendations = ({ message, view, items = [] }) => {
  const rankedItems = [...items]
    .sort((firstItem, secondItem) => getItemScore(secondItem) - getItemScore(firstItem))
    .slice(0, 3);

  return {
    available: true,
    message,
    summary: 'Quick recommendations are ready from the loaded results.',
    recommendationMode: 'local',
    stats: getLocalStats(items),
    picks: rankedItems.map((item) => ({
      itemName: String(item.name || 'Unnamed place').slice(0, 120),
      reason: getLocalReason(item).slice(0, 180),
      bestFor: getLocalBestFor(view),
      caution: getLocalCaution(item).slice(0, 140),
      score: getItemScore(item),
    })),
    tips: [
      'Confirm live hours before leaving.',
      'Compare highly rated options with clear prices first.',
      'Keep one nearby backup option saved.',
    ],
    nextActions: ['Open the place page to confirm details.', 'Save the best fit into the trip plan.'],
    lastUpdated: new Date().toISOString(),
  };
};
const sanitizeItem = (item = {}) => ({
  name: String(item.name || '').slice(0, 90),
  category: String(item.category || '').slice(0, 50),
  rating: Number(item.rating || 0) || null,
  reviewCount: Number(item.reviewCount || 0) || 0,
  price: String(item.priceDetail?.display || item.price || '').slice(0, 40),
  openState: String(item.openState || '').slice(0, 60),
  address: String(item.address || '').slice(0, 90),
});

// Build Prompt transforms source data into the shape required nearby.
const buildPrompt = ({ view, destination, date, weather, items }) => `
You are helping a traveler choose from search results in a smart travel planner.
Use only the supplied result data. Do not invent places, prices, phone numbers, opening hours, or ratings.
Return concise, practical recommendations for the ${view} submenu.

Destination: ${destination}
Travel date: ${date || 'not specified'}
Weather context: ${weather?.available ? `${weather.condition}; ${weather.travelTip}` : 'not available'}
Results:
${JSON.stringify(items.map(sanitizeItem), null, 2)}

Guidance:
- Pick up to 3 results from the provided list.
- Keep every reason and caution short.
- Mention missing price, hours, or rating data only when it affects the pick.
- For restaurants, prioritize open status, reviews, and price clarity.
- For hotels, prioritize rating, location clue, price clarity, and practical caution.
- For attractions, prioritize rating, weather fit, price clarity, and opening status.
`;

const parseAiJson = (response) => {
  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('AI service returned an empty response');
  }

  return JSON.parse(text);
};
const normalizeAiResult = (result, items) => ({
  available: true,
  summary: String(result.summary || 'AI recommendations are ready.').slice(0, 520),
  recommendationMode: 'ai',
  stats: {
    ...getLocalStats(items),
    ...(result.stats || {}),
  },
  picks: Array.isArray(result.picks)
    ? result.picks.slice(0, 3).map((pick) => ({
        itemName: String(pick.itemName || '').slice(0, 120),
        reason: String(pick.reason || '').slice(0, 180),
        bestFor: String(pick.bestFor || '').slice(0, 80),
        caution: String(pick.caution || '').slice(0, 140),
        score: Math.max(0, Math.min(Number(pick.score) || 0, 100)),
      }))
    : [],
  tips: Array.isArray(result.tips) ? result.tips.slice(0, 4).map((tip) => String(tip).slice(0, 140)) : [],
  nextActions: Array.isArray(result.nextActions)
    ? result.nextActions.slice(0, 3).map((action) => String(action).slice(0, 120))
    : [],
  lastUpdated: new Date().toISOString(),
});

const getAiRecommendations = async ({ view, destination, date, weather, items = [] }) => {
  const usableItems = items.slice(0, MAX_ITEMS_FOR_PROMPT);
  if (!usableItems.length) {
    return fallbackAiRecommendations('Search results are needed before AI recommendations can be generated.', usableItems);
  }
  if (!env.geminiApiKey) {
    return fallbackAiRecommendations('AI recommendations are not configured yet.', usableItems);
  }

  const cacheKey = JSON.stringify({
    view,
    destination,
    date,
    items: usableItems.map((item) => item.id || item.name),
    weather: weather?.condition,
  }).toLowerCase();
  const cached = aiCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  if (!consumeDailyQuota()) {
    const error = new Error('Daily AI recommendation limit reached. Please try again tomorrow.');
    error.isDailyLimit = true;
    const { message, statusCode } = classifyAiError(error);
    recordAiFailure(message, statusCode, { view, destination });
    return fallbackAiRecommendations(message, usableItems);
  }
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent`,
      {
        contents: [
          {
            parts: [{ text: buildPrompt({ view, destination, date, weather, items: usableItems }) }],
          },
        ],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 700,
          responseMimeType: 'application/json',
          responseJsonSchema: responseSchema,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.geminiApiKey,
        },
        timeout: 25000,
      }
    );
    const aiRecommendations = normalizeAiResult(parseAiJson(response), usableItems);

    aiCache.set(cacheKey, { data: aiRecommendations, createdAt: Date.now() });
    return aiRecommendations;
  } catch (error) {
    const { message, statusCode } = classifyAiError(error);
    recordAiFailure(message, statusCode, { view, destination });
    return buildLocalRecommendations({ message, view, items: usableItems });
  }
};

module.exports = { getAiRecommendations };
