const mongoose = require('mongoose');

const dayBudgetSchema = new mongoose.Schema(
  {
    amount: { type: Number, min: 0, default: 0 },
    currency: { type: String, trim: true, uppercase: true, default: 'MYR' },
  },
  { _id: false }
);

const itineraryDaySchema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dayNumber: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true },
    title: { type: String, trim: true, maxlength: 120 },
    notes: { type: String, trim: true, maxlength: 2000 },
    budget: { type: dayBudgetSchema, default: () => ({}) },
  },
  { timestamps: true }
);

itineraryDaySchema.index({ tripId: 1, dayNumber: 1 }, { unique: true });
itineraryDaySchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('ItineraryDay', itineraryDaySchema, 'itineraryDays');
