describe('Explore AI recommendations', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('returns friendly fallback when AI key is not configured', async () => {
    jest.resetModules();

    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      geminiApiKey: '',
      geminiModel: 'gemini-2.5-flash-lite',
      geminiDailyLimit: 100,
    }));

    const service = require('../src/modules/explore/exploreAi.service');
    const recommendations = await service.getAiRecommendations({
      view: 'food',
      destination: 'Penang',
      items: [{ name: 'Cafe A', rating: 4.5, reviewCount: 100, price: '$$', openState: 'Open now' }],
    });

    expect(recommendations.available).toBe(false);
    expect(recommendations.message).toContain('AI recommendations are not configured');
    expect(recommendations.stats.totalResults).toBe(1);
  });

  test('parses structured AI output into useful fields only', async () => {
    jest.resetModules();

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

    jest.doMock('axios', () => ({ post }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      geminiApiKey: 'test-gemini-key',
      geminiModel: 'gemini-2.5-flash-lite',
      geminiDailyLimit: 100,
    }));
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    const service = require('../src/modules/explore/exploreAi.service');
    const recommendations = await service.getAiRecommendations({
      view: 'food',
      destination: 'Penang',
      items: [{ id: '1', name: 'Cafe A', rating: 4.5, reviewCount: 100, price: '$$', openState: 'Open now' }],
    });

    expect(recommendations.available).toBe(true);
    expect(recommendations.picks[0].itemName).toBe('Cafe A');
    expect(recommendations).not.toHaveProperty('candidates');
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('/v1beta/models/gemini-2.5-flash-lite:generateContent'),
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
  });

  test('returns local recommendations when AI service cannot be reached', async () => {
    jest.resetModules();

    const post = jest.fn().mockRejectedValue({ code: 'ENOTFOUND' });

    jest.doMock('axios', () => ({ post }));
    jest.doMock('../src/config/env', () => ({
      nodeEnv: 'development',
      geminiApiKey: 'test-gemini-key',
      geminiModel: 'gemini-2.5-flash-lite',
      geminiDailyLimit: 100,
    }));
    jest.doMock('../src/modules/apiLogs/apiLog.service', () => ({
      recordEvent: jest.fn().mockResolvedValue({}),
    }));

    const service = require('../src/modules/explore/exploreAi.service');
    const recommendations = await service.getAiRecommendations({
      view: 'food',
      destination: 'Penang',
      items: [
        { id: '1', name: 'Cafe A', rating: 4.5, reviewCount: 100, price: '$$', openState: 'Open now' },
        { id: '2', name: 'Cafe B', rating: 3.9, reviewCount: 20, openState: 'Closed' },
      ],
    });

    expect(recommendations.available).toBe(true);
    expect(recommendations.recommendationMode).toBe('local');
    expect(recommendations.picks[0].itemName).toBe('Cafe A');
  });
});
