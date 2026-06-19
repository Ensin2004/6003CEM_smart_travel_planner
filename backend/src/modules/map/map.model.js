/**
 * Map module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');

/**
 * Map Search Cache Schema groups database fields before model registration.
 * Stores cached results of map searches and geocoding requests.
 * Used to reduce external API calls for frequently requested locations.
 * Documents automatically expire based on the expiresAt field.
 */
const mapSearchCacheSchema = new mongoose.Schema(
  {
    // Unique identifier for the cached search result
    // Built from query parameters (e.g., "category:restaurant:lat:1.234:lng:5.678")
    cacheKey: {
      type: String,
      required: true,
      unique: true, // Ensures only one entry per unique search
      index: true, // Indexed for fast lookup
      trim: true,
    },
    
    // Cached search result data (flexible structure for different response types)
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    
    // Expiration timestamp for automatic cache cleanup
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index - automatically removes expired documents
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt timestamps
    strict: true, // Only allow fields defined in the schema
  }
);

module.exports = mongoose.model('MapSearchCache', mapSearchCacheSchema);