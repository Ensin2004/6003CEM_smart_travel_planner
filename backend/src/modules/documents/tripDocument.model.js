const mongoose = require('mongoose');

const tripDocumentSchema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    documentType: { type: String, required: true, trim: true, maxlength: 80 },
    fileUrl: { type: String, required: true, trim: true },
    storagePath: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true },
    fileSize: { type: Number, min: 0 },
    expiryDate: { type: Date, index: true },
    reminderDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TripDocument', tripDocumentSchema, 'tripDocuments');
