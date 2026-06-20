/**
 * AI Assistant service tests cover the Groq request contract and response parsing.
 */

// Mock axios to prevent actual API calls to Groq during tests
jest.mock('axios');
// Mock environment configuration with Groq API credentials and rate limits
jest.mock('../src/config/env', () => ({
  nodeEnv: 'development',
  groqApiKey: 'test-groq-key',           // Test API key (not a real credential)
  groqModel: 'llama-3.1-8b-instant',      // Llama model for text generation
  groqDailyLimit: 100,                    // Mock daily quota
  geminiApiKey: 'test-gemini-key',
  geminiModel: 'gemini-2.5-flash-lite',
  geminiDailyLimit: 100,
}));
// Mock API log service to prevent logging during tests
jest.mock('../src/modules/apiLogs/apiLog.service', () => ({
  recordEvent: jest.fn().mockResolvedValue(undefined),
}));

// Import dependencies after mocks are set up
const axios = require('axios');
const aiAssistantService = require('../src/modules/aiAssistant/aiAssistant.service');

// Test group covers Groq API integration for chatbot and trip recommendations
describe('AI Assistant Groq integration', () => {
  // Reset all mock state before each test to ensure test isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Verify that chatbot prompts are correctly sent to Groq using the configured Llama model
  test('sends chatbot prompts to Groq using the configured Llama model', async () => {
    // Mock Groq API response with a simple text answer
    axios.post.mockResolvedValue({
      data: {
        choices: [{ message: { content: 'A concise travel answer.' } }],
      },
    });

    // Execute chatbot request with user prompt and context page
    const reply = await aiAssistantService.chat({
      prompt: 'What should I pack?',
      page: '/travel-tools',  // Context page for AI to understand the use case
    });

    // Verify API was called with correct Groq endpoint
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        model: 'llama-3.1-8b-instant',  // Correct model from environment
        messages: [
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('What should I pack?'),  // User prompt included
          }),
        ],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-groq-key',  // API key in authorization header
        }),
      })
    );
    // Verify response contains expected fields
    expect(reply).toEqual(expect.objectContaining({
      available: true,
      answer: 'A concise travel answer.',
    }));
  });

  // Verify that JSON-formatted trip recommendations are requested and parsed correctly
  test('requests and parses JSON trip recommendations from Groq', async () => {
    // Mock Groq API response with structured JSON containing place recommendations
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

    // Execute trip recommendations request with trip context and history
    const recommendations = await aiAssistantService.getTripRecommendations({
      prompt: 'Recommend an attraction',
      trip: { title: 'Singapore trip', destination: 'Singapore' },
      plannedPlaces: [],     // Empty array - no existing places in itinerary
      history: [],           // Empty array - no previous chat history
    });

    // Verify API was called with JSON response format requirement
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' },  // Forces structured JSON output
      }),
      expect.any(Object)
    );
    // Verify parsed response contains structured recommendation data
    expect(recommendations).toEqual(expect.objectContaining({
      available: true,
      answer: 'Try these places.',
      places: [
        expect.objectContaining({
          name: 'Gardens by the Bay',
          searchQuery: 'Gardens by the Bay, Singapore',  // Query for further lookup
        }),
      ],
    }));
  });

  test('ranks weather-aware places using only provided candidate ids', async () => {
    axios.post.mockResolvedValue({
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'Indoor places are better for rain.',
              rankedPlaces: [
                { id: 'place-2', score: 93, reason: 'Covered and practical for rain.' },
                { id: 'invented-place', score: 99, reason: 'Should be ignored.' },
                { id: 'place-1', score: 60, reason: 'Less sheltered.' },
              ],
            }),
          },
        }],
      },
    });

    const ranking = await aiAssistantService.rankWeatherPlaces({
      weather: { condition: 'Rain', mode: 'rainy' },
      trip: { destination: 'George Town', country: 'Malaysia' },
      day: { dayNumber: 1, location: 'George Town' },
      category: 'food',
      candidates: [
        { id: 'place-1', name: 'Open Street Cafe', rating: 4.2 },
        { id: 'place-2', name: 'Covered Food Hall', rating: 4.1 },
      ],
    });

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        response_format: { type: 'json_object' },
      }),
      expect.any(Object)
    );
    expect(ranking).toEqual(expect.objectContaining({
      available: true,
      provider: 'groq',
      summary: 'Indoor places are better for rain.',
      rankedPlaces: [
        expect.objectContaining({ id: 'place-2', score: 93 }),
        expect.objectContaining({ id: 'place-1', score: 60 }),
      ],
    }));
  });

  test('falls back to Gemini when Groq ranking fails', async () => {
    axios.post
      .mockRejectedValueOnce({ response: { status: 429, data: { error: { message: 'Groq limit' } } } })
      .mockResolvedValueOnce({
        data: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  summary: 'Gemini picked the indoor option.',
                  rankedPlaces: [
                    { id: 'place-2', score: 91, reason: 'Better shelter for rain.' },
                    { id: 'place-1', score: 55, reason: 'Less suitable in wet weather.' },
                  ],
                }),
              }],
            },
          }],
        },
      });

    const ranking = await aiAssistantService.rankWeatherPlaces({
      weather: { condition: 'Rain', mode: 'rainy' },
      trip: { destination: 'George Town', country: 'Malaysia' },
      day: { dayNumber: 1, location: 'George Town' },
      category: 'food',
      candidates: [
        { id: 'place-1', name: 'Open Street Cafe', rating: 4.2 },
        { id: 'place-2', name: 'Covered Food Hall', rating: 4.1 },
      ],
    });

    expect(axios.post).toHaveBeenNthCalledWith(
      2,
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      expect.objectContaining({
        generationConfig: expect.objectContaining({
          responseMimeType: 'application/json',
        }),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-goog-api-key': 'test-gemini-key',
        }),
      })
    );
    expect(ranking).toEqual(expect.objectContaining({
      available: true,
      provider: 'gemini',
      summary: 'Gemini picked the indoor option.',
      rankedPlaces: [
        expect.objectContaining({ id: 'place-2', score: 91 }),
        expect.objectContaining({ id: 'place-1', score: 55 }),
      ],
    }));
  });
});
