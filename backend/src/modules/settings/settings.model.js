/**
 * Settings module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');

/**
 * Faq Schema groups database fields before model registration.
 * Stores individual FAQ entries with question and answer fields.
 * Used within the settings content document.
 */
const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 180 }, // FAQ question text
    answer: { type: String, required: true, trim: true, maxlength: 2000 }, // FAQ answer text
  },
  { _id: true } // Automatically generate _id for each FAQ entry
);

/**
 * Settings Content Schema groups database fields before model registration.
 * Stores application settings including privacy policy, terms, and FAQs.
 * Single document with unique key 'site-content'.
 */
const settingsContentSchema = new mongoose.Schema(
  {
    // Unique identifier for the settings document - ensures only one settings document exists
    key: { type: String, default: 'site-content', unique: true },
    
    // Privacy policy content in HTML or markdown format
    privacyPolicy: { type: String, default: '' },
    
    // Terms and conditions content in HTML or markdown format
    termsAndConditions: { type: String, default: '' },
    
    // Array of FAQ entries
    faqs: { type: [faqSchema], default: [] },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt timestamps
);

module.exports = mongoose.model('SettingsContent', settingsContentSchema, 'settingsContents');