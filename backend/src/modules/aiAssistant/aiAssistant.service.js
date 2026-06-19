/**
 * Groq-backed AI assistant service for contextual chat and trip recommendations.
 * Provider failures are normalized and logged before a user-safe response is returned.
 */
const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');
const { classifyExternalApiError } = require('../../utils/externalApiError');

// Daily usage tracking for Groq API quota management
const dailyUsage = {
  date: '', // Current tracking date (YYYY-MM-DD)
  count: 0, // Number of requests made today
};
const geminiDailyUsage = {
  date: '',
  count: 0,
};

/**
 * Gets today's date in YYYY-MM-DD format for daily quota tracking.
 * @returns {string} Current date string
 */
const getTodayKey = () => new Date().toISOString().slice(0, 10);

/**
 * Checks and consumes daily quota for Groq API calls.
 * Resets counter if the date has changed since last check.
 * 
 * @returns {boolean} True if quota is available and consumed, false if limit reached
 */
const consumeDailyQuota = () => {
  const today = getTodayKey();
  const dailyLimit = Math.max(Number(env.groqDailyLimit) || 100, 0);
  
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

const consumeGeminiDailyQuota = () => {
  const today = getTodayKey();
  const dailyLimit = Math.max(Number(env.geminiDailyLimit) || 100, 0);

  if (geminiDailyUsage.date !== today) {
    geminiDailyUsage.date = today;
    geminiDailyUsage.count = 0;
  }

  if (geminiDailyUsage.count >= dailyLimit) {
    return false;
  }

  geminiDailyUsage.count += 1;
  return true;
};

/**
 * Records AI chat failures to the API log system for monitoring and debugging.
 * 
 * @param {string} message - Error message to log
 * @param {number} statusCode - HTTP status code or error classification
 * @param {Object} metadata - Additional contextual metadata
 * @param {string} errorCode - Standardized error code
 * @returns {Promise<void>}
 */
const recordAiChatFailure = (message, statusCode, metadata = {}, errorCode) =>
  env.nodeEnv === 'test'
    ? Promise.resolve() // Skip logging in test environment
    : apiLogService
        .recordEvent({
          service: 'groq-chat',
          category: 'api',
          severity: statusCode === 429 ? 'warning' : 'error', // Rate limits are warnings, others are errors
          endpoint: 'ai/chat',
          status: 'fail',
          statusCode,
          errorCode,
          message,
          metadata,
        })
        .catch((error) => logger.error(`Failed to record AI chat event: ${error.message}`));

/**
 * Classifies Groq API errors into standardized error responses.
 * Maps various error types to user-friendly messages and appropriate status codes.
 * 
 * @param {Error} error - The error object from axios or application
 * @returns {Object} Classified error with errorCode, message, and statusCode
 */
const classifyGroqError = (error) => {
  return classifyExternalApiError(error, {
    invalidApiKeyMessage: 'Groq API key is invalid or unauthorized.',
    networkMessage: 'Groq chat could not be reached. Please try again.',
    rateLimitMessage: error.isDailyLimit
      ? 'Daily AI chat limit reached. Please try again tomorrow.'
      : 'Groq chat is busy right now. Please try again later.',
    timeoutMessage: 'Groq chat took too long. Please try again.',
    unavailableMessage: 'Groq chat is temporarily unavailable.',
  });
};

const classifyGeminiError = (error) => {
  return classifyExternalApiError(error, {
    invalidApiKeyMessage: 'Gemini API key is invalid or unauthorized.',
    networkMessage: 'Gemini ranking could not be reached. Please try again.',
    rateLimitMessage: error.isDailyLimit
      ? 'Daily Gemini ranking limit reached. Please try again tomorrow.'
      : 'Gemini ranking is busy right now. Please try again later.',
    timeoutMessage: 'Gemini ranking took too long. Please try again.',
    unavailableMessage: 'Gemini ranking is temporarily unavailable.',
  });
};

/**
 * Builds the system prompt for general AI chat interactions.
 * Provides context about the application and user's current page.
 * 
 * @param {Object} params - Prompt parameters
 * @param {string} params.prompt - User's input message
 * @param {string} params.page - Current page in the application
 * @returns {string} Formatted prompt for the AI model
 */
const buildPrompt = ({ prompt, page }) => `
You are Triply's travel planning assistant inside a smart travel planner web app.
Answer the user clearly and practically. Keep the response concise unless the user asks for detail.
If the user asks for current prices, schedules, laws, or availability, remind them to verify with live sources.

Current app page: ${page || 'Unknown'}
User prompt:
${prompt}
`;

/**
 * Extracts the AI response text from the Groq API response.
 * 
 * @param {Object} response - Axios response object from Groq API
 * @returns {string} Extracted and trimmed response text
 * @throws {Error} If response is empty or malformed
 */
const extractAnswer = (response) => {
  const text = response.data?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error('Groq returned an empty response');
  }

  return text;
};

