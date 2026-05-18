const mongoose = require('mongoose');

const documentTemplateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    documentType: {
      type: String,
      enum: ['passport', 'visa', 'insurance', 'ticket', 'booking', 'custom'],
      default: 'custom',
    },
    description: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

documentTemplateSchema.index({ userId: 1, documentType: 1 });

module.exports = mongoose.model('DocumentTemplate', documentTemplateSchema, 'documentTemplates');
