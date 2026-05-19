const mongoose = require('mongoose');
const {
  defaultPackingCategory,
  defaultPriorityLevel,
  normalizePriorityLevel,
  priorityLevels,
} = require('./packingList.constants');

const templateItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: {
      type: String,
      default: defaultPackingCategory,
      trim: true,
      maxlength: 80,
    },
    priority: {
      type: String,
      enum: priorityLevels,
      default: defaultPriorityLevel,
    },
    quantity: { type: Number, min: 1, max: 999, default: 1 },
  },
  { _id: true }
);

const packingTemplateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    destination: { type: String, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 180 },
    items: { type: [templateItemSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

packingTemplateSchema.index({ userId: 1, updatedAt: -1 });
packingTemplateSchema.index({ userId: 1, title: 1 });

packingTemplateSchema.pre('validate', function normalizeItemPriorities() {
  this.items.forEach((item) => {
    item.priority = normalizePriorityLevel(item.priority);
  });
});

module.exports = mongoose.model('PackingTemplate', packingTemplateSchema, 'packingTemplates');
