const AppError = require('../../utils/AppError');
const settingsRepository = require('./settings.repository');

const getContent = () => settingsRepository.getContent();

const updateContent = (role, data) => {
  if (role !== 'admin') {
    throw new AppError('Administrator access is required', 403);
  }

  return settingsRepository.updateContent(data);
};

module.exports = { getContent, updateContent };
