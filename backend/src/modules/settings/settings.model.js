const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 180 },
    answer: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { _id: true }
);

const settingsContentSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'site-content', unique: true },
    privacyPolicy: { type: String, default: '' },
    termsAndConditions: { type: String, default: '' },
    faqs: { type: [faqSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SettingsContent', settingsContentSchema, 'settingsContents');
