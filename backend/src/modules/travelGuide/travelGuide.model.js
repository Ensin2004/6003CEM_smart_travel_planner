/**
 * Travel Guide module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');

// Travel Guide Cache Schema groups database fields before model registration.
const travelGuideCacheSchema = new mongoose.Schema(
  {
    // Unique cache key for lookup operations
    cacheKey: { type: String, required: true, unique: true, trim: true },
    
    // Category for grouping related cache entries
    category: { type: String, required: true, trim: true, index: true },
    
    // Stored payload data (flexible structure)
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    
    // Expiration timestamp for TTL management
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true } // Auto-manage createdAt and updatedAt fields
);

// Compound index for efficient category-based queries
travelGuideCacheSchema.index({ category: 1, updatedAt: -1 });

// Export the model for use in other modules
module.exports = mongoose.model('TravelGuideCache', travelGuideCacheSchema);