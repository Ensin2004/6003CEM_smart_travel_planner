/**
 * Contains authentication rules for registration, login, refresh, logout, and email verification.
 * This service also handles account lockouts and audit logging so controllers only coordinate
 * request and response data.
 */
const AppError = require('../../utils/AppError');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { generateAccessToken, generateRefreshToken } = require('../../utils/generateTokens');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const authRepository = require('./auth.repository');
const apiLogService = require('../apiLogs/apiLog.service');
const notificationService = require('../notifications/notification.service');
const { emitAdminUserCreated } = require('../notifications/notification.socket');
const { normalizePreferences } = require('../users/user.service');
const { sendVerificationEmail } = require('../../utils/email.service');

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCK_STEP_MINUTES = 15;

const getLockRetrySeconds = (lockUntil) => Math.max(Math.ceil((lockUntil.getTime() - Date.now()) / 1000), 1);
const formatLockMinutes = (lockUntil) => Math.ceil(getLockRetrySeconds(lockUntil) / 60);

// Lockout errors carry retry timing so the API response can set headers and guide the login screen.
const createAccountLockedError = (lockUntil) => {
  const retryAfterSeconds = getLockRetrySeconds(lockUntil);
  const error = new AppError(
    `Too many failed login attempts. Please try again in ${formatLockMinutes(lockUntil)} minute(s).`,
    429,
    'ACCOUNT_LOCKED'
  );
  error.retryAfterSeconds = retryAfterSeconds;
  error.retryAfter = retryAfterSeconds;
  return error;
};

// Authentication events are best-effort logs; failed logging must not block login or registration flows.
const recordAuthLog = (data) =>
  apiLogService.recordEvent(data).catch((error) => logger.error(`Failed to record auth event: ${error.message}`));

// Refresh-token expiry accepts compact values such as 7d, 12h, 30m, or seconds.
const getRefreshTokenExpiresAt = () => {
  const expiresIn = env.refreshJwtExpiresIn;
  const match = String(expiresIn).trim().match(/^(\d+)([smhd])?$/i);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  const unitMilliseconds = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + value * unitMilliseconds[unit]);
};

// Verification links use the first configured frontend origin and fall back to the local Vite app.
const getClientBaseUrl = () => {
  const fallbackOrigin = 'http://localhost:5173';
  const origin = String(env.clientOrigin || '')
    .split(',')
    .map((value) => value.trim())
    .find((value) => value && !['null', 'undefined'].includes(value.toLowerCase()));

  return origin || fallbackOrigin;
};

// Sensitive fields are removed before user data leaves the service layer.
const sanitizeUser = (user) => {
  user.password = undefined;
  user.refreshToken = undefined;
  user.refreshTokenExpiresAt = undefined;
  user.failedLoginAttempts = undefined;
  user.loginLockUntil = undefined;
  user.loginLockLevel = undefined;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiresAt = undefined;
  return user;
};

// Plain verification tokens are emailed once; only the hashed token is stored.
const createEmailVerificationToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + env.emailVerificationExpiresInHours * 60 * 60 * 1000);

  return { token, hashedToken, expiresAt };
};

const sendUserVerificationEmail = async (user) => {
  const { token, hashedToken, expiresAt } = createEmailVerificationToken();
  const verificationUrl = `${getClientBaseUrl()}/verify-email?token=${token}`;

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiresAt = expiresAt;
  await user.save({ validateBeforeSave: false });

  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    verificationUrl,
    expiresAt,
  });

  return expiresAt;
};

// The login screen uses this custom error code to show a resend-verification action.
const createEmailNotVerifiedError = (user) => {
  const error = new AppError(
    'Please verify your email before logging in. We sent a new verification link to your inbox.',
    403,
    'EMAIL_NOT_VERIFIED'
  );
  error.email = user.email;
  error.verificationExpiresAt = user.emailVerificationExpiresAt;
  return error;
};

