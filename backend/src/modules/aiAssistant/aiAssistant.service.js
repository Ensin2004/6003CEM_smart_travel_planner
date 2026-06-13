/**
 * AI Assistant module.
 * Business rules and Groq integration live in this layer.
 */
const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const apiLogService = require('../apiLogs/apiLog.service');

const dailyUsage = {
  date: '',
  count: 0,
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);
const consumeDailyQuota = () => {
  const today = getTodayKey();
  const dailyLimit = Math.max(Number(env.groqDailyLimit) || 100, 0);
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

const recordAiChatFailure = (message, statusCode, metadata = {}) =>
  env.nodeEnv === 'test'
    ? Promise.resolve()
    : apiLogService
        .recordEvent({
          service: 'groq-chat',
          category: 'api',
          severity: statusCode === 429 ? 'warning' : 'error',
          endpoint: 'ai/chat',
          status: 'fail',
          statusCode,
          message,
          metadata,
        })
        .catch((error) => logger.error(`Failed to record AI chat event: ${error.message}`));

const classifyGroqError = (error) => {
  if (error.isDailyLimit) {
    return { message: 'Daily AI chat limit reached. Please try again tomorrow.', statusCode: 429 };
  }
  if (error.response?.status === 401 || error.response?.status === 403) {
    return { message: 'Groq chat is temporarily unavailable.', statusCode: 502 };
  }
  if (error.response?.status === 429) {
    return { message: 'Groq chat is busy right now. Please try again later.', statusCode: 429 };
  }
  if (error.code === 'ECONNABORTED') {
    return { message: 'Groq chat took too long. Please try again.', statusCode: 503 };
  }
  if (!error.response) {
    return { message: 'Groq chat could not be reached. Please try again.', statusCode: 503 };
  }

  return { message: 'Groq chat is temporarily unavailable.', statusCode: error.response.status || 503 };
};

const buildPrompt = ({ prompt, page }) => `
You are Triply's travel planning assistant inside a smart travel planner web app.
Answer the user clearly and practically. Keep the response concise unless the user asks for detail.
If the user asks for current prices, schedules, laws, or availability, remind them to verify with live sources.

Current app page: ${page || 'Unknown'}
User prompt:
${prompt}
`;

const extractAnswer = (response) => {
  const text = response.data?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error('Groq returned an empty response');
  }

  return text;
};

const tripRecommendationCategories = new Set(['attractions', 'food', 'hotels', 'train', 'shopping']);
const extractJson = (response) => {
  const text = extractAnswer(response).replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(text);
};
const normalizeTripRecommendations = (result = {}) => ({
  available: true,
  answer: String(result.answer || 'Here are some places that fit this trip.').trim(),
  places: (Array.isArray(result.places) ? result.places : [])
    .slice(0, 8)
    .map((place) => ({
      name: String(place.name || '').trim(),
      category: tripRecommendationCategories.has(place.category) ? place.category : 'attractions',
      reason: String(place.reason || '').trim(),
      searchQuery: String(place.searchQuery || place.name || '').trim(),
    }))
    .filter((place) => place.name && place.searchQuery),
  lastUpdated: new Date().toISOString(),
});
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

const chat = async ({ prompt, page }) => {
  if (!env.groqApiKey || env.nodeEnv === 'test') {
    return {
      available: false,
      answer: 'Groq chat is not configured yet. Add GROQ_API_KEY to the backend environment to enable AI answers.',
      lastUpdated: new Date().toISOString(),
    };
  }

  if (!consumeDailyQuota()) {
    const error = new Error('Daily AI chat limit reached. Please try again tomorrow.');
    error.isDailyLimit = true;
    const { message, statusCode } = classifyGroqError(error);
    recordAiChatFailure(message, statusCode, { page });
    return {
      available: false,
      answer: message,
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
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
        temperature: 0.45,
        max_completion_tokens: 900,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.groqApiKey}`,
        },
        timeout: 25000,
      }
    );

    return {
      available: true,
      answer: extractAnswer(response),
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    const { message, statusCode } = classifyGroqError(error);
    recordAiChatFailure(message, statusCode, { page });
    return {
      available: false,
      answer: message,
      lastUpdated: new Date().toISOString(),
    };
  }
};

const getTripRecommendations = async ({ prompt, trip, plannedPlaces, history = [] }) => {
  if (!env.groqApiKey || env.nodeEnv === 'test') {
    return {
      available: false,
      answer: 'Groq trip recommendations are not configured yet.',
      places: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  if (!consumeDailyQuota()) {
    return {
      available: false,
      answer: 'Daily AI chat limit reached. Please try again tomorrow.',
      places: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
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
        temperature: 0.35,
        max_completion_tokens: 1400,
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

    return normalizeTripRecommendations(extractJson(response));
  } catch (error) {
    const { message, statusCode } = classifyGroqError(error);
    recordAiChatFailure(message, statusCode, { page: 'trip-details' });
    return {
      available: false,
      answer: message,
      places: [],
      lastUpdated: new Date().toISOString(),
    };
  }
};

module.exports = { chat, getTripRecommendations };
