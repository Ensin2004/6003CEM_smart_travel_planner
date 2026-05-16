const AppError = require('../../utils/AppError');
const { generateAccessToken, generateRefreshToken } = require('../../utils/generateTokens');
const env = require('../../config/env');
const authRepository = require('./auth.repository');

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

  return { user, accessToken, refreshToken };
};

const login = async ({ email, password }) => {
  const user = await authRepository.findByEmail(email, true);

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.status === 'disabled') {
    throw new AppError('This account has been disabled', 403);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  user.refreshTokenExpiresAt = getRefreshTokenExpiresAt();
  await user.save({ validateBeforeSave: false });

  user.password = undefined;
  user.refreshToken = undefined;
  user.refreshTokenExpiresAt = undefined;

  return { user, accessToken, refreshToken };
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
  await user.save();

  return { email: user.email };
};

module.exports = { register, login, checkPasswordResetEmail, resetPassword };
