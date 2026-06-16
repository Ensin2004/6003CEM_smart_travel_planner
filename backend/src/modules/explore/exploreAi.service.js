/**
 * AI recommendation service for Explore results.
 * Uses Groq when available and deterministic local ranking as a fallback.
 */
const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');
const { classifyExternalApiError } = require('../../utils/externalApiError');

// In-memory cache for AI recommendations
const aiCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache lifetime

// Maximum items sent to AI for processing
const MAX_ITEMS_FOR_PROMPT = 8;

// Daily usage tracking for AI quota management
const dailyUsage = {
  date: '',
  count: 0,
};

/**
 * Response Schema groups database fields before model registration.
 * Defines the expected JSON structure for AI-generated recommendations.
 */
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

/**
 * Gets today's date in YYYY-MM-DD format for daily quota tracking.
 * @returns {string} Current date string
 */
const getTodayKey = () => new Date().toISOString().slice(0, 10);

/**
 * Checks and consumes daily quota for AI recommendation calls.
 * Resets counter if the date has changed since last check.
 * 
 * @returns {boolean} True if quota is available and consumed, false if limit reached
 */
const consumeDailyQuota = () => {
  const today = getTodayKey();
  const dailyLimit = Math.max(Number(env.geminiDailyLimit) || 100, 0);
  
  // Reset counter when date changes
  if (dailyUsage.date !== today) {
    dailyUsage.date = today;
    dailyUsage.count = 0;
  }

  // Check if daily limit has been reached
  if (dailyUsage.count >= dailyLimit) {
    return false;
  }

  // Increment counter and allow the request
  dailyUsage.count += 1;
  return true;
};

/**
 * Records AI recommendation failures to the API log system.
 * @param {string} message - Error message to log
 * @param {number} statusCode - HTTP status code or error classification
 * @param {Object} metadata - Additional contextual metadata
 * @param {string} errorCode - Standardized error code
 * @returns {Promise<void>}
 */
const recordAiFailure = (message, statusCode, metadata = {}, errorCode) =>
  env.nodeEnv === 'test'
    ? Promise.resolve() // Skip logging in test environment
    : apiLogService
        .recordEvent({
          service: 'ai-recommendation',
          category: 'api',
          severity: statusCode === 429 ? 'warning' : 'error',
          endpoint: 'explore/ai-recommendations',
          status: 'fail',
          statusCode,
          errorCode,
          message,
          metadata,
        })
        .catch((error) => logger.error(`Failed to record AI recommendation event: ${error.message}`));

/**
 * Classifies AI API errors into standardized error responses.
 * @param {Error} error - The error object from axios or application
 * @returns {Object} Classified error with errorCode, message, and statusCode
 */
const classifyAiError = (error) => {
  return classifyExternalApiError(error, {
    invalidApiKeyMessage: 'AI recommendation API key is invalid or unauthorized.',
    networkMessage: 'AI recommendations could not be reached. Please try again.',
    rateLimitMessage: error.isDailyLimit
      ? 'Daily AI recommendation limit reached. Please try again tomorrow.'
      : 'AI recommendations are busy right now. Please try again later.',
    timeoutMessage: 'AI recommendations took too long. Please try again.',
    unavailableMessage: 'AI recommendations are temporarily unavailable.',
  });
};

/**
 * Determines if a place is currently open based on openState text.
 * @param {Object} item - Place item with openState field
 * @returns {boolean} True if the place is open
 */
const getOpenNow = (item) => {
  const openState = String(item.openState || '').toLowerCase();

  // Marked as closed - not open
  if (openState.includes('closed')) {
    return false;
  }

  // Contains 'open' - likely open
  return openState.includes('open');
};

/**
 * Calculates local statistics from a set of items.
 * @param {Array} items - Array of place items
 * @returns {Object} Statistics including counts and average rating
 */
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

/**
 * Creates a fallback recommendation response when AI is unavailable.
 * @param {string} message - Fallback message
 * @param {Array} items - Items to include in stats
 * @returns {Object} Fallback recommendation object
 */
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

/**
 * Calculates a score for an item based on rating, reviews, price, and open status.
 * @param {Object} item - Place item
 * @returns {number} Score between 0 and 100
 */
const getItemScore = (item) => {
  const ratingScore = (Number(item.rating) || 0) * 14; // Up to 70 points
  const reviewScore = Math.min(Math.log10((Number(item.reviewCount) || 0) + 1) * 7, 24); // Up to 24 points
  const priceScore = item.price || item.priceDetail?.display ? 8 : 0;
  const openScore = getOpenNow(item) ? 8 : 0;

  return Math.max(0, Math.min(Math.round(ratingScore + reviewScore + priceScore + openScore), 100));
};

/**
 * Generates a reason string for a locally-ranked item.
 * @param {Object} item - Place item
 * @returns {string} Human-readable reason
 */
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

/**
 * Generates a caution string for a locally-ranked item.
 * @param {Object} item - Place item
 * @returns {string} Caution message or empty string
 */
