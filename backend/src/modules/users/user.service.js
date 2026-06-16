/**
 * Users module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const AppError = require('../../utils/AppError');
const userRepository = require('./user.repository');

// Mapping from budget levels to spending preferences
const budgetLevelToSpendingPreference = {
  low: 'budget',
  medium: 'standard',
  high: 'luxury',
};

// Normalize Preferences prepares incoming data for consistent storage.
const normalizePreferences = (preferences) => {
  if (!preferences) return preferences;
  const normalized = { ...preferences };
  
  // Convert legacy budgetLevel to spendingPreference
  if (!normalized.spendingPreference && normalized.budgetLevel) {
    normalized.spendingPreference = budgetLevelToSpendingPreference[normalized.budgetLevel];
  }

  // Remove legacy field
  delete normalized.budgetLevel;
  return normalized;
};

// Get user profile by ID
const getProfile = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  return user;
};

// Update Profile applies allowed changes to an existing record.
const updateProfile = async (userId, data) => {
  // Check email uniqueness if updating email
  if (data.email) {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser && existingUser.id !== userId) {
      throw new AppError('Email is already registered', 409);
    }
  }

  // Define allowed updatable fields
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

  // Remove undefined values
  Object.keys(allowed).forEach((key) => allowed[key] === undefined && delete allowed[key]);

  // Update user
  const user = await userRepository.updateById(userId, allowed);
  if (!user) throw new AppError('User not found', 404);
  return user;
};

// Change user password with current password verification
const changePassword = async (userId, { currentPassword, password }) => {
  const user = await userRepository.findByIdWithPassword(userId);
  if (!user) throw new AppError('User not found', 404);

  // Prevent using same password
  if (currentPassword === password) {
    throw new AppError('New password cannot be the same as current password', 400);
  }

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Update password and clear refresh tokens
  user.password = password;
  user.refreshToken = undefined;
  user.refreshTokenExpiresAt = undefined;
  await user.save();

  // Remove password from output
  user.password = undefined;
  return user;
};

// Get all users (admin function)
const getAllUsers = () => userRepository.findAll();

// Disable a user account (admin function)
const disableUser = async (userId) => {
  const user = await userRepository.updateById(userId, { status: 'disabled' });
  if (!user) throw new AppError('User not found', 404);
  return user;
};

// Export all service functions
module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  disableUser,
  normalizePreferences,
};