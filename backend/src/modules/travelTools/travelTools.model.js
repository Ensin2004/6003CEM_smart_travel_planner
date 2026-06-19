/**
 * Travel Tools module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');
const {
  defaultPackingCategory,
  defaultPriorityLevel,
  normalizePriorityLevel,
  priorityLevels,
} = require('./travelTools.constants');

// Packing Item Schema groups database fields before model registration.
const packingItemSchema = new mongoose.Schema(
  {
    // Name of the packing item
    name: { type: String, required: true, trim: true, maxlength: 120 },
    
    // Category for organizing items
    category: {
      type: String,
      default: defaultPackingCategory,
      trim: true,
      maxlength: 80,
    },
    
    // Priority level (High, Medium, Low)
    priority: {
      type: String,
      enum: priorityLevels,
      default: defaultPriorityLevel,
    },
    
    // Quantity of the item
    quantity: { type: Number, min: 1, max: 999, default: 1 },
    
    // Whether the item has been packed
    isPacked: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true } // Auto-manage createdAt and updatedAt
);

// Packing List Schema groups database fields before model registration.
const packingListSchema = new mongoose.Schema(
  {
    // Owner of the packing list
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    
    // Associated trip (optional)
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', index: true },
    
    // Title of the packing list
    title: { type: String, required: true, trim: true, maxlength: 120 },
    
    // Destination for the trip
    destination: { type: String, trim: true, maxlength: 120 },
    
    // Trip date range
    tripStartDate: { type: Date },
    tripEndDate: { type: Date },
    
    // Reference to template used
    templateKey: { type: String, trim: true, maxlength: 60 },
    
    // Array of packing items
    items: [packingItemSchema],
    
    // Reminder settings
    reminder: {
      enabled: { type: Boolean, default: true },
      daysBeforeTrip: { type: Number, min: 0, max: 30, default: 2 },
      lastNotifiedAt: { type: Date },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for user-based queries with sorting
packingListSchema.index({ userId: 1, createdAt: -1 });

// Index for trip-based lookups
packingListSchema.index({ userId: 1, tripId: 1 });

// Pre-validate hook to normalize item priorities
packingListSchema.pre('validate', function normalizeItemPriorities() {
  this.items.forEach((item) => {
    item.priority = normalizePriorityLevel(item.priority);
  });
});

// Virtual property for packing progress
packingListSchema.virtual('progress').get(function progress() {
  const totalItems = this.items.length;
  const packedItems = this.items.filter((item) => item.isPacked).length;
  return {
    totalItems,
    packedItems,
    percent: totalItems ? Math.round((packedItems / totalItems) * 100) : 0,
  };
});

// Template Item Schema groups database fields before model registration.
const templateItemSchema = new mongoose.Schema(
  {
    // Name of the template item
    name: { type: String, required: true, trim: true, maxlength: 120 },
    
    // Category for organizing items
    category: { type: String, default: defaultPackingCategory, trim: true, maxlength: 80 },
    
    // Priority level (High, Medium, Low)
    priority: { type: String, enum: priorityLevels, default: defaultPriorityLevel },
    
    // Default quantity
    quantity: { type: Number, min: 1, max: 999, default: 1 },
  },
  { _id: true }
);

// Packing Template Schema groups database fields before model registration.
const packingTemplateSchema = new mongoose.Schema(
  {
    // Owner of the template
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    
    // Associated trip (optional)
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', index: true },
    
    // Title of the template
    title: { type: String, required: true, trim: true, maxlength: 120 },
    
    // Destination context
    destination: { type: String, trim: true, maxlength: 120 },
    
    // Description of the template
    description: { type: String, trim: true, maxlength: 180 },
    
    // Array of template items
    items: { type: [templateItemSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for user-based queries
packingTemplateSchema.index({ userId: 1, updatedAt: -1 });

// Index for title lookups
packingTemplateSchema.index({ userId: 1, title: 1 });

// Pre-validate hook to normalize item priorities
packingTemplateSchema.pre('validate', function normalizeItemPriorities() {
  this.items.forEach((item) => {
    item.priority = normalizePriorityLevel(item.priority);
  });
});

// Document File Schema groups database fields before model registration.
const documentFileSchema = new mongoose.Schema(
  {
    // Original filename
    name: { type: String, required: true, trim: true, maxlength: 180 },
    
    // MIME type of the file
    mimeType: { type: String, required: true, trim: true, maxlength: 120 },
    
    // File size in bytes (max 10MB)
    size: { type: Number, min: 0, max: 10 * 1024 * 1024, required: true },
    
    // Base64 or data URL
    dataUrl: { type: String, required: true },
    
    // Preview type for display
    previewType: {
      type: String,
      enum: ['image', 'pdf', 'office'],
      default: 'office',
    },
    
    // Upload timestamp
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// Document Item Schema groups database fields before model registration.
const documentItemSchema = new mongoose.Schema(
  {
    // Name of the document item
    name: { type: String, required: true, trim: true, maxlength: 140 },
    
    // Type classification
    documentType: {
      type: String,
      enum: ['Passport', 'Visa', 'Insurance', 'Ticket', 'Booking', 'Transport', 'Health', 'Contact', 'Custom'],
      default: 'Custom',
    },
    
    // Label for file uploads
    uploadLabel: { type: String, trim: true, maxlength: 180 },
    
    // Associated files
    files: { type: [documentFileSchema], default: [] },
  },
  { _id: true, timestamps: true }
);

// Trip Document Schema groups database fields before model registration.
const tripDocumentSchema = new mongoose.Schema(
  {
    // Owner of the document
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    
    // Name of the document
    name: { type: String, required: true, trim: true, maxlength: 160 },
    
    // Type classification
    type: {
      type: String,
      enum: ['Passport', 'Visa', 'Insurance', 'Ticket', 'Booking', 'Custom'],
      default: 'Custom',
    },
    
    // Associated trip (optional)
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', index: true },
    
    // Reference to template used
    templateKey: { type: String, trim: true, maxlength: 80 },
    
    // Array of document items
    items: { type: [documentItemSchema], default: [] },
    
    // Direct file attachments
    files: {
      type: [documentFileSchema],
      default: [],
    },
    
    // Expiry date for documents
    expiryDate: { type: Date, index: true },
    
    // Reminder date for notifications
    reminderDate: { type: Date },
  },
  { timestamps: true }
);

// Index for user-based queries
tripDocumentSchema.index({ userId: 1, createdAt: -1 });

// Index for trip-based lookups
tripDocumentSchema.index({ userId: 1, tripId: 1 });

// Document Template Schema groups database fields before model registration.
const documentTemplateSchema = new mongoose.Schema(
  {
    // Owner of the template
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    
    // Name of the template
    name: { type: String, required: true, trim: true, maxlength: 120 },
    
    // Document type classification
    documentType: {
      type: String,
      enum: ['Passport', 'Visa', 'Insurance', 'Ticket', 'Booking', 'Custom', 'passport', 'visa', 'insurance', 'ticket', 'booking', 'custom'],
      default: 'Custom',
    },
    
    // Description of the template
    description: { type: String, trim: true, maxlength: 1000 },
    
    // Default file names
    fileNames: { type: [String], default: [] },
    
    // Array of document items
    items: {
      type: [
        new mongoose.Schema(
          {
            name: { type: String, required: true, trim: true, maxlength: 140 },
            documentType: {
              type: String,
              enum: ['Passport', 'Visa', 'Insurance', 'Ticket', 'Booking', 'Transport', 'Health', 'Contact', 'Custom'],
              default: 'Custom',
            },
            uploadLabel: { type: String, trim: true, maxlength: 180 },
          },
          { _id: true }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// Index for document type queries
documentTemplateSchema.index({ userId: 1, documentType: 1 });

// Helper to get or create model (prevents overwrite errors)
const getModel = (name, schema, collection) =>
  mongoose.models[name] || mongoose.model(name, schema, collection);

// Export all models
module.exports = {
  DocumentTemplate: getModel('DocumentTemplate', documentTemplateSchema, 'documentTemplates'),
  PackingList: getModel('PackingList', packingListSchema, 'packingLists'),
  PackingTemplate: getModel('PackingTemplate', packingTemplateSchema, 'packingTemplates'),
  TripDocument: getModel('TripDocument', tripDocumentSchema, 'tripDocuments'),
};