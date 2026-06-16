/**
 * Itinerary module.
 * Schema fields define stored document structure, defaults, and indexes.
 */

// Import Mongoose for schema definition and model creation
const mongoose = require('mongoose');

// Day Budget Schema groups database fields before model registration.
// Stores financial allocation for a single day of the itinerary
const dayBudgetSchema = new mongoose.Schema(
  {
    amount: { type: Number, min: 0, default: 0 },           // Budget amount, non-negative
    currency: { type: String, trim: true, uppercase: true, default: 'MYR' },  // ISO currency code
  },
  { _id: false }  // Prevent creation of separate _id for sub-documents
);

// Day Location Schema stores the planning anchor used for weather, nearby ideas, and route summaries.
// Contains geographical information for where the day's activities are centered
const dayLocationSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 160 },      // Place name (e.g., "Shibuya")
    country: { type: String, trim: true, maxlength: 80 },    // Country name
    address: { type: String, trim: true, maxlength: 240 },   // Full formatted address
    coordinates: {
      latitude: { type: Number, min: -90, max: 90 },         // WGS84 latitude (-90 to 90)
      longitude: { type: Number, min: -180, max: 180 },      // WGS84 longitude (-180 to 180)
    },
  },
  { _id: false }  // Prevent creation of separate _id for sub-documents
);

// Itinerary Day Schema groups database fields before model registration.
// Represents a single day within a trip's itinerary plan
const itineraryDaySchema = new mongoose.Schema(
  {
    // Reference to the parent trip document
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    // Owner of this itinerary day (denormalized for efficient queries)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dayNumber: { type: Number, required: true, min: 1 },     // Sequential day number within trip (1, 2, 3...)
    date: { type: Date, required: true },                    // Calendar date for this itinerary day
    title: { type: String, trim: true, maxlength: 120 },     // Optional custom title for the day
    location: { type: dayLocationSchema, default: () => ({}) },  // Location data for the day
    notes: { type: String, trim: true, maxlength: 2000 },    // Planner notes or reminders
    budget: { type: dayBudgetSchema, default: () => ({}) },  // Daily budget allocation
  },
  { timestamps: true }  // Automatically add createdAt and updatedAt fields
);

// Indexes for query performance and data integrity
// Ensure each trip has at most one day with a given day number (unique constraint)
itineraryDaySchema.index({ tripId: 1, dayNumber: 1 }, { unique: true });

// Enable efficient queries for finding all days belonging to a user on a specific date
itineraryDaySchema.index({ userId: 1, date: 1 });

// Create and export the Mongoose model with explicit collection name 'itineraryDays'
module.exports = mongoose.model('ItineraryDay', itineraryDaySchema, 'itineraryDays');