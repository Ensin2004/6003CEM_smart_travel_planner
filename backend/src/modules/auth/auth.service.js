const AppError = require('../../utils/AppError');
const jwt = require('jsonwebtoken');
const { generateAccessToken, generateRefreshToken } = require('../../utils/generateTokens');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const authRepository = require('./auth.repository');
const apiLogService = require('../apiLogs/apiLog.service');

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCK_STEP_MINUTES = 15;

const getLockRetrySeconds = (lockUntil) => Math.max(Math.ceil((lockUntil.getTime() - Date.now()) / 1000), 1);

const formatLockMinutes = (lockUntil) => Math.ceil(getLockRetrySeconds(lockUntil) / 60);

const createAccountLockedError = (lockUntil) => {
  const retryAfterSeconds = getLockRetrySeconds(lockUntil);
  const error = new AppError(`Too many failed login attempts. Please try again in ${formatLockMinutes(lockUntil)} minute(s).`, 429);
  error.retryAfterSeconds = retryAfterSeconds;
  error.retryAfter = retryAfterSeconds;
  return error;
};

const recordAuthLog = (data) =>
  apiLogService.recordEvent(data).catch((error) => logger.error(`Failed to record auth event: ${error.message}`));

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

const register = async (data) => {
  const existingUser = await authRepository.findByEmail(data.email);
  if (existingUser) throw new AppError('Email is already registered', 409);

  const { confirmPassword, preferences, role, ...userData } = data;
  const user = await authRepository.create({ ...userData, role: 'user' });
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  user.refreshTokenExpiresAt = getRefreshTokenExpiresAt();
  await user.save({ validateBeforeSave: false });
  user.password = undefined;
  user.refreshToken = undefined;
  user.refreshTokenExpiresAt = undefined;
  user.failedLoginAttempts = undefined;
  user.loginLockUntil = undefined;
  user.loginLockLevel = undefined;

  return { user, accessToken, refreshToken };
};

const login = async ({ email, password }) => {
  const user = await authRepository.findByEmail(email, true);

  if (!user) {
    recordAuthLog({
      service: 'auth',
      category: 'auth',
      severity: 'warning',
      endpoint: '/auth/login',
      status: 'fail',
      statusCode: 401,
      message: 'Failed login attempt for unknown account',
      attemptedEmail: email,
    });
    throw new AppError('Invalid email or password', 401);
  }

  if (user.status === 'disabled') {
    throw new AppError('This account has been disabled', 403);
  }

  if (user.loginLockUntil && user.loginLockUntil > new Date()) {
    logger.warn(`Blocked login attempt for locked account id: ${user._id}`);
    recordAuthLog({
      service: 'auth',
      category: 'auth',
      severity: 'warning',
      endpoint: '/auth/login',
      status: 'fail',
      statusCode: 429,
      message: 'Blocked login attempt for locked account',
      userId: user._id,
    });
    throw createAccountLockedError(user.loginLockUntil);
  }

  if (!(await user.comparePassword(password))) {
    const failedAttempts = (user.failedLoginAttempts || 0) + 1;

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
        message: 'Account locked after repeated failed login attempts',
        userId: user._id,
      });
      throw createAccountLockedError(user.loginLockUntil);
    }

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
      message: 'Failed login attempt',
      userId: user._id,
      metadata: {
        failedAttempts,
      },
    });
    throw new AppError('Invalid email or password', 401);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.failedLoginAttempts = 0;
  user.loginLockUntil = undefined;
  user.loginLockLevel = 0;
  user.refreshToken = refreshToken;
  user.refreshTokenExpiresAt = getRefreshTokenExpiresAt();
  await user.save({ validateBeforeSave: false });

  user.password = undefined;
  user.refreshToken = undefined;
  user.refreshTokenExpiresAt = undefined;
  user.failedLoginAttempts = undefined;
  user.loginLockUntil = undefined;
  user.loginLockLevel = undefined;

  return { user, accessToken, refreshToken };
};

const refresh = async (refreshToken) => {
  let decoded;

  try {
    decoded = jwt.verify(refreshToken, env.refreshJwtSecret);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await authRepository.findByIdWithRefreshToken(decoded.userId);

  if (!user || user.status === 'disabled') {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  if (user.refreshToken !== refreshToken || !user.refreshTokenExpiresAt || user.refreshTokenExpiresAt <= new Date()) {
    user.refreshToken = undefined;
    user.refreshTokenExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const accessToken = generateAccessToken(user);
  const nextRefreshToken = generateRefreshToken(user);

  user.refreshToken = nextRefreshToken;
  user.refreshTokenExpiresAt = getRefreshTokenExpiresAt();
  await user.save({ validateBeforeSave: false });

  user.refreshToken = undefined;
  user.refreshTokenExpiresAt = undefined;

  return { user, accessToken, refreshToken: nextRefreshToken };
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

  user.password = password;
  user.refreshToken = undefined;
  user.refreshTokenExpiresAt = undefined;
  user.failedLoginAttempts = 0;
  user.loginLockUntil = undefined;
  user.loginLockLevel = 0;
  await user.save();

  return { email: user.email };
};

module.exports = { register, login, refresh, checkPasswordResetEmail, resetPassword };
