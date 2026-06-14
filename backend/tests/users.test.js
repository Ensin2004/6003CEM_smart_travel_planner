// Mock the user repository to isolate service layer tests from database operations
jest.mock('../src/modules/users/user.repository', () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  findByIdWithPassword: jest.fn(),
  updateById: jest.fn(),
}));

// Import mocked modules after jest.mock calls for reference in tests
const userRepository = require('../src/modules/users/user.repository');
const userService = require('../src/modules/users/user.service');

// Test group covers user profile management, preference normalization,
// email uniqueness validation, and password change with session invalidation.
describe('User profile and password service', () => {
  // Reset all mock state before each test to ensure test isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Verify that legacy budget level field is correctly mapped to spending preference
  test('maps legacy budget level to spending preference', () => {
    // Execute normalization with legacy budgetLevel field
    const result = userService.normalizePreferences({ budgetLevel: 'high' });
    // Verify mapping transforms 'high' budget to 'luxury' spending preference
    expect(result).toEqual({
      spendingPreference: 'luxury',
    });
  });

  // Verify that email cannot be changed to an address already used by another account
  test('rejects changing profile email to another registered account', async () => {
    // Mock repository to return an existing user with the target email
    userRepository.findByEmail.mockResolvedValue({ id: 'user-2' });

    // Attempt to update email to an already registered address
    await expect(
      userService.updateProfile('user-1', { email: 'used@example.com' })
    ).rejects.toThrow('Email is already registered');
    // Verify no update operation was attempted for duplicate email
    expect(userRepository.updateById).not.toHaveBeenCalled();
  });

  // Verify that only allowed profile fields can be updated (role/status cannot be changed)
  test('updates only allowed profile fields', async () => {
    // Mock updateById to return the data that would be saved (passthrough implementation)
    userRepository.updateById.mockImplementation(async (_, data) => data);

    // Execute profile update with attempted privilege escalation fields
    const result = await userService.updateProfile('user-1', {
      name: 'Updated Traveller',   // Allowed field - should be updated
      role: 'admin',                // Disallowed field - should be filtered out
      status: 'disabled',           // Disallowed field - should be filtered out
      preferences: { budgetLevel: 'low' },  // Allowed field - needs normalization
    });

    // Verify only allowed fields are returned and preferences are normalized
    expect(result).toEqual({
      name: 'Updated Traveller',
      preferences: { spendingPreference: 'budget' },  // 'low' mapped to 'budget'
    });
  });

  // Verify that password change rejects when new password matches current password
  test('rejects reusing the current password as the new password', async () => {
    // Mock repository to return user object (password validation not needed for this test)
    userRepository.findByIdWithPassword.mockResolvedValue({});

    // Attempt to change password to the same value as current password
    await expect(
      userService.changePassword('user-1', {
        currentPassword: 'SamePassword1!',
        password: 'SamePassword1!',  // Identical to current password
      })
    ).rejects.toThrow('New password cannot be the same');
  });

  // Verify that password change rejects when current password is incorrect
  test('rejects an incorrect current password', async () => {
    // Mock repository to return user with password comparison that returns false
    userRepository.findByIdWithPassword.mockResolvedValue({
      comparePassword: jest.fn().mockResolvedValue(false),  // Password mismatch
    });

    // Attempt to change password with wrong current password
    await expect(
      userService.changePassword('user-1', {
        currentPassword: 'WrongPassword1!',
        password: 'NewPassword1!',
      })
    ).rejects.toThrow('Current password is incorrect');
  });

  // Verify that successful password change invalidates existing refresh sessions
  test('changes password and invalidates the refresh session', async () => {
    // Create user object with active session tokens and password comparison mock
    const user = {
      password: 'old-hash',
      refreshToken: 'refresh-token',           // Active refresh token
      refreshTokenExpiresAt: new Date(),        // Valid expiration date
      comparePassword: jest.fn().mockResolvedValue(true),  // Password matches
      save: jest.fn().mockResolvedValue(undefined),
    };
    userRepository.findByIdWithPassword.mockResolvedValue(user);

    // Execute password change with valid credentials
    await userService.changePassword('user-1', {
      currentPassword: 'OldPassword1!',
      password: 'NewPassword1!',
    });

    // Verify user record was saved after changes
    expect(user.save).toHaveBeenCalledTimes(1);
    // Verify password hash is cleared from returned object (security best practice)
    expect(user.password).toBeUndefined();
    // Verify refresh token is removed (session invalidation)
    expect(user.refreshToken).toBeUndefined();
    // Verify refresh token expiration is cleared
    expect(user.refreshTokenExpiresAt).toBeUndefined();
  });
});