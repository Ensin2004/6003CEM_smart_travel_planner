const AppError = require('../../utils/AppError');
const { generateAccessToken, generateRefreshToken } = require('../../utils/generateTokens');
const authRepository = require('./auth.repository');

const register = async (data) => {
  const existingUser = await authRepository.findByEmail(data.email);
  if (existingUser) throw new AppError('Email is already registered', 409);

  const { confirmPassword, role, ...userData } = data;
  const user = await authRepository.create({ ...userData, role: 'user' });
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  user.password = undefined;
  user.refreshToken = undefined;

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
  await user.save({ validateBeforeSave: false });

  user.password = undefined;
  user.refreshToken = undefined;

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
  await user.save();

  return { email: user.email };
};

module.exports = { register, login, checkPasswordResetEmail, resetPassword };
