/**
 * Trips module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');
const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};
// Note Schema groups database fields before model registration.
const noteSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);
// Budget Schema groups database fields before model registration.
const budgetSchema = new mongoose.Schema(
  {
    totalAmount: { type: Number, min: 0, default: 0 },
    currency: { type: String, trim: true, uppercase: true, default: 'MYR' },
    dailyLimit: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);
// Travel Preference Schema groups database fields before model registration.
const travelPreferenceSchema = new mongoose.Schema(
  {
    culture: { type: Boolean, default: false },
    food: { type: Boolean, default: false },
    hotel: { type: Boolean, default: false },
    attractions: { type: Boolean, default: true },
    transport: { type: Boolean, default: false },
    companions: [{ type: String, trim: true, maxlength: 40 }],
    styles: [{ type: String, trim: true, maxlength: 40 }],
    pace: { type: String, enum: ['relaxed', 'moderate', 'packed'], default: 'moderate' },
    accommodation: { type: String, enum: ['economy', 'comfort', 'premium', 'luxury'], default: 'comfort' },
    transportModes: [{ type: String, trim: true, maxlength: 40 }],
  },
  { _id: false }
);
// Destination Segment Schema groups database fields before model registration.
const destinationSegmentSchema = new mongoose.Schema(
  {
    country: { type: String, trim: true, maxlength: 80 },
    city: { type: String, required: true, trim: true, maxlength: 120 },
    placeName: { type: String, trim: true, maxlength: 160 },
    imageUrl: { type: String, trim: true, maxlength: 2000 },
    imageUrls: [{ type: String, trim: true, maxlength: 2000 }],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    order: { type: Number, min: 1, default: 1 },
    notes: { type: String, trim: true, maxlength: 500 },
    coordinates: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
    },
  },
  { _id: true }
);
// Document Checklist Schema groups database fields before model registration.
const documentChecklistSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    documentTypes: [{ type: String, trim: true, maxlength: 80 }],
  },
  { _id: false }
);
// Date Flexibility Schema groups database fields before model registration.
const dateFlexibilitySchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ['exact', 'flexible'], default: 'exact' },
    windowDays: { type: Number, min: 0, max: 30, default: 0 },
    preferredMonth: { type: String, trim: true, maxlength: 20 },
  },
  { _id: false }
);
// Trip Schema groups database fields before model registration.
const tripSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, trim: true, maxlength: 120 },
    destination: { type: String, required: true, trim: true, maxlength: 120 },
    country: { type: String, trim: true, maxlength: 80 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    budget: { type: budgetSchema, default: () => ({}) },
    planningMode: { type: String, enum: ['self', 'ai'], default: 'self' },
    travelPreferences: { type: travelPreferenceSchema, default: () => ({}) },
    destinationSegments: { type: [destinationSegmentSchema], default: [] },
    documentChecklist: { type: documentChecklistSchema, default: () => ({}) },
    dateFlexibility: { type: dateFlexibilitySchema, default: () => ({}) },
    routeOptimizationEnabled: { type: Boolean, default: false },
    budgetOptimizationEnabled: { type: Boolean, default: false },
    notes: [noteSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

tripSchema.index({ userId: 1, createdAt: -1 });
tripSchema.index({ userId: 1, startDate: 1 });
tripSchema.index({ userId: 1, endDate: 1 });
tripSchema.index({ destination: 1 });
tripSchema.index({ country: 1 });

tripSchema.virtual('durationDays').get(function durationDays() {
  if (!this.startDate || !this.endDate) return null;
  const diff = this.endDate.getTime() - this.startDate.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
});

tripSchema.virtual('status').get(function status() {
  if (!this.endDate) return 'active';
  return this.endDate < getStartOfToday() ? 'inactive' : 'active';
});

tripSchema.statics.getStatusBoundaryDate = getStartOfToday;
module.exports = mongoose.model('Trip', tripSchema);
