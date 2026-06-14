/**
 * Language module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// Import JWT for generating authentication tokens in tests
const jwt = require('jsonwebtoken');
// Import HTTP testing utilities and the application instance
const request = require('supertest');
const env = require('../src/config/env');
const userRepository = require('../src/modules/users/user.repository');
const languageService = require('../src/modules/language/language.service');
const app = require('../src/app');

// Mock the user repository to control user authentication data during route tests
jest.mock('../src/modules/users/user.repository');
// Mock the language service to isolate controller tests from service logic
jest.mock('../src/modules/language/language.service', () => ({
  deleteHistory: jest.fn(),
  getHistory: jest.fn(),
  getSupportedLanguages: jest.fn(),
  translateText: jest.fn(),
}));

// Create Token builds a new record from validated input - generates valid JWT for authenticated test requests.
const createToken = () => jwt.sign({ userId: '507f1f77bcf86cd799439011' }, env.jwtSecret);

// Test group covers route protection, language listing, translation, history retrieval, and deletion.
describe('Language helper API', () => {
  // Setup prepares shared data before assertions - reset mocks and configure default authenticated user.
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock user repository to return an active authenticated user by default
    userRepository.findById.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      email: 'traveller@example.com',
      role: 'user',
      status: 'active',
    });
  });

  // Scenario verifies that unauthenticated requests are rejected with proper error response.
  test('rejects language requests without JWT', async () => {
    // Send GET request to language list endpoint without authentication header
    const response = await request(app).get('/api/v1/language/languages');

    // Verify unauthorized status code is returned
    expect(response.statusCode).toBe(401);
    // Verify appropriate error message is returned to client
    expect(response.body.message).toBe('Authentication token is required');
  });

  // Scenario verifies that supported language options are returned from the translation provider.
  test('lists provider-backed language options', async () => {
    // Mock service to return available languages from LibreTranslate provider
    languageService.getSupportedLanguages.mockResolvedValueOnce({
      available: true,
      source: 'libretranslate',  // Translation service provider
      languages: [
        { id: 'language-en', code: 'en', name: 'English', provider: 'libretranslate' },
        { id: 'language-ja', code: 'ja', name: 'Japanese', provider: 'libretranslate' },
      ],
    });
    
    // Send GET request with valid authentication
    const response = await request(app)
      .get('/api/v1/language/languages')
      .set('Authorization', `Bearer ${createToken()}`);

    // Verify successful response
    expect(response.statusCode).toBe(200);
    // Verify response contains expected language entries
    expect(response.body.data.languages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'en', name: 'English' }),
        expect.objectContaining({ code: 'ja', name: 'Japanese' }),
      ])
    );
  });

  // Scenario verifies that invalid translation request inputs trigger validation errors.
  test('returns validation errors for unsupported translation input shape', async () => {
    // Send POST request with invalid translation data
    const response = await request(app)
      .post('/api/v1/language/translate')
      .set('Authorization', `Bearer ${createToken()}`)
      .send({ 
        text: '',              // Empty text - should be rejected
        sourceLanguage: 'not a code',  // Invalid language code format
        targetLanguage: 'ja' 
      });

    // Verify bad request status code
    expect(response.statusCode).toBe(400);
    // Verify validation failure message
    expect(response.body.message).toBe('Validation failed');
  });

  // Scenario verifies successful text translation with history tracking delegated to service.
  test('translates text and delegates history creation to service layer', async () => {
    // Mock service to return Japanese translation of English text
    languageService.translateText.mockResolvedValueOnce({
      available: true,
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      originalText: 'Where is the nearest train station?',
      translatedText: '最寄りの駅はどこですか？',  // Japanese translation
      cached: false,  // Indicates fresh translation (not from cache)
    });
    
    // Send POST request with translation payload
    const response = await request(app)
      .post('/api/v1/language/translate')
      .set('Authorization', `Bearer ${createToken()}`)
      .send({
        text: 'Where is the nearest train station?',
        sourceLanguage: 'en',
        targetLanguage: 'ja',
      });

    // Verify successful response
    expect(response.statusCode).toBe(200);
    // Verify translated text is returned correctly
    expect(response.body.data.translation.translatedText).toBe('最寄りの駅はどこですか？');
    // Verify service received correct parameters including user ID for history tracking
    expect(languageService.translateText).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        userId: '507f1f77bcf86cd799439011',  // User ID extracted from JWT
      })
    );
  });

  // Scenario verifies that translation history is returned for the authenticated user.
  test('returns translation history for the authenticated user', async () => {
    // Mock service to return paginated translation history
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
    
    // Send GET request to history endpoint
    const response = await request(app)
      .get('/api/v1/language/history')
      .set('Authorization', `Bearer ${createToken()}`);

    // Verify successful response
    expect(response.statusCode).toBe(200);
    // Verify history contains expected translation
    expect(response.body.data.history.items[0].translatedText).toBe('Bonjour');
  });

  // Scenario verifies that a translation history item can be deleted by its owner.
  test('deletes owned translation history item', async () => {
    // Send DELETE request to remove specific history item
    const response = await request(app)
      .delete('/api/v1/language/history/507f1f77bcf86cd799439012')
      .set('Authorization', `Bearer ${createToken()}`);

    // Verify successful deletion status code (no content)
    expect(response.statusCode).toBe(204);
    // Verify service was called with correct history item ID and user ID for ownership validation
    expect(languageService.deleteHistory).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439011'
    );
  });
});