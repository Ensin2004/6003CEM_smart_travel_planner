/**
 * Notifications module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');
// Notification Schema groups database fields before model registration.
const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', index: true },
    type: {
      type: String,
      enum: [
        'trip-reminder',
        'packing-list',
        'weather-alert',
        'document-expiry',
        'budget-alert',
        'admin-rate-limit',
        'admin-signup',
        'admin-error-log',
        'admin-login-lock',
        'system',
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 1200 },
    isRead: { type: Boolean, default: false },
    scheduledAt: { type: Date, index: true },
    sentAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ sentAt: 1, scheduledAt: 1 });
module.exports = mongoose.model('Notification', notificationSchema, 'notifications');