// Valid categories for trip recommendations
const tripRecommendationCategories = new Set(['attractions', 'food', 'hotels', 'train', 'shopping']);

/**
 * Extracts and parses JSON from the Groq API response.
 * Handles markdown code blocks and trims whitespace.
 * 
 * @param {Object} response - Axios response object from Groq API
 * @returns {Object} Parsed JSON object
 * @throws {Error} If JSON parsing fails
 */
const extractJson = (response) => {
  const text = extractAnswer(response).replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(text);
};

/**
 * Normalizes and validates trip recommendation data from AI response.
 * Ensures all fields are properly formatted and within constraints.
 * 
 * @param {Object} result - Raw recommendation data from AI
 * @returns {Object} Normalized recommendations with validated fields
 */
const normalizeTripRecommendations = (result = {}) => ({
  available: true,
  answer: String(result.answer || 'Here are some places that fit this trip.').trim(),
  places: (Array.isArray(result.places) ? result.places : [])
    .slice(0, 8) // Limit to maximum 8 places
    .map((place) => ({
      name: String(place.name || '').trim(),
      category: tripRecommendationCategories.has(place.category) ? place.category : 'attractions',
      reason: String(place.reason || '').trim(),
      searchQuery: String(place.searchQuery || place.name || '').trim(),
    }))
    .filter((place) => place.name && place.searchQuery), // Remove entries with missing required fields
  lastUpdated: new Date().toISOString(),
});

const normalizeWeatherPlaceRanking = (result = {}, candidates = []) => {
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const rankedPlaces = (Array.isArray(result.rankedPlaces) ? result.rankedPlaces : [])
    .map((place) => ({
      id: String(place.id || '').trim(),
      score: Math.max(0, Math.min(100, Number(place.score) || 0)),
      reason: String(place.reason || '').trim().slice(0, 180),
    }))
    .filter((place) => candidateIds.has(place.id));
  const usedIds = new Set(rankedPlaces.map((place) => place.id));

  candidates.forEach((candidate) => {
    if (!usedIds.has(candidate.id)) {
      rankedPlaces.push({
        id: candidate.id,
        score: Number(candidate.rating || 0) * 10,
        reason: '',
      });
    }
  });

  return {
    available: true,
    provider: result.provider || 'groq',
    summary: String(result.summary || 'Ranked by AI for the day weather.').trim().slice(0, 220),
    rankedPlaces,
    lastUpdated: new Date().toISOString(),
  };
};

const weatherRankingSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    rankedPlaces: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          score: { type: 'number' },
          reason: { type: 'string' },
        },
        required: ['id', 'score', 'reason'],
      },
    },
  },
  required: ['summary', 'rankedPlaces'],
};

/**
 * Builds the system prompt for trip recommendation requests.
 * Includes comprehensive trip context, planned places, and conversation history.
 * 
 * @param {Object} params - Recommendation parameters
 * @returns {string} Formatted prompt for the AI model
 */
const buildTripRecommendationPrompt = ({ prompt, trip, plannedPlaces, history }) => `
You are Triply's travel planning assistant. Recommend real, searchable places for the user's trip.
Use the conversation history to understand follow-up questions and maintain context.
Return JSON only with this exact shape:
{
  "answer": "A concise helpful response to the user",
  "places": [
    {
      "name": "Exact real place name",
      "category": "attractions|food|hotels|train|shopping",
      "reason": "One concise reason this fits the request",
      "searchQuery": "Exact place name, city, country"
    }
  ]
}
Return at most 6 places. Do not invent places. Avoid duplicating planned places.

Trip title: ${trip.title || 'Untitled trip'}
Destination: ${trip.destination || 'Not specified'}, ${trip.country || ''}
Dates: ${trip.startDate || 'Not specified'} to ${trip.endDate || 'Not specified'}
Budget: ${trip.budget?.currency || ''} ${trip.budget?.totalAmount || 'Not specified'}
Already planned: ${plannedPlaces.join(', ') || 'None'}
Conversation history:
${history.map((message) => `${message.role}: ${message.text}`).join('\n') || 'No previous messages'}
User request: ${prompt}
`;

