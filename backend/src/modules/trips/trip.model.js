const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const tripSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    destination: { type: String, required: true, trim: true, maxlength: 120 },
    country: { type: String, trim: true, maxlength: 80 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'past'], default: 'active' },
    budget: { type: Number, min: 0, default: 0 },
    notes: [noteSchema],
    preferences: {
      culture: { type: Boolean, default: false },
      food: { type: Boolean, default: false },
      hotel: { type: Boolean, default: false },
      attractions: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

tripSchema.index({ userId: 1, createdAt: -1 });

tripSchema.virtual('durationDays').get(function durationDays() {
  if (!this.startDate || !this.endDate) return null;
  const diff = this.endDate.getTime() - this.startDate.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
});

module.exports = mongoose.model('Trip', tripSchema);
