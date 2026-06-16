/**
 * Explore Ai module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// Test group covers AI-powered recommendation functionality including fallbacks,
// response parsing, and error handling.
describe('Explore AI recommendations', () => {
  // Cleanup resets shared state after assertions - clears module cache and mocks.
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  // Scenario verifies that friendly fallback is returned when Gemini API key is missing.
  test('returns friendly fallback when AI key is not configured', async () => {
    // Reset module cache to ensure fresh mocks for this test
    jest.resetModules();

    // Mock environment with empty Gemini API key (service not configured)
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      geminiApiKey: '',  // Missing API key
      geminiModel: 'gemini-2.5-flash-lite',
      geminiDailyLimit: 100,
    }));

    // Import service after mocks are in place
    const service = require('../src/modules/explore/exploreAi.service');
    // Request AI recommendations without valid API configuration
    const recommendations = await service.getAiRecommendations({
      view: 'food',
      destination: 'Penang',
      items: [{ name: 'Cafe A', rating: 4.5, reviewCount: 100, price: '$$', openState: 'Open now' }],
    });

    // Verify service indicates AI is unavailable
    expect(recommendations.available).toBe(false);
    // Verify error message indicates missing configuration
    expect(recommendations.message).toContain('AI recommendations are not configured');
    // Verify fallback returns original items count (no AI processing)
    expect(recommendations.stats.totalResults).toBe(1);
  });

  // Scenario verifies that structured AI output is parsed into useful fields only.
  test('parses structured AI output into useful fields only', async () => {
    // Reset module cache for fresh test
    jest.resetModules();

    // Create mock POST function that returns structured Gemini AI response
    const post = jest.fn().mockResolvedValue({
      data: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: 'Pick the popular open restaurant first.',
                    recommendationMode: 'ai',
                    stats: {
                      totalResults: 1,
                      averageRating: 4.5,
                      openNowCount: 1,
                      pricedCount: 1,
                      bestValueCount: 1,
                    },
                    picks: [
                      {
                        itemName: 'Cafe A',
                        reason: 'High rating and open now.',
                        bestFor: 'quick dinner',
                        caution: 'Check latest hours before going.',
                        score: 88,
                      },
                    ],
                    tips: ['Book nearby transport.'],
                    nextActions: ['Open the map link.'],
                  }),
                },
              ],
            },
          },
        ],
      },
    });

    // Mock axios with POST function
    jest.doMock('axios', () => ({ post }));
    // Mock environment with valid Gemini API key
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      geminiApiKey: 'test-gemini-key',
      geminiModel: 'gemini-2.5-flash-lite',
      geminiDailyLimit: 100,
    }));
    // Mock API log service
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks
    const service = require('../src/modules/explore/exploreAi.service');
    // Request AI recommendations with valid configuration
    const recommendations = await service.getAiRecommendations({
      view: 'food',
      destination: 'Penang',
      items: [{ id: '1', name: 'Cafe A', rating: 4.5, reviewCount: 100, price: '$$', openState: 'Open now' }],
    });

    // Verify service indicates AI is available
    expect(recommendations.available).toBe(true);
    // Verify AI picks are correctly parsed
    expect(recommendations.picks[0].itemName).toBe('Cafe A');
    // Verify raw API response structure is not exposed to client
    expect(recommendations).not.toHaveProperty('candidates');
    // Verify API was called with correct endpoint and JSON response format
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('/v1beta/models/gemini-2.5-flash-lite:generateContent'),
      expect.objectContaining({
        generationConfig: expect.objectContaining({
          responseMimeType: 'application/json',  // Request JSON output format
        }),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-goog-api-key': 'test-gemini-key',  // API key in headers
        }),
      })
    );
  });

  // Scenario verifies that local fallback recommendations are returned when AI service is unreachable.
  test('returns local recommendations when AI service cannot be reached', async () => {
    // Reset module cache for fresh test
    jest.resetModules();

    // Mock POST function to reject with network error (ENOTFOUND = DNS lookup failure)
    const post = jest.fn().mockRejectedValue({ code: 'ENOTFOUND' });

    // Mock axios with failing POST function
    jest.doMock('axios', () => ({ post }));
    // Mock environment with valid API key (service configured but unreachable)
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      geminiApiKey: 'test-gemini-key',
      geminiModel: 'gemini-2.5-flash-lite',
      geminiDailyLimit: 100,
    }));
    // Mock API log service
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    // Import service after mocks
    const service = require('../src/modules/explore/exploreAi.service');
    // Request AI recommendations when AI service is unreachable
    const recommendations = await service.getAiRecommendations({
      view: 'food',
      destination: 'Penang',
      items: [
        { id: '1', name: 'Cafe A', rating: 4.5, reviewCount: 100, price: '$$', openState: 'Open now' },  // Higher rated, open
        { id: '2', name: 'Cafe B', rating: 3.9, reviewCount: 20, openState: 'Closed' },  // Lower rated, closed
      ],
    });

    // Verify service still returns recommendations (local fallback)
    expect(recommendations.available).toBe(true);
    // Verify fallback mode is local (not AI-powered)
    expect(recommendations.recommendationMode).toBe('local');
    // Verify local sorting logic: higher rated and open now gets top pick
    expect(recommendations.picks[0].itemName).toBe('Cafe A');
  });
});