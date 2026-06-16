/**
 * Settings module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const SettingsContent = require('./settings.model');

/**
 * Retrieves the settings content document.
 * Uses findOneAndUpdate with $setOnInsert to ensure the document exists.
 * Creates the document with default values if it doesn't exist.
 * 
 * @returns {Promise<Object>} Settings content document
 */
const getContent = () =>
  SettingsContent.findOneAndUpdate(
    { key: 'site-content' }, // Find by unique key
    { $setOnInsert: { key: 'site-content' } }, // Only set on insert (don't overwrite existing)
    { returnDocument: 'after', upsert: true } // Return updated document, create if missing
  );

/**
 * Update Content applies allowed changes to an existing record.
 * Updates the settings content document with provided data.
 * Creates the document if it doesn't exist (upsert).
 * 
 * @param {Object} data - Updated settings data (privacyPolicy, termsAndConditions, faqs)
 * @returns {Promise<Object>} Updated settings content document
 */
const updateContent = (data) =>
  SettingsContent.findOneAndUpdate(
    { key: 'site-content' }, // Find by unique key
    {
      privacyPolicy: data.privacyPolicy,
      termsAndConditions: data.termsAndConditions,
      faqs: data.faqs,
    },
    {
      returnDocument: 'after', // Return the updated document
      upsert: true, // Create if it doesn't exist
      runValidators: true, // Apply schema validation
      setDefaultsOnInsert: true // Apply default values on insert
    }
  );

module.exports = { getContent, updateContent };