const mongoose = require('mongoose');

const travelGuideCacheSchema = new mongoose.Schema(
  {
    cacheKey: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

travelGuideCacheSchema.index({ category: 1, updatedAt: -1 });

module.exports = mongoose.model('TravelGuideCache', travelGuideCacheSchema);
