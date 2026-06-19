/**
 * Categories module.
 * Admin-managed search categories replace frontend-only option lists.
 */
const mongoose = require('mongoose');

/**
 * Category schema for admin-managed search categories.
 * Categories define available options for different types of places
 * (hotels, attractions, food) that users can search and filter by.
 * 
 * Categories are managed by administrators and synchronized to clients
 * via socket events when changes occur.
 */
const categorySchema = new mongoose.Schema(
  {
    // Category type - determines which part of the application uses this category
    type: {
      type: String,
      enum: ['hotel', 'attraction', 'food'], // Only these three types are supported
      required: true,
      index: true, // Indexed for efficient filtering by type
    },
    
    // Display name of the category shown to users
    name: { type: String, required: true, trim: true, maxlength: 80 },
    
    // Internal value used for filtering and API requests
    // Stored in lowercase for consistent matching
    value: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

// Compound unique index to prevent duplicate category values within the same type
categorySchema.index({ type: 1, value: 1 }, { unique: true });

// Compound index for efficient queries by type and name
categorySchema.index({ type: 1, name: 1 });

module.exports = mongoose.model('Category', categorySchema);