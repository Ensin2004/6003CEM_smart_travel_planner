const mongoose = require('mongoose');

const translationLanguageSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 20 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    provider: { type: String, default: 'libretranslate', trim: true, maxlength: 80 },
    isActive: { type: Boolean, default: true, index: true },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

translationLanguageSchema.index({ provider: 1, code: 1 }, { unique: true });
translationLanguageSchema.index({ name: 1 });

const translationHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceLanguageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TranslationLanguage',
      required: true,
      index: true,
    },
    targetLanguageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TranslationLanguage',
      required: true,
      index: true,
    },
    sourceText: { type: String, required: true, trim: true, maxlength: 1000 },
    translatedText: { type: String, required: true, trim: true, maxlength: 2000 },
    provider: { type: String, default: 'libretranslate', trim: true, maxlength: 80 },
    cached: { type: Boolean, default: false },
  },
  { timestamps: true }
);

translationHistorySchema.index({ userId: 1, createdAt: -1 });
translationHistorySchema.index({ userId: 1, sourceLanguageId: 1, targetLanguageId: 1 });

const getModel = (name, schema, collection) =>
  mongoose.models[name] || mongoose.model(name, schema, collection);

module.exports = {
  TranslationHistory: getModel('TranslationHistory', translationHistorySchema, 'translationHistories'),
  TranslationLanguage: getModel('TranslationLanguage', translationLanguageSchema, 'translationLanguages'),
};
