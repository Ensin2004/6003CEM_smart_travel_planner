const mongoose = require('mongoose');
const {
  defaultPackingCategory,
  defaultPriorityLevel,
  normalizePriorityLevel,
  priorityLevels,
} = require('./travelTools.constants');

const packingItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: {
      type: String,
      default: defaultPackingCategory,
      trim: true,
      maxlength: 80,
    },
    priority: {
      type: String,
      enum: priorityLevels,
      default: defaultPriorityLevel,
    },
    quantity: { type: Number, min: 1, max: 999, default: 1 },
    isPacked: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

const packingListSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    destination: { type: String, trim: true, maxlength: 120 },
    tripStartDate: { type: Date },
    tripEndDate: { type: Date },
    templateKey: { type: String, trim: true, maxlength: 60 },
    items: [packingItemSchema],
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

packingListSchema.index({ userId: 1, createdAt: -1 });
packingListSchema.index({ userId: 1, tripId: 1 });

packingListSchema.pre('validate', function normalizeItemPriorities() {
  this.items.forEach((item) => {
    item.priority = normalizePriorityLevel(item.priority);
  });
});

packingListSchema.virtual('progress').get(function progress() {
  const totalItems = this.items.length;
  const packedItems = this.items.filter((item) => item.isPacked).length;
  return {
    totalItems,
    packedItems,
    percent: totalItems ? Math.round((packedItems / totalItems) * 100) : 0,
  };
});

const templateItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, default: defaultPackingCategory, trim: true, maxlength: 80 },
    priority: { type: String, enum: priorityLevels, default: defaultPriorityLevel },
    quantity: { type: Number, min: 1, max: 999, default: 1 },
  },
  { _id: true }
);

const packingTemplateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    destination: { type: String, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 180 },
    items: { type: [templateItemSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

packingTemplateSchema.index({ userId: 1, updatedAt: -1 });
packingTemplateSchema.index({ userId: 1, title: 1 });

packingTemplateSchema.pre('validate', function normalizeItemPriorities() {
  this.items.forEach((item) => {
    item.priority = normalizePriorityLevel(item.priority);
  });
});

const documentFileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 180 },
    mimeType: { type: String, required: true, trim: true, maxlength: 120 },
    size: { type: Number, min: 0, max: 10 * 1024 * 1024, required: true },
    dataUrl: { type: String, required: true },
    previewType: {
      type: String,
      enum: ['image', 'pdf', 'office'],
      default: 'office',
    },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const documentItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    documentType: {
      type: String,
      enum: ['Passport', 'Visa', 'Insurance', 'Ticket', 'Booking', 'Transport', 'Health', 'Contact', 'Custom'],
      default: 'Custom',
    },
    uploadLabel: { type: String, trim: true, maxlength: 180 },
    files: { type: [documentFileSchema], default: [] },
  },
  { _id: true, timestamps: true }
);

const tripDocumentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    type: {
      type: String,
      enum: ['Passport', 'Visa', 'Insurance', 'Ticket', 'Booking', 'Custom'],
      default: 'Custom',
    },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', index: true },
    templateKey: { type: String, trim: true, maxlength: 80 },
    items: { type: [documentItemSchema], default: [] },
    files: {
      type: [documentFileSchema],
      default: [],
    },
    expiryDate: { type: Date, index: true },
    reminderDate: { type: Date },
  },
  { timestamps: true }
);

tripDocumentSchema.index({ userId: 1, createdAt: -1 });
tripDocumentSchema.index({ userId: 1, tripId: 1 });

const documentTemplateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    documentType: {
      type: String,
      enum: ['Passport', 'Visa', 'Insurance', 'Ticket', 'Booking', 'Custom', 'passport', 'visa', 'insurance', 'ticket', 'booking', 'custom'],
      default: 'Custom',
    },
    description: { type: String, trim: true, maxlength: 1000 },
    fileNames: { type: [String], default: [] },
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

documentTemplateSchema.index({ userId: 1, documentType: 1 });

const getModel = (name, schema, collection) =>
  mongoose.models[name] || mongoose.model(name, schema, collection);

module.exports = {
  DocumentTemplate: getModel('DocumentTemplate', documentTemplateSchema, 'documentTemplates'),
  PackingList: getModel('PackingList', packingListSchema, 'packingLists'),
  PackingTemplate: getModel('PackingTemplate', packingTemplateSchema, 'packingTemplates'),
  TripDocument: getModel('TripDocument', tripDocumentSchema, 'tripDocuments'),
};
