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

module.exports = { chat, getTripRecommendations };