const register = async (data) => {
  const existingUser = await authRepository.findByEmail(data.email);
  if (existingUser) throw new AppError('Email is already registered', 409);

  // Role is ignored from public registration so new accounts always start as regular users.
  const { confirmPassword, preferences, role, ...userData } = data;
  const user = await authRepository.create({
    ...userData,
    preferences: normalizePreferences(preferences),
    role: 'user',
    isEmailVerified: false,
  });
  const verificationExpiresAt = await sendUserVerificationEmail(user);
  emitAdminUserCreated(user._id.toString());
  notificationService
    .notifyAdminsOfNewSignup(user)
    .catch((error) => logger.error(`Failed to notify admins about signup: ${error.message}`));

  sanitizeUser(user);

  return { user, email: user.email, verificationExpiresAt };
};

const login = async ({ email, password }, { requestId } = {}) => {
  const user = await authRepository.findByEmail(email, true);

  // Unknown accounts are logged without a user id so repeated probing can still be reviewed.
  if (!user) {
    recordAuthLog({
      service: 'auth',
      category: 'auth',
      severity: 'warning',
      endpoint: '/auth/login',
      status: 'fail',
      statusCode: 401,
      errorCode: 'INVALID_CREDENTIALS',
      requestId,
      message: 'Failed login attempt for unknown account',
      attemptedEmail: email,
    });
    throw new AppError('Invalid email or password', 401);
  }

  // Disabled accounts stop before password comparison to avoid issuing tokens for blocked users.
  if (user.status === 'disabled') {
    throw new AppError('This account has been disabled', 403);
  }

  // A locked account returns retry timing instead of checking the password again.
  if (user.loginLockUntil && user.loginLockUntil > new Date()) {
    logger.warn(`Blocked login attempt for locked account id: ${user._id}`);
    recordAuthLog({
      service: 'auth',
      category: 'auth',
      severity: 'warning',
      endpoint: '/auth/login',
      status: 'fail',
      statusCode: 429,
      errorCode: 'ACCOUNT_LOCKED_ATTEMPT',
      requestId,
      message: 'Blocked login attempt for locked account',
      userId: user._id,
    });
    throw createAccountLockedError(user.loginLockUntil);
  }

  if (!(await user.comparePassword(password))) {
    const failedAttempts = (user.failedLoginAttempts || 0) + 1;

    // Lock duration increases with each lock level, which slows repeated guessing without permanent bans.
    if (failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      const lockLevel = (user.loginLockLevel || 0) + 1;
      const lockMinutes = lockLevel * LOCK_STEP_MINUTES;

      user.failedLoginAttempts = 0;
      user.loginLockLevel = lockLevel;
      user.loginLockUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
      await user.save({ validateBeforeSave: false });

      logger.warn(`Account locked after failed login attempts for account id: ${user._id}`);
      recordAuthLog({
        service: 'auth',
        category: 'auth',
        severity: 'warning',
        endpoint: '/auth/login',
        status: 'fail',
        statusCode: 429,
        errorCode: 'ACCOUNT_LOCKED',
        requestId,
        message: 'Account locked after repeated failed login attempts',
        userId: user._id,
      });
      throw createAccountLockedError(user.loginLockUntil);
    }

    // Failed attempts under the lock threshold are stored for the next login attempt.
    user.failedLoginAttempts = failedAttempts;
    await user.save({ validateBeforeSave: false });
    logger.warn(`Failed login attempt ${failedAttempts}/${MAX_FAILED_LOGIN_ATTEMPTS} for account id: ${user._id}`);
    recordAuthLog({
      service: 'auth',
      category: 'auth',
      severity: 'warning',
      endpoint: '/auth/login',
      status: 'fail',
      statusCode: 401,
      errorCode: 'INVALID_CREDENTIALS',
      requestId,
      message: 'Failed login attempt',
      userId: user._id,
      metadata: {
        failedAttempts,
      },
    });
    throw new AppError('Invalid email or password', 401);
  }

  // Successful password checks still require verified email before tokens are issued.
  if (!user.isEmailVerified) {
    await sendUserVerificationEmail(user);
    throw createEmailNotVerifiedError(user);
  }

  // A clean login resets lockout state and stores the newest refresh token for rotation checks.
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.failedLoginAttempts = 0;
  user.loginLockUntil = undefined;
  user.loginLockLevel = 0;
  user.refreshToken = refreshToken;
  user.refreshTokenExpiresAt = getRefreshTokenExpiresAt();
  await user.save({ validateBeforeSave: false });

  sanitizeUser(user);

  return { user, accessToken, refreshToken };
};

