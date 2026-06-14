/**
 * Trips module.
 * Schema fields define stored document structure, defaults, and indexes.
 */

// Import Mongoose for schema definition and model creation
const mongoose = require('mongoose');

// Helper function that returns the start of the current day (midnight)
// Used for date comparisons to determine trip status
const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);  // Set time to 00:00:00.000
  return today;
};

// Note Schema groups database fields before model registration.
// Stores user notes attached to a trip
const noteSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, trim: true, maxlength: 1000 },  // Note text content
    createdAt: { type: Date, default: Date.now },  // Timestamp when note was created
  },
  { _id: true }  // Each note gets its own unique identifier
);

// Budget Schema groups database fields before model registration.
// Stores financial information for the entire trip
const budgetSchema = new mongoose.Schema(
  {
    totalAmount: { type: Number, min: 0, default: 0 },    // Total budget for the trip
    currency: { type: String, trim: true, uppercase: true, default: 'MYR' },  // ISO currency code
  },
  { _id: false }  // Prevent creation of separate _id for sub-documents
);

// Travel Preference Schema groups database fields before model registration.
// Stores user preferences for trip planning and recommendations
const travelPreferenceSchema = new mongoose.Schema(
  {
    // Interest categories (booleans indicate whether user wants to include these)
    culture: { type: Boolean, default: false },
    food: { type: Boolean, default: false },
    hotel: { type: Boolean, default: false },
    attractions: { type: Boolean, default: true },  // Attractions enabled by default
    transport: { type: Boolean, default: false },
    
    companions: [{ type: String, trim: true, maxlength: 40 }],  // Travel companion names or types
    styles: [{ type: String, trim: true, maxlength: 40 }],      // Travel style tags (e.g., 'adventure', 'relaxation')
    
    // Activity density preference
    pace: { type: String, enum: ['relaxed', 'moderate', 'packed'], default: 'moderate' },
    
    // Accommodation quality preference
    accommodation: { type: String, enum: ['economy', 'comfort', 'premium', 'luxury'], default: 'comfort' },
    
    transportModes: [{ type: String, trim: true, maxlength: 40 }],  // Preferred transport (e.g., 'train', 'car', 'flight')
  },
  { _id: false }  // Prevent creation of separate _id for sub-documents
);

// Destination Segment Schema groups database fields before model registration.
// Represents a multi-city trip segment (supports complex itineraries with multiple destinations)
const destinationSegmentSchema = new mongoose.Schema(
  {
    country: { type: String, trim: true, maxlength: 80 },      // Country name
    city: { type: String, required: true, trim: true, maxlength: 120 },  // City name (required)
    placeName: { type: String, trim: true, maxlength: 160 },   // Specific place within the city
    imageUrl: { type: String, trim: true, maxlength: 2000 },    // Primary destination image
    imageUrls: [{ type: String, trim: true, maxlength: 2000 }],  // Additional destination images
    startDate: { type: Date, required: true },                 // Start date for this segment
    endDate: { type: Date, required: true },                   // End date for this segment
    order: { type: Number, min: 1, default: 1 },               // Sequential order in multi-stop trip
    notes: { type: String, trim: true, maxlength: 500 },       // Segment-specific notes
    coordinates: {
      latitude: { type: Number, min: -90, max: 90 },           // WGS84 latitude
      longitude: { type: Number, min: -180, max: 180 },        // WGS84 longitude
    },
  },
  { _id: true }  // Each segment gets its own unique identifier
);

// Document Checklist Schema groups database fields before model registration.
// Tracks required travel documents for the trip
const documentChecklistSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },                 // Whether checklist is active
    documentTypes: [{ type: String, trim: true, maxlength: 80 }],  // Required document types (e.g., 'passport', 'visa')
  },
  { _id: false }  // Prevent creation of separate _id for sub-documents
);

// Date Flexibility Schema groups database fields before model registration.
// Allows trip planning with flexible dates (for inspiration mode)
const dateFlexibilitySchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ['exact', 'flexible'], default: 'exact' },  // Exact dates or flexible window
    windowDays: { type: Number, min: 0, max: 30, default: 0 },     // Width of flexible date window
    preferredMonth: { type: String, trim: true, maxlength: 20 },    // Preferred month for flexible trips (e.g., 'July')
  },
  { _id: false }  // Prevent creation of separate _id for sub-documents
);

// Trip Schema groups database fields before model registration.
// Main document representing a user's travel plan
const tripSchema = new mongoose.Schema(
  {
    // Owner of this trip
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    title: { type: String, trim: true, maxlength: 120 },                     // Optional custom trip name
    destination: { type: String, required: true, trim: true, maxlength: 120 },  // Primary destination (city or region)
    country: { type: String, trim: true, maxlength: 80 },                    // Primary country
    startDate: { type: Date, required: true },                               // Trip start date
    endDate: { type: Date, required: true },                                 // Trip end date
    
    budget: { type: budgetSchema, default: () => ({}) },                     // Budget information
    travelPreferences: { type: travelPreferenceSchema, default: () => ({}) }, // User preferences
    destinationSegments: { type: [destinationSegmentSchema], default: [] },   // Multi-city segments
    documentChecklist: { type: documentChecklistSchema, default: () => ({}) }, // Required documents
    dateFlexibility: { type: dateFlexibilitySchema, default: () => ({}) },    // Date flexibility settings
    
    // Optimization feature toggles
    routeOptimizationEnabled: { type: Boolean, default: false },   // Enable route optimization between destinations
    budgetOptimizationEnabled: { type: Boolean, default: false },  // Enable budget-based recommendations
    
    notes: [noteSchema],  // User notes attached to the trip
  },
  {
    timestamps: true,          // Automatically add createdAt and updatedAt fields
    toJSON: { virtuals: true },  // Include virtual fields when converting to JSON
    toObject: { virtuals: true }, // Include virtual fields when converting to Object
  }
);

// Indexes for efficient querying
tripSchema.index({ userId: 1, createdAt: -1 });  // Get user's trips sorted by newest first
tripSchema.index({ userId: 1, startDate: 1 });   // Find trips by user sorted by start date
tripSchema.index({ userId: 1, endDate: 1 });     // Find trips by user sorted by end date
tripSchema.index({ destination: 1 });            // Search by destination name
tripSchema.index({ country: 1 });                // Search by country name

// Virtual field that calculates trip duration in days
// Returns null if dates are missing, otherwise calculates days including both start and end dates
tripSchema.virtual('durationDays').get(function durationDays() {
  if (!this.startDate || !this.endDate) return null;
  const diff = this.endDate.getTime() - this.startDate.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
});

// Virtual field that determines trip status based on end date comparison with today
// Returns 'active' for upcoming or ongoing trips, 'inactive' for completed trips
tripSchema.virtual('status').get(function status() {
  if (!this.endDate) return 'active';
  return this.endDate < getStartOfToday() ? 'inactive' : 'active';
});

// Static method that exposes the start-of-today calculation to other modules
// Used by repository layer for status aggregation queries
tripSchema.statics.getStatusBoundaryDate = getStartOfToday;

// Create and export the Mongoose model (collection name is automatically pluralized to 'trips')
module.exports = mongoose.model('Trip', tripSchema);
