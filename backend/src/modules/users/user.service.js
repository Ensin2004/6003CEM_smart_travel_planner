/**
 * Users module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const AppError = require('../../utils/AppError');
const userRepository = require('./user.repository');

const budgetLevelToSpendingPreference = {
  low: 'budget',
  medium: 'standard',
  high: 'luxury',
};
// Normalize Preferences prepares incoming data for consistent storage.
const normalizePreferences = (preferences) => {
  if (!preferences) return preferences;
  const normalized = { ...preferences };
  if (!normalized.spendingPreference && normalized.budgetLevel) {
    normalized.spendingPreference = budgetLevelToSpendingPreference[normalized.budgetLevel];
  }

  delete normalized.budgetLevel;
  return normalized;
};
const getProfile = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  return user;
};
// Update Profile applies allowed changes to an existing record.
const updateProfile = async (userId, data) => {
  if (data.email) {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser && existingUser.id !== userId) {
      throw new AppError('Email is already registered', 409);
    }
  }

  const allowed = {
    name: data.name,
    email: data.email,
    avatarUrl: data.avatarUrl,
    country: data.country,
    gender: data.gender,
    ageGroup: data.ageGroup,
    notificationPreferences: data.notificationPreferences,
    preferences: normalizePreferences(data.preferences),
  };

  Object.keys(allowed).forEach((key) => allowed[key] === undefined && delete allowed[key]);

  const user = await userRepository.updateById(userId, allowed);
  if (!user) throw new AppError('User not found', 404);
  return user;
};
const changePassword = async (userId, { currentPassword, password }) => {
  const user = await userRepository.findByIdWithPassword(userId);
  if (!user) throw new AppError('User not found', 404);

  if (currentPassword === password) {
    throw new AppError('New password cannot be the same as current password', 400);
  }

  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = password;
  user.refreshToken = undefined;
  user.refreshTokenExpiresAt = undefined;
  await user.save();

  user.password = undefined;
  return user;
};
const getAllUsers = () => userRepository.findAll();
const disableUser = async (userId) => {
  const user = await userRepository.updateById(userId, { status: 'disabled' });
  if (!user) throw new AppError('User not found', 404);
  return user;
};
module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  disableUser,
  normalizePreferences,
};
