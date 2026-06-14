/**
 * Visited places module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');

const visitEntrySchema = new mongoose.Schema(
  {
    visitedDate: { type: Date, index: true },
    visitCount: { type: Number, min: 1, max: 999, default: 1 },
    notes: { type: String, trim: true, maxlength: 500 },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
    itineraryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ItineraryItem' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const visitedPlaceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    placeKey: { type: String, required: true, trim: true, maxlength: 420 },
    type: {
      type: String,
      enum: ['hotel', 'flight', 'attraction', 'restaurant', 'location', 'transport', 'food', 'custom'],
      default: 'location',
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    address: { type: String, trim: true, maxlength: 240 },
    source: { type: String, trim: true, maxlength: 80 },
    externalId: { type: String, trim: true, maxlength: 180 },
    imageUrl: { type: String, trim: true, maxlength: 2000 },
    imageUrls: [{ type: String, trim: true, maxlength: 2000 }],
    visits: { type: [visitEntrySchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

visitedPlaceSchema.index({ userId: 1, placeKey: 1 }, { unique: true });
visitedPlaceSchema.index({ userId: 1, 'visits.visitedDate': 1 });

visitedPlaceSchema.virtual('visitCount').get(function visitCount() {
  return this.visits.reduce((total, visit) => total + Number(visit.visitCount || 1), 0);
});

visitedPlaceSchema.virtual('latestVisitedDate').get(function latestVisitedDate() {
  const datedVisits = this.visits
    .map((visit) => visit.visitedDate)
    .filter(Boolean)
    .sort((firstDate, secondDate) => secondDate.getTime() - firstDate.getTime());

  return datedVisits[0] || null;
});

module.exports = mongoose.model('VisitedPlace', visitedPlaceSchema, 'visitedPlaces');
