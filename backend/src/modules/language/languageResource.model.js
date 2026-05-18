const mongoose = require('mongoose');

const phraseSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true, maxlength: 80 },
    originalText: { type: String, required: true, trim: true, maxlength: 500 },
    translatedText: { type: String, required: true, trim: true, maxlength: 500 },
    pronunciation: { type: String, trim: true, maxlength: 300 },
  },
  { _id: false }
);

const languageResourceSchema = new mongoose.Schema(
  {
    languageCode: { type: String, required: true, unique: true, trim: true, lowercase: true },
    languageName: { type: String, required: true, trim: true, maxlength: 80 },
    commonPhrases: { type: [phraseSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LanguageResource', languageResourceSchema, 'languageResources');