const getLocalCaution = (item) => {
  if (!item.openState) return 'Opening hours are not available.';
  if (!item.price && !item.priceDetail?.display) return 'Price is not available.';
  if (!Number(item.rating)) return 'Rating is not available.';
  return '';
};

/**
 * Determines the best use case based on view type.
 * @param {string} view - View type (attractions, food, hotels)
 * @returns {string} Best-for description
 */
const getLocalBestFor = (view) => {
  if (view === 'food') return 'easy dining shortlist';
  if (view === 'hotels') return 'quick room comparison';
  return 'practical sightseeing shortlist';
};

/**
 * Build Local Recommendations transforms source data into the shape required nearby.
 * Creates recommendations using local deterministic ranking.
 * 
 * @param {Object} params - Recommendation parameters
 * @returns {Object} Local recommendations object
 */
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

/**
 * Sanitizes an item for AI prompt consumption.
 * Removes sensitive or excessive data and truncates strings.
 * 
 * @param {Object} item - Raw item
 * @returns {Object} Sanitized item
 */
const sanitizeItem = (item = {}) => ({
  name: String(item.name || '').slice(0, 90),
  category: String(item.category || '').slice(0, 50),
  rating: Number(item.rating || 0) || null,
  reviewCount: Number(item.reviewCount || 0) || 0,
  price: String(item.priceDetail?.display || item.price || '').slice(0, 40),
  openState: String(item.openState || '').slice(0, 60),
  address: String(item.address || '').slice(0, 90),
});

/**
 * Build Prompt transforms source data into the shape required nearby.
 * Creates a structured prompt for AI recommendation generation.
 * 
 * @param {Object} params - Prompt parameters
 * @returns {string} Formatted prompt for the AI model
 */
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

/**
 * Parses JSON from the AI response.
 * @param {Object} response - Axios response object
 * @returns {Object} Parsed JSON
 * @throws {Error} If response is empty or invalid
 */
const parseAiJson = (response) => {
  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('AI service returned an empty response');
  }

  return JSON.parse(text);
};

/**
 * Normalizes and validates AI result data.
 * Ensures all fields are properly formatted and within constraints.
 * 
 * @param {Object} result - Raw AI result
 * @param {Array} items - Original items for stats
 * @returns {Object} Normalized recommendation object
 */
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

/**
 * Builds destination recommendations from the current Explore view and result set.
 * @param {object} input Destination, weather, view, and candidate item context.
 * @returns {Promise<object>} AI-generated or locally ranked recommendations.
 */
const getAiRecommendations = async ({ view, destination, date, weather, items = [] }) => {
  const usableItems = items.slice(0, MAX_ITEMS_FOR_PROMPT);
  
  // Check if there are items to recommend
  if (!usableItems.length) {
    return {
      ...fallbackAiRecommendations('Search results are needed before AI recommendations can be generated.', usableItems),
      errorCode: 'NO_RESULTS_FOUND',
    };
  }
  
  // Check if Gemini API key is configured
  if (!env.geminiApiKey) {
    return {
      ...fallbackAiRecommendations('AI recommendations are not configured yet.', usableItems),
      errorCode: 'INVALID_API_KEY',
    };
  }

  // Generate cache key from request parameters
  const cacheKey = JSON.stringify({
    view,
    destination,
    date,
    items: usableItems.map((item) => item.id || item.name),
    weather: weather?.condition,
  }).toLowerCase();
  
  // Check cache for existing recommendations
  const cached = aiCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  // Check daily quota before making API call
  if (!consumeDailyQuota()) {
    const error = new Error('Daily AI recommendation limit reached. Please try again tomorrow.');
    error.isDailyLimit = true;
    const { errorCode, message, statusCode } = classifyAiError(error);
    recordAiFailure(message, statusCode, { view, destination }, errorCode);
    return { ...fallbackAiRecommendations(message, usableItems), errorCode };
  }
  
  try {
    // Make API call to Gemini for structured recommendations
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent`,
      {
        contents: [
          {
            parts: [{ text: buildPrompt({ view, destination, date, weather, items: usableItems }) }],
          },
        ],
        generationConfig: {
          temperature: 0.25, // Lower temperature for consistent, deterministic output
          maxOutputTokens: 700, // Limit response length
          responseMimeType: 'application/json', // Enforce JSON response
          responseJsonSchema: responseSchema, // Validate against schema
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.geminiApiKey,
        },
        timeout: 25000, // 25-second timeout
      }
    );
    
    const aiRecommendations = normalizeAiResult(parseAiJson(response), usableItems);

    // Cache successful response
    aiCache.set(cacheKey, { data: aiRecommendations, createdAt: Date.now() });
    return aiRecommendations;
  } catch (error) {
    // Handle any API errors and return local fallback
    const { errorCode, message, statusCode } = classifyAiError(error);
    recordAiFailure(message, statusCode, { view, destination }, errorCode);
    return { ...buildLocalRecommendations({ message, view, items: usableItems }), errorCode };
  }
};

module.exports = { getAiRecommendations };