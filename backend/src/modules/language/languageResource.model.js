/**
 * Language module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');
// Phrase Schema groups database fields before model registration.
const phraseSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true, maxlength: 80 },
    originalText: { type: String, required: true, trim: true, maxlength: 500 },
    translatedText: { type: String, required: true, trim: true, maxlength: 500 },
    pronunciation: { type: String, trim: true, maxlength: 300 },
  },
  { _id: false }
);
// Language Resource Schema groups database fields before model registration.
const languageResourceSchema = new mongoose.Schema(
  {
    languageCode: { type: String, required: true, unique: true, trim: true, lowercase: true },
    languageName: { type: String, required: true, trim: true, maxlength: 80 },
    commonPhrases: { type: [phraseSchema], default: [] },
  },
  { timestamps: true }
);
module.exports = mongoose.model('LanguageResource', languageResourceSchema, 'languageResources');
