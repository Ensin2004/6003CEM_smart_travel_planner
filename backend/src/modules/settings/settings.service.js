/**
 * Settings module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const AppError = require('../../utils/AppError');
const settingsRepository = require('./settings.repository');
const getContent = () => settingsRepository.getContent();
// Update Content applies allowed changes to an existing record.
const updateContent = (role, data) => {
  if (role !== 'admin') {
    throw new AppError('Administrator access is required', 403);
  }

  return settingsRepository.updateContent(data);
};
module.exports = { getContent, updateContent };