const verifyEmail = async (token) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await authRepository.findByEmailVerificationToken(hashedToken);

  if (!user) {
    throw new AppError('This verification link is invalid or has already been used', 400);
  }

  if (user.status === 'disabled') {
    throw new AppError('This account has been disabled', 403);
  }

  // Expired verification tokens are cleared so a new request can generate a fresh token.
  if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt <= new Date()) {
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError('This verification link has expired. Please request a new verification email.', 400);
  }

  // Email verification also signs in the account by issuing fresh access and refresh tokens.
  user.isEmailVerified = true;
  user.emailVerifiedAt = new Date();
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiresAt = undefined;
  user.failedLoginAttempts = 0;
  user.loginLockUntil = undefined;
  user.loginLockLevel = 0;

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  user.refreshTokenExpiresAt = getRefreshTokenExpiresAt();
  await user.save({ validateBeforeSave: false });

  sanitizeUser(user);

  return { user, email: user.email, accessToken, refreshToken };
};

const resendVerificationEmail = async (email) => {
  const user = await authRepository.findByEmail(email, true);

  if (!user) {
    throw new AppError('No account was found with that email address', 404);
  }

  if (user.status === 'disabled') {
    throw new AppError('This account has been disabled', 403);
  }

  // Already verified accounts skip email sending and let the UI show a helpful status.
  if (user.isEmailVerified) {
    return { email: user.email, alreadyVerified: true };
  }

  const verificationExpiresAt = await sendUserVerificationEmail(user);

  return { email: user.email, verificationExpiresAt };
};

const refresh = async (refreshToken) => {
  let decoded;

  // Refresh tokens are verified with a separate secret from access tokens.
  try {
    decoded = jwt.verify(refreshToken, env.refreshJwtSecret);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await authRepository.findByIdWithRefreshToken(decoded.userId);
  if (!user || user.status === 'disabled') {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Token rotation rejects stale refresh tokens and clears them from the account record.
  if (user.refreshToken !== refreshToken || !user.refreshTokenExpiresAt || user.refreshTokenExpiresAt <= new Date()) {
    user.refreshToken = undefined;
    user.refreshTokenExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const accessToken = generateAccessToken(user);
  const nextRefreshToken = generateRefreshToken(user);

  // The newly issued refresh token replaces the old token, limiting reuse after refresh.
  user.refreshToken = nextRefreshToken;
  user.refreshTokenExpiresAt = getRefreshTokenExpiresAt();
  await user.save({ validateBeforeSave: false });

  user.refreshToken = undefined;
  user.refreshTokenExpiresAt = undefined;

  return { user, accessToken, refreshToken: nextRefreshToken };
};

const logout = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, env.refreshJwtSecret);
    const user = await authRepository.findByIdWithRefreshToken(decoded.userId);

    // Matching refresh tokens are removed so future refresh requests fail after logout.
    if (user && user.refreshToken === refreshToken) {
      user.refreshToken = undefined;
      user.refreshTokenExpiresAt = undefined;
      await user.save();
    }
  } catch {
    // Logout stays idempotent even when the token has already expired.
  }

  return { loggedOut: true };
};

const checkPasswordResetEmail = async (email) => {
  const user = await authRepository.findByEmail(email);

  if (!user) {
    throw new AppError('No account was found with that email address', 404);
  }

  if (user.status === 'disabled') {
    throw new AppError('This account has been disabled', 403);
  }

  return { email: user.email };
};

const resetPassword = async ({ email, password }) => {
  const user = await authRepository.findByEmail(email, true);

  if (!user) {
    throw new AppError('No account was found with that email address', 404);
  }

  if (user.status === 'disabled') {
    throw new AppError('This account has been disabled', 403);
  }

  // Password reset invalidates existing refresh sessions and clears lockout counters.
  user.password = password;
  user.refreshToken = undefined;
  user.refreshTokenExpiresAt = undefined;
  user.failedLoginAttempts = 0;
  user.loginLockUntil = undefined;
  user.loginLockLevel = 0;
  await user.save();

  return { email: user.email };
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  resendVerificationEmail,
  checkPasswordResetEmail,
  resetPassword,
};
