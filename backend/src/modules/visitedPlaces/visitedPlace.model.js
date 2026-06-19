/**
 * Visited places module.
 * Schema fields define stored document structure, defaults, and indexes.
 */

// Import Mongoose for schema definition and model creation
const mongoose = require('mongoose');

// Schema for individual visit records associated with a place
// Allows tracking multiple visits to the same location over time
const visitEntrySchema = new mongoose.Schema(
  {
    // When the visit occurred (optional for undated visits)
    visitedDate: { type: Date, index: true },

    // Number of times visited on this occasion (1-999)
    visitCount: { type: Number, min: 1, max: 999, default: 1 },

    // Personal notes about this specific visit
    notes: { type: String, trim: true, maxlength: 500 },

    // Which trip this visit was part of
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },

    // Specific itinerary item associated
    itineraryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ItineraryItem' },

    // When this visit entry was recorded
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }  // Each visit entry gets its own unique identifier
);

// Main schema for places that a user has visited
// Normalizes place data from various sources (Google Maps, Foursquare, custom entries)
const visitedPlaceSchema = new mongoose.Schema(
  {
    // Owner of this visited place record
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Unique key generated from place attributes (type, externalId, source)
    // Ensures same place from different sources is recognized as identical
    placeKey: { type: String, required: true, trim: true, maxlength: 420 },

    // Category of the place - used for filtering and statistics
    type: {
      type: String,
      enum: ['hotel', 'flight', 'attraction', 'restaurant', 'location', 'transport', 'food', 'custom'],
      default: 'location',
      index: true,
    },

    // Display name of the place
    title: { type: String, required: true, trim: true, maxlength: 160 },

    // Physical address (optional)
    address: { type: String, trim: true, maxlength: 240 },

    // Original data source (e.g., 'foursquare', 'google-maps', 'explore-attractions')
    source: { type: String, trim: true, maxlength: 80 },

    // Provider-specific identifier (e.g., fsq_place_id, place_id)
    externalId: { type: String, trim: true, maxlength: 180 },

    // Place images cached from external providers
    imageUrl: { type: String, trim: true, maxlength: 2000 },
    imageUrls: [{ type: String, trim: true, maxlength: 2000 }],

    // Array of visit entries - supports multiple visits to the same place
    visits: { type: [visitEntrySchema], default: [] },
  },
  {
    timestamps: true,           // Automatically add createdAt and updatedAt
    toJSON: { virtuals: true },  // Include virtual fields when converting to JSON
    toObject: { virtuals: true }, // Include virtual fields when converting to Object
  }
);

// Ensure each user has at most one record for a given place (placeKey must be unique per user)
visitedPlaceSchema.index({ userId: 1, placeKey: 1 }, { unique: true });

// Enable efficient date-range queries for visits (e.g., calendar view)
visitedPlaceSchema.index({ userId: 1, 'visits.visitedDate': 1 });

// Virtual field that calculates total number of visits across all visit entries
// Sums visitCount from each entry (defaults to 1 if not specified)
visitedPlaceSchema.virtual('visitCount').get(function visitCount() {
  return this.visits.reduce((total, visit) => total + Number(visit.visitCount || 1), 0);
});

// Virtual field that returns the most recent visit date
// Filters out entries without a visitedDate, sorts descending, returns the latest
visitedPlaceSchema.virtual('latestVisitedDate').get(function latestVisitedDate() {
  const datedVisits = this.visits
    .map((visit) => visit.visitedDate)           // Extract dates from each visit
    .filter(Boolean)                              // Remove null/undefined values
    .sort((firstDate, secondDate) => secondDate.getTime() - firstDate.getTime()); // Sort newest first

  return datedVisits[0] || null;  // Return most recent date or null if none exist
});

// Create and export the Mongoose model with explicit collection name 'visitedPlaces'
module.exports = mongoose.model('VisitedPlace', visitedPlaceSchema, 'visitedPlaces');