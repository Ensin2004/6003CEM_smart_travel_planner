/**
 * AI Assistant service tests cover the Groq request contract and response parsing.
 */
jest.mock('axios');
jest.mock('../src/config/env', () => ({
  nodeEnv: 'development',
  groqApiKey: 'test-groq-key',
  groqModel: 'llama-3.1-8b-instant',
  groqDailyLimit: 100,
}));
jest.mock('../src/modules/apiLogs/apiLog.service', () => ({
  recordEvent: jest.fn().mockResolvedValue(undefined),
}));

const axios = require('axios');
const aiAssistantService = require('../src/modules/aiAssistant/aiAssistant.service');

describe('AI Assistant Groq integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends chatbot prompts to Groq using the configured Llama model', async () => {
    axios.post.mockResolvedValue({
      data: {
        choices: [{ message: { content: 'A concise travel answer.' } }],
      },
    });

    const reply = await aiAssistantService.chat({
      prompt: 'What should I pack?',
      page: '/travel-tools',
    });

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        model: 'llama-3.1-8b-instant',
        messages: [
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('What should I pack?'),
          }),
        ],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-groq-key',
        }),
      })
    );
    expect(reply).toEqual(expect.objectContaining({
      available: true,
      answer: 'A concise travel answer.',
    }));
  });

  test('requests and parses JSON trip recommendations from Groq', async () => {
    axios.post.mockResolvedValue({
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              answer: 'Try these places.',
              places: [{
                name: 'Gardens by the Bay',
                category: 'attractions',
                reason: 'Iconic waterfront gardens.',
                searchQuery: 'Gardens by the Bay, Singapore',
              }],
            }),
          },
        }],
      },
    });

    const recommendations = await aiAssistantService.getTripRecommendations({
      prompt: 'Recommend an attraction',
      trip: { title: 'Singapore trip', destination: 'Singapore' },
      plannedPlaces: [],
      history: [],
    });

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' },
      }),
      expect.any(Object)
    );
    expect(recommendations).toEqual(expect.objectContaining({
      available: true,
      answer: 'Try these places.',
      places: [
        expect.objectContaining({
          name: 'Gardens by the Bay',
          searchQuery: 'Gardens by the Bay, Singapore',
        }),
      ],
    }));
  });
});
