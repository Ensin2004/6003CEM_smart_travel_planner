/**
 * Notifications module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');

/**
 * Notification Schema groups database fields before model registration.
 * Stores user notifications for events including trip reminders,
 * budget alerts, and admin notifications.
 */
const notificationSchema = new mongoose.Schema(
  {
    // User who receives the notification - required and indexed for efficient queries
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    
    // Optional reference to a trip (for trip-related notifications)
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', index: true },
    
    // Type of notification - determines icon, behavior, and category
    type: {
      type: String,
      enum: [
        'trip-reminder',      // Trip date approaching
        'packing-list',       // Packing list reminder
        'document-expiry',    // Document expiration warning
        'budget-alert',       // Budget threshold exceeded
        'admin-rate-limit',   // Rate limit exceeded (admin alert)
        'admin-signup',       // New user signed up (admin alert)
        'admin-feedback',     // New feedback received (admin alert)
        'admin-error-log',    // Server error occurred (admin alert)
        'admin-login-lock',   // Account locked (admin alert)
        'system',             // System-wide announcements
      ],
      required: true,
    },
    
    // Notification title (e.g., "Trip reminder: Tokyo")
    title: { type: String, required: true, trim: true, maxlength: 160 },
    
    // Detailed message content
    message: { type: String, required: true, trim: true, maxlength: 1200 },
    
    // Whether the user has read the notification
    isRead: { type: Boolean, default: false },
    
    // When the notification should be displayed (for scheduled notifications)
    scheduledAt: { type: Date, index: true },
    
    // When the notification was actually sent/delivered
    sentAt: { type: Date },
    
    // Flexible metadata for additional notification context
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt timestamps
);

// Indexes for query performance
notificationSchema.index({ userId: 1, isRead: 1 }); // For filtering unread notifications per user
notificationSchema.index({ userId: 1, createdAt: -1 }); // For retrieving newest notifications per user
notificationSchema.index({ sentAt: 1, scheduledAt: 1 }); // For scheduled notification processing

module.exports = mongoose.model('Notification', notificationSchema, 'notifications');
