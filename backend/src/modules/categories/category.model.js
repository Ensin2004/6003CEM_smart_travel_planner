/**
 * Categories module.
 * Admin-managed search categories replace frontend-only option lists.
 */
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['hotel', 'attraction', 'food'],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    value: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
  },
  { timestamps: true }
);

categorySchema.index({ type: 1, value: 1 }, { unique: true });
categorySchema.index({ type: 1, name: 1 });

module.exports = mongoose.model('Category', categorySchema);
