// Mock the auth repository to isolate service layer tests from database operations
jest.mock('../src/modules/auth/auth.repository', () => ({
  create: jest.fn(),
  findByEmail: jest.fn(),
}));

// Mock the API log service to prevent actual logging during tests
jest.mock('../src/modules/apiLogs/apiLog.service', () => ({
  recordEvent: jest.fn().mockResolvedValue(undefined),
}));

// Mock the notification service to prevent actual notification sending during tests
jest.mock('../src/modules/notifications/notification.service', () => ({
  notifyAdminsOfNewSignup: jest.fn().mockResolvedValue(undefined),
}));

// Mock the email service to prevent actual email transmission during tests
jest.mock('../src/utils/email.service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

// Mock the logger to prevent console output during test execution
jest.mock('../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

// Import mocked modules after jest.mock calls for reference in tests
const authRepository = require('../src/modules/auth/auth.repository');
const apiLogService = require('../src/modules/apiLogs/apiLog.service');
const notificationService = require('../src/modules/notifications/notification.service');
const { sendVerificationEmail } = require('../src/utils/email.service');
const authService = require('../src/modules/auth/auth.service');

// Factory function that creates a standard user object with customizable overrides
// Reduces code duplication across test cases while maintaining flexibility
const createUser = (overrides = {}) => ({
  _id: 'user-1',
  id: 'user-1',
  name: 'Traveller',
  email: 'traveller@example.com',
  status: 'active',
  isEmailVerified: true,
  failedLoginAttempts: 0,
  loginLockLevel: 0,
  comparePassword: jest.fn().mockResolvedValue(true),  // Mock password comparison
  save: jest.fn().mockResolvedValue(undefined),       // Mock database save operation
  ...overrides,  // Override any properties for specific test scenarios
});

// Test group covers security-related authentication behavior including registration,
// login attempts, lockout mechanisms, and password reset functionality.
describe('Authentication security service', () => {
  // Reset all mock state and configure default mock behaviors before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Configure API log mock to resolve successfully by default
    apiLogService.recordEvent.mockResolvedValue(undefined);
    // Configure notification mock to resolve successfully by default
    notificationService.notifyAdminsOfNewSignup.mockResolvedValue(undefined);
    // Configure email mock to resolve successfully by default
    sendVerificationEmail.mockResolvedValue(undefined);
  });

  // Verify that public registration forces the 'user' role regardless of input
  test('forces public registration accounts to use the user role', async () => {
    // Create user with unverified email status for registration scenario
    const user = createUser({ isEmailVerified: false });
    // Mock repository to indicate email is not already registered
    authRepository.findByEmail.mockResolvedValue(null);
    // Mock repository to return created user object
    authRepository.create.mockResolvedValue(user);

    // Attempt to register with admin role - should be overridden to 'user'
    await authService.register({
      name: 'Traveller',
      email: 'traveller@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      role: 'admin',  // Attempted privilege escalation
    });

    // Verify that role was forced to 'user' and email verification is required
    expect(authRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'user',           // Admin role rejected for public registration
        isEmailVerified: false, // Requires email verification flow
      })
    );
    // Verify verification email was triggered
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  // Verify that disabled accounts are rejected before password verification
  test('rejects login for a disabled account before checking its password', async () => {
    // Create user with disabled status
    const user = createUser({ status: 'disabled' });
    // Mock repository to return the disabled user
    authRepository.findByEmail.mockResolvedValue(user);

    // Attempt login and verify appropriate error is thrown
    await expect(
      authService.login({ email: user.email, password: 'Password1!' })
    ).rejects.toThrow('This account has been disabled');
    // Verify password comparison was never attempted (early rejection)
    expect(user.comparePassword).not.toHaveBeenCalled();
  });

  // Verify that failed login attempts are tracked below the lockout threshold
  test('records a failed login attempt below the lockout threshold', async () => {
    // Create user with 2 existing failed attempts and mock password mismatch
    const user = createUser({
      failedLoginAttempts: 2,
      comparePassword: jest.fn().mockResolvedValue(false),  // Password incorrect
    });
    authRepository.findByEmail.mockResolvedValue(user);

    // Attempt login with wrong password
    await expect(
      authService.login(
        { email: user.email, password: 'WrongPassword1!' },
        { requestId: 'request-1' }  // Include request ID for logging
      )
    ).rejects.toThrow('Invalid email or password');

    // Verify failed attempt counter incremented from 2 to 3
    expect(user.failedLoginAttempts).toBe(3);
    // Verify user record was saved without full validation
    expect(user.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    // Verify security event was logged with error code and metadata
    expect(apiLogService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: 'INVALID_CREDENTIALS',
        requestId: 'request-1',
        userId: 'user-1',
      })
    );
  });

  // Verify that account locks after the fifth consecutive failed login attempt
  test('locks an account after the fifth failed login attempt', async () => {
    // Create user with 4 existing failed attempts (one more triggers lock)
    const user = createUser({
      failedLoginAttempts: 4,
      comparePassword: jest.fn().mockResolvedValue(false),  // Fifth failed attempt
    });
    authRepository.findByEmail.mockResolvedValue(user);

    // Attempt login and verify lockout error response
    await expect(
      authService.login({ email: user.email, password: 'WrongPassword1!' })
    ).rejects.toMatchObject({
      statusCode: 429,           // Too Many Requests status code
      code: 'ACCOUNT_LOCKED',    // Specific lockout error code
    });

    // Verify failed attempts reset after lockout
    expect(user.failedLoginAttempts).toBe(0);
    // Verify lock level escalates
    expect(user.loginLockLevel).toBe(1);
    // Verify lock expiration timestamp is set
    expect(user.loginLockUntil).toBeInstanceOf(Date);
  });

  // Verify that password reset clears session tokens and security flags
  test('password reset invalidates sessions and clears account lockout state', async () => {
    // Create user with active session and lockout state
    const user = createUser({
      refreshToken: 'existing-refresh-token',           // Active session token
      refreshTokenExpiresAt: new Date(),                 // Valid expiration
      failedLoginAttempts: 4,                            // Accumulated failures
      loginLockLevel: 2,                                 // Escalated lock level
      loginLockUntil: new Date(Date.now() + 60_000),    // Active lock (1 minute)
    });
    authRepository.findByEmail.mockResolvedValue(user);

    // Execute password reset operation
    await authService.resetPassword({
      email: user.email,
      password: 'NewPassword1!',
    });

    // Verify password was updated to new value
    expect(user.password).toBe('NewPassword1!');
    // Verify refresh token was removed (session invalidation)
    expect(user.refreshToken).toBeUndefined();
    // Verify refresh token expiration was cleared
    expect(user.refreshTokenExpiresAt).toBeUndefined();
    // Verify failed attempt counter reset
    expect(user.failedLoginAttempts).toBe(0);
    // Verify lock expiration removed
    expect(user.loginLockUntil).toBeUndefined();
    // Verify lock level reset to zero
    expect(user.loginLockLevel).toBe(0);
    // Verify user record was saved exactly once
    expect(user.save).toHaveBeenCalledTimes(1);
  });
});