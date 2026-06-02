/**
 * Settings module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const SettingsContent = require('./settings.model');
const getContent = () =>
  SettingsContent.findOneAndUpdate(
    { key: 'site-content' },
    { $setOnInsert: { key: 'site-content' } },
    { returnDocument: 'after', upsert: true }
  );
// Update Content applies allowed changes to an existing record.
const updateContent = (data) =>
  SettingsContent.findOneAndUpdate(
    { key: 'site-content' },
    {
      privacyPolicy: data.privacyPolicy,
      termsAndConditions: data.termsAndConditions,
      faqs: data.faqs,
    },
    { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
module.exports = { getContent, updateContent };
