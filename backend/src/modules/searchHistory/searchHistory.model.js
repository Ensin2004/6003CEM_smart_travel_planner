/**
 * Search History module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');
// Filter Schema groups database fields before model registration.
const filterSchema = new mongoose.Schema(
  {
    rating: { type: Number, min: 0, max: 5 },
    priceLevel: { type: String, trim: true },
    location: { type: String, trim: true },
  },
  { _id: false }
);
// Search History Schema groups database fields before model registration.
const searchHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    searchType: {
      type: String,
      enum: ['weather', 'attraction', 'restaurant', 'hotel', 'transport', 'destination'],
      required: true,
    },
    query: { type: String, required: true, trim: true, maxlength: 300 },
    destination: { type: String, trim: true, maxlength: 120 },
    filters: { type: filterSchema, default: undefined },
    resultsCount: { type: Number, min: 0, default: 0 },
    source: {
      type: String,
      enum: ['openmeteo', 'openstreetmap', 'travel-api', 'ai', 'manual'],
      default: 'manual',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

searchHistorySchema.index({ userId: 1, createdAt: -1 });
searchHistorySchema.index({ userId: 1, searchType: 1 });
module.exports = mongoose.model('SearchHistory', searchHistorySchema, 'searchHistory');
