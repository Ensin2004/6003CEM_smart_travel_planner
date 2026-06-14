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
});