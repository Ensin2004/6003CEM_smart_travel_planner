/**
 * Itinerary module.
 * Schema fields define stored document structure, defaults, and indexes.
 */

// Import Mongoose for schema definition and model creation
const mongoose = require('mongoose');

// Location Schema groups database fields before model registration.
// Stores geographical information for an itinerary item (attraction, restaurant, hotel, etc.)
const locationSchema = new mongoose.Schema(
  {
    address: { type: String, trim: true },  // Human-readable address (e.g., "4 Chome-2-8 Shibakoen, Minato City, Tokyo")
    coordinates: {
      // GeoJSON format for spatial queries and mapping
      type: {
        type: String,
        enum: ['Point'],      // Only Point type is supported (for individual locations)
        default: 'Point',
      },
      coordinates: {
        type: [Number],       // Array of numbers [longitude, latitude] - GeoJSON order
        validate: {
          validator(value) {
            return !value || value.length === 2;  // Must contain exactly two numbers
          },
          message: 'Coordinates must contain longitude and latitude',
        },
      },
    },
  },
  { _id: false }  // Prevent creation of separate _id for sub-documents
);

// Price Estimate Schema groups database fields before model registration.
// Stores cost information for an itinerary item
const priceEstimateSchema = new mongoose.Schema(
  {
    amount: { type: Number, min: 0 },                        // Estimated cost amount (non-negative)
    currency: { type: String, trim: true, uppercase: true }, // ISO currency code (e.g., 'USD', 'MYR', 'JPY')
    source: {
      type: String,
      enum: ['manual', 'api', 'ai'],
      default: 'manual',
    },
    suggestionText: { type: String, trim: true, maxlength: 160 },
  },
  { _id: false }  // Prevent creation of separate _id for sub-documents
);

// Itinerary Item Schema groups database fields before model registration.
// Represents a single activity, accommodation, or transportation element within a trip itinerary
const itineraryItemSchema = new mongoose.Schema(
  {
    // Reference to the parent trip document
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    // Owner of this itinerary item (denormalized for efficient user-based queries)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    
    // Category of the itinerary item - determines how it's displayed and processed
    type: {
      type: String,
      enum: ['attraction', 'restaurant', 'hotel', 'transport', 'flight', 'custom'],
      required: true,
      index: true,
    },
    
    title: { type: String, required: true, trim: true, maxlength: 160 },          // Display name
    description: { type: String, trim: true, maxlength: 2000 },                  // Optional detailed notes
    location: { type: locationSchema, default: undefined },                      // Geographical data (optional)
    imageUrl: { type: String, trim: true, maxlength: 2000 },                    // Primary place image cached at add/enrichment time
    imageUrls: [{ type: String, trim: true, maxlength: 2000 }],                 // Additional place images cached to avoid repeated API calls
    scheduledDate: { type: Date },                                               // Which day this item occurs
    startTime: { type: String, trim: true },                                     // Optional start time (e.g., "14:00")
    endTime: { type: String, trim: true },                                       // Optional end time (e.g., "16:30")
    priceEstimate: { type: priceEstimateSchema, default: undefined },           // Cost information (optional)
    rating: { type: Number, min: 0, max: 5 },                                   // User or provider rating (0-5)
    
    // Origin of this itinerary item - used for attribution and data quality tracking
    source: {
      type: String,
      enum: ['manual', 'openstreetmap', 'travel-api', 'ai'],
      default: 'manual',
    },
    
    externalId: { type: String, trim: true },        // Provider-specific identifier (e.g., OSM node ID)
    weatherWarning: { type: String, trim: true, maxlength: 500 },  // Weather-related caution (e.g., "Rain expected")
    aiRecommendationReason: { type: String, trim: true, maxlength: 1000 },  // Explanation if AI-suggested
  },
  { timestamps: true }  // Automatically add createdAt and updatedAt fields
);

// Indexes for query performance and geospatial operations
// Enable efficient queries for finding all items in a trip on a specific date
itineraryItemSchema.index({ tripId: 1, scheduledDate: 1 });

// Enable 2D sphere geospatial queries (e.g., "find items near this location")
itineraryItemSchema.index({ 'location.coordinates': '2dsphere' });

// Create and export the Mongoose model with explicit collection name 'itineraryItems'
module.exports = mongoose.model('ItineraryItem', itineraryItemSchema, 'itineraryItems');
