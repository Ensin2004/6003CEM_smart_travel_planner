/**
 * AI Assistant module.
 * Business rules and Gemini integration live in this layer.
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

const recordAiChatFailure = (message, statusCode, metadata = {}) =>
  env.nodeEnv === 'test'
    ? Promise.resolve()
    : apiLogService
        .recordEvent({
          service: 'gemini-chat',
          category: 'api',
          severity: statusCode === 429 ? 'warning' : 'error',
          endpoint: 'ai/chat',
          status: 'fail',
          statusCode,
          message,
          metadata,
        })
        .catch((error) => logger.error(`Failed to record AI chat event: ${error.message}`));

const classifyGeminiError = (error) => {
  if (error.isDailyLimit) {
    return { message: 'Daily AI chat limit reached. Please try again tomorrow.', statusCode: 429 };
  }
  if (error.response?.status === 401 || error.response?.status === 403) {
    return { message: 'Gemini chat is temporarily unavailable.', statusCode: 502 };
  }
  if (error.response?.status === 429) {
    return { message: 'Gemini chat is busy right now. Please try again later.', statusCode: 429 };
  }
  if (error.code === 'ECONNABORTED') {
    return { message: 'Gemini chat took too long. Please try again.', statusCode: 503 };
  }
  if (!error.response) {
    return { message: 'Gemini chat could not be reached. Please try again.', statusCode: 503 };
  }

  return { message: 'Gemini chat is temporarily unavailable.', statusCode: error.response.status || 503 };
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
  const text = response.data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();

  if (!text) {
    throw new Error('Gemini returned an empty response');
  }

  return text;
};

const chat = async ({ prompt, page }) => {
  if (!env.geminiApiKey || env.nodeEnv === 'test') {
    return {
      available: false,
      answer: 'Gemini chat is not configured yet. Add GEMINI_API_KEY to the backend environment to enable AI answers.',
      lastUpdated: new Date().toISOString(),
    };
  }

  if (!consumeDailyQuota()) {
    const error = new Error('Daily AI chat limit reached. Please try again tomorrow.');
    error.isDailyLimit = true;
    const { message, statusCode } = classifyGeminiError(error);
    recordAiChatFailure(message, statusCode, { page });
    return {
      available: false,
      answer: message,
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent`,
      {
        contents: [
          {
            parts: [{ text: buildPrompt({ prompt, page }) }],
          },
        ],
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: 900,
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

    return {
      available: true,
      answer: extractAnswer(response),
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    const { message, statusCode } = classifyGeminiError(error);
    recordAiChatFailure(message, statusCode, { page });
    return {
      available: false,
      answer: message,
      lastUpdated: new Date().toISOString(),
    };
  }
};

module.exports = { chat };
