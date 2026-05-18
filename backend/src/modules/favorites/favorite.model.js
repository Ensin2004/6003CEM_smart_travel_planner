const mongoose = require('mongoose');

const favoriteLocationSchema = new mongoose.Schema(
  {
    address: { type: String, trim: true },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        validate: {
          validator(value) {
            return !value || value.length === 2;
          },
          message: 'Coordinates must contain longitude and latitude',
        },
      },
    },
  },
  { _id: false }
);

const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['hotel', 'flight', 'attraction', 'restaurant', 'location', 'transport'],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000 },
    location: { type: favoriteLocationSchema, default: undefined },
    priceLevel: { type: String, trim: true },
    rating: { type: Number, min: 0, max: 5 },
    externalId: { type: String, trim: true },
    source: { type: String, trim: true },
  },
  { timestamps: true }
);

favoriteSchema.index({ userId: 1, type: 1 });
favoriteSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.model('Favorite', favoriteSchema, 'favorites');
