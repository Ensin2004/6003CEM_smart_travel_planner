/**
 * Favorites module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');

/**
 * Favorite Coordinates Schema remains absent for address-only favourites and validates complete GeoJSON points.
 * Defines the structure for storing GeoJSON Point coordinates for locations.
 * Follows the GeoJSON specification for spatial queries.
 */
const favoriteCoordinatesSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point', // GeoJSON Point type for location data
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value) {
          return value.length === 2; // Must contain exactly [longitude, latitude]
        },
        message: 'Coordinates must contain longitude and latitude',
      },
    },
  },
  { _id: false } // No separate _id for embedded subdocument
);

/**
 * Favorite Location Schema groups database fields before model registration.
 * Stores location information with optional address and coordinates.
 * Allows favorites to be stored with address only or with full coordinates.
 */
const favoriteLocationSchema = new mongoose.Schema(
  {
    address: { type: String, trim: true },
    coordinates: { type: favoriteCoordinatesSchema, default: undefined }, // GeoJSON Point
  },
  { _id: false }
);

/**
 * Favorite Schema groups database fields before model registration.
 * Stores user-saved places, attractions, hotels, restaurants, and more.
 * Includes reference to user, type categorization, and location data.
 */
const favoriteSchema = new mongoose.Schema(
  {
    // User who owns this favorite - references the User collection
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    
    // Category of the favorite item
    type: {
      type: String,
      enum: ['hotel', 'flight', 'attraction', 'restaurant', 'location', 'transport'],
      required: true,
    },
    
    // Display title of the favorite item
    title: { type: String, required: true, trim: true, maxlength: 160 },
    
    // Optional description or notes about the favorite
    description: { type: String, trim: true, maxlength: 2000 },
    
    // Location information (address and/or coordinates)
    location: { type: favoriteLocationSchema, default: undefined },
    
    // Price level indicator (e.g., $, $$, $$$)
    priceLevel: { type: String, trim: true },
    
    // Rating from 0 to 5 stars
    rating: { type: Number, min: 0, max: 5 },
    
    // External identifier from the source API (Google Place ID, etc.)
    externalId: { type: String, trim: true },
    
    // Data source (e.g., Google Maps, SerpApi, user-added)
    source: { type: String, trim: true },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt timestamps
);

// Indexes for query performance
favoriteSchema.index({ userId: 1, type: 1 }); // For filtering favorites by user and type
favoriteSchema.index({ 'location.coordinates': '2dsphere' }); // For geospatial queries (nearby favorites)

module.exports = mongoose.model('Favorite', favoriteSchema, 'favorites');