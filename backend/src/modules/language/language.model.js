/**
 * Language module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');

/**
 * Translation Language Schema groups database fields before model registration.
 * Stores supported language configurations for translation services.
 * Used to define which languages are available for text translation.
 */
const translationLanguageSchema = new mongoose.Schema(
  {
    // Language code (e.g., 'en', 'es', 'fr', 'zh')
    code: { type: String, required: true, unique: true, trim: true, maxlength: 20 },
    
    // Human-readable language name (e.g., 'English', 'Spanish', 'French')
    name: { type: String, required: true, trim: true, maxlength: 120 },
    
    // Translation service provider (e.g., 'libretranslate', 'google', 'microsoft')
    provider: { type: String, default: 'libretranslate', trim: true, maxlength: 80 },
    
    // Whether this language is available for translation
    isActive: { type: Boolean, default: true, index: true },
    
    // Last time language data was synchronized with the provider
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt timestamps
);

// Indexes for query performance
// Unique constraint on provider+code to prevent duplicate language entries per provider
translationLanguageSchema.index({ provider: 1, code: 1 }, { unique: true });
translationLanguageSchema.index({ name: 1 }); // For searching by language name

/**
 * Translation History Schema groups database fields before model registration.
 * Stores user translation history for reference and caching.
 * Used to show previous translations and avoid duplicate API calls.
 */
const translationHistorySchema = new mongoose.Schema(
  {
    // User who performed the translation
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    
    // Reference to the source language document
    sourceLanguageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TranslationLanguage',
      required: true,
      index: true,
    },
    
    // Reference to the target language document
    targetLanguageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TranslationLanguage',
      required: true,
      index: true,
    },
    
    // Original text before translation (max 1000 characters)
    sourceText: { type: String, required: true, trim: true, maxlength: 1000 },
    
    // Translated text result (max 2000 characters - can be longer than source)
    translatedText: { type: String, required: true, trim: true, maxlength: 2000 },
    
    // Which translation service was used
    provider: { type: String, default: 'libretranslate', trim: true, maxlength: 80 },
    
    // Whether this was served from cache (avoided API call)
    cached: { type: Boolean, default: false },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt timestamps
);

// Indexes for query performance
translationHistorySchema.index({ userId: 1, createdAt: -1 }); // For retrieving recent history per user
translationHistorySchema.index({ userId: 1, sourceLanguageId: 1, targetLanguageId: 1 }); // For filtering by language pair

/**
 * Creates or retrieves a Mongoose model for a given collection.
 * Prevents model overwrite errors when the model is already defined.
 * 
 * @param {string} name - Model name
 * @param {Object} schema - Mongoose schema
 * @param {string} collection - Collection name in the database
 * @returns {Object} Mongoose model
 */
const getModel = (name, schema, collection) =>
  mongoose.models[name] || mongoose.model(name, schema, collection);

module.exports = {
  TranslationHistory: getModel('TranslationHistory', translationHistorySchema, 'translationHistories'),
  TranslationLanguage: getModel('TranslationLanguage', translationLanguageSchema, 'translationLanguages'),
};