const buildWeatherPlaceRankingPrompt = ({ weather, trip, day, category, candidates }) => `
You are Triply's weather-aware travel planner.
Rank only the candidate places provided by ID. Do not add new places and do not change IDs.
Prefer places that fit the weather, day context, travel comfort, opening/hours clues, and practical shelter or outdoor suitability.
Return JSON only with this exact shape:
{
  "summary": "One concise explanation of the recommendation logic",
  "rankedPlaces": [
    {
      "id": "candidate id exactly as provided",
      "score": 0,
      "reason": "Short user-facing reason this place fits the weather"
    }
  ]
}
Return every candidate once, ordered from best to least suitable. Score must be 0 to 100.

Weather:
${JSON.stringify(weather || {})}
Trip:
${JSON.stringify(trip || {})}
Day:
${JSON.stringify(day || {})}
Requested category: ${category || 'any'}
Candidates:
${JSON.stringify(candidates)}
`;

const parseGeminiJson = (response) => {
  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }

  return JSON.parse(text);
};

const buildUnavailableWeatherRanking = (summary, errorCode, provider = '') => ({
  available: false,
  provider,
  summary,
  errorCode,
  rankedPlaces: [],
  lastUpdated: new Date().toISOString(),
});

const requestGroqWeatherRanking = async ({ weather, trip, day, category, candidates }) => {
  if (!env.groqApiKey || env.nodeEnv === 'test') {
    return buildUnavailableWeatherRanking('Groq weather ranking is not configured yet.', 'INVALID_API_KEY', 'groq');
  }

  if (!consumeDailyQuota()) {
    return buildUnavailableWeatherRanking('Daily Groq AI limit reached. Trying Gemini instead.', 'RATE_LIMIT_EXCEEDED', 'groq');
  }

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: env.groqModel,
        messages: [
          {
            role: 'user',
            content: buildWeatherPlaceRankingPrompt({
              weather,
              trip,
              day,
              category,
              candidates,
            }),
          },
        ],
        temperature: 0.2,
        max_completion_tokens: 1800,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.groqApiKey}`,
        },
        timeout: 25000,
      }
    );

    return normalizeWeatherPlaceRanking({ ...extractJson(response), provider: 'groq' }, candidates);
  } catch (error) {
    const { errorCode, message, statusCode } = classifyGroqError(error);
    recordAiChatFailure(message, statusCode, { page: 'trip-details', category, provider: 'groq' }, errorCode);
    return buildUnavailableWeatherRanking(message, errorCode, 'groq');
  }
};

const requestGeminiWeatherRanking = async ({ weather, trip, day, category, candidates }) => {
  if (!env.geminiApiKey || env.nodeEnv === 'test') {
    return buildUnavailableWeatherRanking('Gemini weather ranking is not configured yet.', 'INVALID_API_KEY', 'gemini');
  }

  if (!consumeGeminiDailyQuota()) {
    return buildUnavailableWeatherRanking('Daily Gemini AI limit reached.', 'RATE_LIMIT_EXCEEDED', 'gemini');
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent`,
      {
        contents: [
          {
            parts: [{
              text: buildWeatherPlaceRankingPrompt({
                weather,
                trip,
                day,
                category,
                candidates,
              }),
            }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1800,
          responseMimeType: 'application/json',
          responseJsonSchema: weatherRankingSchema,
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

    return normalizeWeatherPlaceRanking({ ...parseGeminiJson(response), provider: 'gemini' }, candidates);
  } catch (error) {
    const { errorCode, message, statusCode } = classifyGeminiError(error);
    recordAiChatFailure(message, statusCode, { page: 'trip-details', category, provider: 'gemini' }, errorCode);
    return buildUnavailableWeatherRanking(message, errorCode, 'gemini');
  }
};

/**
 * Sends a page-aware user prompt to the configured Groq chat model.
 * @param {{prompt: string, page?: string}} input Chat request context.
 * @returns {Promise<object>} The assistant response and availability metadata.
 */
const chat = async ({ prompt, page }) => {
  // Check if Groq API key is configured
  if (!env.groqApiKey || env.nodeEnv === 'test') {
    return {
      available: false,
      answer: 'Groq chat is not configured yet. Add GROQ_API_KEY to the backend environment to enable AI answers.',
      errorCode: 'INVALID_API_KEY',
      lastUpdated: new Date().toISOString(),
    };
  }

  // Check daily quota before making API call
  if (!consumeDailyQuota()) {
    const error = new Error('Daily AI chat limit reached. Please try again tomorrow.');
    error.isDailyLimit = true;
    const { errorCode, message, statusCode } = classifyGroqError(error);
    recordAiChatFailure(message, statusCode, { page }, errorCode);
    return {
      available: false,
      answer: message,
      errorCode,
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    // Make API call to Groq chat completions endpoint
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: env.groqModel,
        messages: [
          {
            role: 'user',
            content: buildPrompt({ prompt, page }),
          },
        ],
        temperature: 0.45, // Moderate creativity for consistent responses
        max_completion_tokens: 900, // Limit response length
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.groqApiKey}`,
        },
        timeout: 25000, // 25-second timeout for API responsiveness
      }
    );

    return {
      available: true,
      answer: extractAnswer(response),
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    // Handle any API errors and return user-friendly fallback
    const { errorCode, message, statusCode } = classifyGroqError(error);
    recordAiChatFailure(message, statusCode, { page }, errorCode);
    return {
      available: false,
      answer: message,
      errorCode,
      lastUpdated: new Date().toISOString(),
    };
  }
};

/**
 * Generates structured recommendations using the trip, planned places, and chat history.
 * @param {object} input Recommendation context supplied by the trip assistant.
 * @returns {Promise<object>} Categorized recommendations or a provider fallback result.
 */
const getTripRecommendations = async ({ prompt, trip, plannedPlaces, history = [] }) => {
  // Check if Groq API key is configured
  if (!env.groqApiKey || env.nodeEnv === 'test') {
    return {
      available: false,
      answer: 'Groq trip recommendations are not configured yet.',
      errorCode: 'INVALID_API_KEY',
      places: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  // Check daily quota before making API call
  if (!consumeDailyQuota()) {
    return {
      available: false,
      answer: 'Daily AI chat limit reached. Please try again tomorrow.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      places: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    // Make API call to Groq for structured recommendations
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: env.groqModel,
        messages: [
          {
            role: 'user',
            content: buildTripRecommendationPrompt({ prompt, trip, plannedPlaces, history }),
          },
        ],
        temperature: 0.35, // Lower temperature for more deterministic structured output
        max_completion_tokens: 1400, // Longer response to include multiple place details
        response_format: { type: 'json_object' }, // Enforce JSON response format
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.groqApiKey}`,
        },
        timeout: 25000,
      }
    );

    return normalizeTripRecommendations(extractJson(response));
  } catch (error) {
    // Handle any API errors and return structured fallback
    const { errorCode, message, statusCode } = classifyGroqError(error);
    recordAiChatFailure(message, statusCode, { page: 'trip-details' }, errorCode);
    return {
      available: false,
      answer: message,
      errorCode,
      places: [],
      lastUpdated: new Date().toISOString(),
    };
  }
};

