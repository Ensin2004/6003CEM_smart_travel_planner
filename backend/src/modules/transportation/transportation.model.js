/**
 * Transportation module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');

/**
 * Transportation Cache Schema groups database fields before model registration.
 * Stores cached results of transportation API calls (flights, trains, etc.).
 * Used to reduce external API calls for frequently requested searches.
 * Documents automatically expire based on the expiresAt field (TTL index).
 */
const transportationCacheSchema = new mongoose.Schema(
  {
    // Unique identifier for the cached search result
    // Built from query parameters (e.g., "flight:airline:from:to:date")
    cacheKey: {
      type: String,
      required: true,
      unique: true, // Ensures only one entry per unique search
      index: true, // Indexed for fast lookup
    },
    
    // Cached transportation search result data
    data: {
      type: mongoose.Schema.Types.Mixed, // Flexible structure for different response types
      required: true,
    },
    
    // Expiration timestamp for automatic cache cleanup via MongoDB TTL
    expiresAt: {
      type: Date,
      required: true,
      index: true, // Required for TTL index functionality
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt timestamps
);

module.exports = mongoose.model('TransportationCache', transportationCacheSchema);