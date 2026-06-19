/**
 * Feedback module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');

/**
 * Feedback Schema groups database fields before model registration.
 * Stores user-submitted feedback including rating, message, and user details.
 * Used for gathering user opinions and improving the application.
 */
const feedbackSchema = new mongoose.Schema(
  {
    // User who submitted the feedback - references the User collection
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    
    // User's display name - denormalized for quick display without population
    userName: { type: String, required: true, trim: true },
    
    // User's email address - denormalized for admin contact without population
    userEmail: { type: String, required: true, trim: true },
    
    // Rating score from 1 to 5 (1 = poor, 5 = excellent)
    rating: { type: Number, required: true, min: 1, max: 5 },
    
    // Optional detailed feedback message (max 1500 characters)
    feedback: { type: String, trim: true, maxlength: 1500 },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt timestamps
);

// Indexes for query performance
feedbackSchema.index({ createdAt: -1 }); // For retrieving newest feedback first
feedbackSchema.index({ rating: 1 }); // For filtering by rating

module.exports = mongoose.model('Feedback', feedbackSchema);