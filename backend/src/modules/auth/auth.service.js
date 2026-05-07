const AppError = require('../../utils/AppError');
const { generateAccessToken, generateRefreshToken } = require('../../utils/generateTokens');
const authRepository = require('./auth.repository');

const register = async (data) => {
  const existingUser = await authRepository.findByEmail(data.email);
  if (existingUser) throw new AppError('Email is already registered', 409);

  const user = await authRepository.create(data);
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

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

module.exports = { register, login };
