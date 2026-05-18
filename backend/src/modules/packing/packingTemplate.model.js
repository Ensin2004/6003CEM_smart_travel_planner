const mongoose = require('mongoose');

const templateItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, trim: true, maxlength: 80 },
    quantity: { type: Number, min: 1, default: 1 },
  },
  { _id: false }
);

const packingTemplateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: {
      type: String,
      enum: ['beach', 'business', 'winter', 'general', 'custom'],
      default: 'general',
    },
    items: { type: [templateItemSchema], default: [] },
    isAiGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

packingTemplateSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('PackingTemplate', packingTemplateSchema, 'packingTemplates');