const rankWeatherPlaces = async ({ weather, trip, day, category, candidates = [] }) => {
  const safeCandidates = candidates
    .slice(0, 40)
    .map((candidate) => ({
      id: String(candidate.id || '').trim(),
      name: String(candidate.name || '').trim(),
      category: String(candidate.category || category || '').trim(),
      address: String(candidate.address || '').trim(),
      summary: String(candidate.summary || '').trim(),
      rating: Number(candidate.rating) || undefined,
      price: String(candidate.price || '').trim(),
      hours: String(candidate.hours || '').trim(),
    }))
    .filter((candidate) => candidate.id && candidate.name);

  if (!safeCandidates.length) {
    return buildUnavailableWeatherRanking('No places were available to rank.', 'NO_CANDIDATES');
  }

  const groqRanking = await requestGroqWeatherRanking({
    weather,
    trip,
    day,
    category,
    candidates: safeCandidates,
  });

  if (groqRanking.available) return groqRanking;

  const geminiRanking = await requestGeminiWeatherRanking({
    weather,
    trip,
    day,
    category,
    candidates: safeCandidates,
  });

  return geminiRanking.available
    ? geminiRanking
    : {
      ...geminiRanking,
      summary: `${groqRanking.summary} ${geminiRanking.summary}`.trim(),
      errorCode: geminiRanking.errorCode || groqRanking.errorCode,
    };
};

module.exports = { chat, getTripRecommendations, rankWeatherPlaces };
