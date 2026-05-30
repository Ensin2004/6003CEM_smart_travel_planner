const jwt = require('jsonwebtoken');
const request = require('supertest');
const env = require('../src/config/env');
const userRepository = require('../src/modules/users/user.repository');
const languageService = require('../src/modules/language/language.service');
const app = require('../src/app');

jest.mock('../src/modules/users/user.repository');
jest.mock('../src/modules/language/language.service', () => ({
  deleteHistory: jest.fn(),
  getHistory: jest.fn(),
  getSupportedLanguages: jest.fn(),
  translateText: jest.fn(),
}));

const createToken = () => jwt.sign({ userId: '507f1f77bcf86cd799439011' }, env.jwtSecret);

describe('Language helper API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userRepository.findById.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      email: 'traveller@example.com',
      role: 'user',
      status: 'active',
    });
  });

  test('rejects language requests without JWT', async () => {
    const response = await request(app).get('/api/v1/language/languages');

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe('Authentication token is required');
  });

  test('lists provider-backed language options', async () => {
    languageService.getSupportedLanguages.mockResolvedValueOnce({
      available: true,
      source: 'libretranslate',
      languages: [
        { id: 'language-en', code: 'en', name: 'English', provider: 'libretranslate' },
        { id: 'language-ja', code: 'ja', name: 'Japanese', provider: 'libretranslate' },
      ],
    });

    const response = await request(app)
      .get('/api/v1/language/languages')
      .set('Authorization', `Bearer ${createToken()}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.languages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'en', name: 'English' }),
        expect.objectContaining({ code: 'ja', name: 'Japanese' }),
      ])
    );
  });

  test('returns validation errors for unsupported translation input shape', async () => {
    const response = await request(app)
      .post('/api/v1/language/translate')
      .set('Authorization', `Bearer ${createToken()}`)
      .send({ text: '', sourceLanguage: 'not a code', targetLanguage: 'ja' });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Validation failed');
  });

  test('translates text and delegates history creation to service layer', async () => {
    languageService.translateText.mockResolvedValueOnce({
      available: true,
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      originalText: 'Where is the nearest train station?',
      translatedText: '最寄りの駅はどこですか？',
      cached: false,
    });

    const response = await request(app)
      .post('/api/v1/language/translate')
      .set('Authorization', `Bearer ${createToken()}`)
      .send({
        text: 'Where is the nearest train station?',
        sourceLanguage: 'en',
        targetLanguage: 'ja',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.data.translation.translatedText).toBe('最寄りの駅はどこですか？');
    expect(languageService.translateText).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        userId: '507f1f77bcf86cd799439011',
      })
    );
  });

  test('returns translation history for the authenticated user', async () => {
    languageService.getHistory.mockResolvedValueOnce({
      items: [
        {
          id: '507f1f77bcf86cd799439012',
          sourceText: 'Hello',
          translatedText: 'Bonjour',
          sourceLanguage: { code: 'en', name: 'English' },
          targetLanguage: { code: 'fr', name: 'French' },
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/language/history')
      .set('Authorization', `Bearer ${createToken()}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.history.items[0].translatedText).toBe('Bonjour');
  });

  test('deletes owned translation history item', async () => {
    const response = await request(app)
      .delete('/api/v1/language/history/507f1f77bcf86cd799439012')
      .set('Authorization', `Bearer ${createToken()}`);

    expect(response.statusCode).toBe(204);
    expect(languageService.deleteHistory).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439011'
    );
  });
});
