/**
 * Users module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const User = require('./user.model');

// Create a new user document
const create = (data) => User.create(data);

// Find a user by email, optionally including sensitive fields
const findByEmail = (email, includePassword = false) => {
  const query = User.findOne({ email });
  // Include password-related fields if requested
  return includePassword
    ? query.select(
        '+password +refreshToken +refreshTokenExpiresAt +failedLoginAttempts +loginLockUntil +loginLockLevel +emailVerificationToken +emailVerificationExpiresAt'
      )
    : query;
};

// Find a user by ID
const findById = (id) => User.findById(id);

// Find all active admin users
const findActiveAdmins = () => User.find({ role: 'admin', status: 'active' });

// Find a user by ID with password field included
const findByIdWithPassword = (id) => User.findById(id).select('+password');

// Find a user by ID with refresh token fields included
const findByIdWithRefreshToken = (id) => User.findById(id).select('+refreshToken +refreshTokenExpiresAt');

// Find a user by email verification token
const findByEmailVerificationToken = (token) =>
  User.findOne({ emailVerificationToken: token }).select('+emailVerificationToken +emailVerificationExpiresAt');

// Find all users sorted by creation date (newest first)
const findAll = () => User.find().sort({ createdAt: -1 });

// Delete By Id removes a record after ownership checks.
const deleteById = (id) => User.findByIdAndDelete(id);

// Update By Id applies allowed changes to an existing record.
const updateById = (id, data) =>
  User.findByIdAndUpdate(id, data, {
    returnDocument: 'after',   // Return the updated document
    runValidators: true,       // Apply schema validation
  });

// Export all database helper functions
module.exports = {
  create,
  findByEmail,
  findById,
  findActiveAdmins,
  findByIdWithPassword,
  findByIdWithRefreshToken,
  findByEmailVerificationToken,
  findAll,
  deleteById,
  updateById,
};