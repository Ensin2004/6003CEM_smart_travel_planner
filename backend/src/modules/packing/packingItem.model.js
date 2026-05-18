const mongoose = require('mongoose');

const packingItemSchema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, trim: true, maxlength: 80 },
    quantity: { type: Number, min: 1, default: 1 },
    isPacked: { type: Boolean, default: false },
    source: { type: String, enum: ['template', 'manual', 'ai'], default: 'manual' },
  },
  { timestamps: true }
);

packingItemSchema.index({ tripId: 1, isPacked: 1 });

module.exports = mongoose.model('PackingItem', packingItemSchema, 'packingItems');
