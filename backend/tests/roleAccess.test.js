// Mock the feedback repository to isolate service layer tests from database operations
jest.mock('../src/modules/feedback/feedback.repository', () => ({
  create: jest.fn(),
  findAll: jest.fn(),
}));

// Mock the user repository to control user data retrieval during feedback tests
jest.mock('../src/modules/users/user.repository', () => ({
  findById: jest.fn(),
}));

// Mock the settings repository to isolate service layer tests from database operations
jest.mock('../src/modules/settings/settings.repository', () => ({
  getContent: jest.fn(),
  updateContent: jest.fn(),
}));

// Import mocked modules after jest.mock calls for reference in tests
const feedbackRepository = require('../src/modules/feedback/feedback.repository');
const userRepository = require('../src/modules/users/user.repository');
const settingsRepository = require('../src/modules/settings/settings.repository');
const feedbackService = require('../src/modules/feedback/feedback.service');
const settingsService = require('../src/modules/settings/settings.service');

// Test group covers role-based access control for feedback submission,
// feedback listing, and content settings management.
describe('Feedback and settings role access', () => {
  // Reset all mock state before each test to ensure test isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Verify that feedback uses trusted user data from database rather than client input
  test('stores feedback with trusted user identity from the database', async () => {
    // Mock user repository to return authenticated user's actual data
    userRepository.findById.mockResolvedValue({
      id: 'user-1',
      name: 'Traveller',
      email: 'traveller@example.com',  // Trusted email from database
    });
    // Mock feedback repository to return the input data (passthrough implementation)
    feedbackRepository.create.mockImplementation(async (data) => data);

    // Submit feedback with potentially forged email in request body
    const result = await feedbackService.submitFeedback('user-1', {
      rating: 5,
      feedback: 'Helpful planner',
      userEmail: 'forged@example.com',  // Attempted email spoofing - should be ignored
    });

    // Verify that database-stored user identity overrides client-provided email
    expect(result).toEqual({
      userId: 'user-1',
      userName: 'Traveller',
      userEmail: 'traveller@example.com',  // Trusted database value, not forged email
      rating: 5,
      feedback: 'Helpful planner',
    });
  });

  // Verify that feedback submission fails when user does not exist in database
  test('rejects feedback submission for a missing user', async () => {
    // Mock user repository to return null (user not found)
    userRepository.findById.mockResolvedValue(null);

    // Attempt to submit feedback for non-existent user
    await expect(
      feedbackService.submitFeedback('missing-user', { rating: 5 })
    ).rejects.toThrow('User not found');
  });

  // Verify that feedback listing is restricted to administrator role only
  test('allows only administrators to list feedback', async () => {
    // Attempt to list feedback with regular user role - should throw error
    expect(() => feedbackService.getFeedback('user')).toThrow(
      'Administrator access is required'
    );

    // Mock repository to return feedback array for successful admin case
    feedbackRepository.findAll.mockResolvedValue([{ id: 'feedback-1' }]);
    // Verify admin role can successfully retrieve feedback list
    await expect(feedbackService.getFeedback('admin')).resolves.toEqual([
      { id: 'feedback-1' },
    ]);
  });

  // Verify that content settings updates are restricted to administrator role only
  test('allows only administrators to update shared content settings', async () => {
    // Attempt to update content settings with regular user role - should throw error
    expect(() => settingsService.updateContent('user', { terms: 'Changed' })).toThrow(
      'Administrator access is required'
    );

    // Mock repository to return updated settings for successful admin case
    settingsRepository.updateContent.mockResolvedValue({ terms: 'Updated terms' });
    // Verify admin role can successfully update content settings
    await expect(
      settingsService.updateContent('admin', { terms: 'Updated terms' })
    ).resolves.toEqual({ terms: 'Updated terms' });
  });
});