/**
 * Currency module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');
// Exchange Rate Cache Schema groups database fields before model registration.
const exchangeRateCacheSchema = new mongoose.Schema(
  {
    baseCurrency: { type: String, required: true, trim: true, uppercase: true },
    targetCurrency: { type: String, required: true, trim: true, uppercase: true },
    rate: { type: Number, required: true, min: 0 },
    provider: { type: String, trim: true, default: 'Exchange Rate API' },
    rateDate: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

exchangeRateCacheSchema.index({ baseCurrency: 1, targetCurrency: 1, rateDate: 1 }, { unique: true });
exchangeRateCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('ExchangeRateCache', exchangeRateCacheSchema, 'exchangeRateCache');
