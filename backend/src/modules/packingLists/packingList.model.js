const mongoose = require('mongoose');
const {
  defaultPackingCategory,
  defaultPriorityLevel,
  normalizePriorityLevel,
  priorityLevels,
} = require('./packingList.constants');

const packingItemSchema = new mongoose.Schema(
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
    isPacked: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

const packingListSchema = new mongoose.Schema(
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
    tripStartDate: { type: Date },
    tripEndDate: { type: Date },
    templateKey: { type: String, trim: true, maxlength: 60 },
    items: [packingItemSchema],
    reminder: {
      enabled: { type: Boolean, default: true },
      daysBeforeTrip: { type: Number, min: 0, max: 30, default: 2 },
      lastNotifiedAt: { type: Date },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

packingListSchema.index({ userId: 1, createdAt: -1 });
packingListSchema.index({ userId: 1, tripId: 1 });

packingListSchema.pre('validate', function normalizeItemPriorities() {
  this.items.forEach((item) => {
    item.priority = normalizePriorityLevel(item.priority);
  });
});

packingListSchema.virtual('progress').get(function progress() {
  const totalItems = this.items.length;
  const packedItems = this.items.filter((item) => item.isPacked).length;
  return {
    totalItems,
    packedItems,
    percent: totalItems ? Math.round((packedItems / totalItems) * 100) : 0,
  };
});

module.exports = mongoose.model('PackingList', packingListSchema, 'packingLists');
