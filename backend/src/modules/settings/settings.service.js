/**
 * Settings module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const AppError = require('../../utils/AppError');
const settingsRepository = require('./settings.repository');

/**
 * Retrieves the current settings content.
 * No role restriction - available to all authenticated users.
 * 
 * @returns {Promise<Object>} Settings content document
 */
const getContent = () => settingsRepository.getContent();

/**
 * Update Content applies allowed changes to an existing record.
 * Restricted to admin users only.
 * 
 * @param {string} role - User role from authentication
 * @param {Object} data - Updated settings data
 * @returns {Promise<Object>} Updated settings content
 * @throws {AppError} If user is not an admin
 */
const updateContent = (role, data) => {
  // Verify admin role before allowing updates
  if (role !== 'admin') {
    throw new AppError('Administrator access is required', 403);
  }

  return settingsRepository.updateContent(data);
};

module.exports = { getContent, updateContent };