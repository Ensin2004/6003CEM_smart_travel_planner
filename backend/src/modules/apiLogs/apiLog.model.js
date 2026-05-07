const mongoose = require('mongoose');

const apiLogSchema = new mongoose.Schema(
  {
    service: { type: String, required: true, trim: true },
    endpoint: { type: String, trim: true },
    status: { type: String, enum: ['success', 'fail', 'error'], required: true },
    statusCode: Number,
    message: { type: String, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

apiLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ApiLog', apiLogSchema);
