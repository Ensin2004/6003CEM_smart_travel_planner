/**
 * Itinerary module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');
// Location Schema groups database fields before model registration.
const locationSchema = new mongoose.Schema(
  {
    address: { type: String, trim: true },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        validate: {
          validator(value) {
            return !value || value.length === 2;
          },
          message: 'Coordinates must contain longitude and latitude',
        },
      },
    },
  },
  { _id: false }
);
// Price Estimate Schema groups database fields before model registration.
const priceEstimateSchema = new mongoose.Schema(
  {
    amount: { type: Number, min: 0 },
    currency: { type: String, trim: true, uppercase: true },
  },
  { _id: false }
);
// Itinerary Item Schema groups database fields before model registration.
const itineraryItemSchema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['attraction', 'restaurant', 'hotel', 'transport', 'flight', 'custom'],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000 },
    location: { type: locationSchema, default: undefined },
    scheduledDate: { type: Date },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    priceEstimate: { type: priceEstimateSchema, default: undefined },
    rating: { type: Number, min: 0, max: 5 },
    source: {
      type: String,
      enum: ['manual', 'openstreetmap', 'travel-api', 'ai'],
      default: 'manual',
    },
    externalId: { type: String, trim: true },
    weatherWarning: { type: String, trim: true, maxlength: 500 },
    aiRecommendationReason: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

itineraryItemSchema.index({ tripId: 1, scheduledDate: 1 });
itineraryItemSchema.index({ 'location.coordinates': '2dsphere' });
module.exports = mongoose.model('ItineraryItem', itineraryItemSchema, 'itineraryItems');
