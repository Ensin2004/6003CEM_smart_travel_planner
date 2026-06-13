/**
 * Api Logs module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');
// Api Log Schema groups database fields before model registration.
const apiLogSchema = new mongoose.Schema(
  {
    service: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['api', 'system', 'auth', 'rate-limit'],
      default: 'api',
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'],
      default: 'info',
      index: true,
    },
    method: { type: String, trim: true, uppercase: true },
    endpoint: { type: String, trim: true },
    status: { type: String, enum: ['success', 'fail', 'error'], required: true },
    statusCode: Number,
    errorCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    requestId: { type: String, required: true, trim: true, index: true },
    message: { type: String, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: true }
);

apiLogSchema.index({ createdAt: -1 });
apiLogSchema.index({ status: 1, createdAt: -1 });
apiLogSchema.index({ category: 1, severity: 1 });
module.exports = mongoose.model('ApiLog', apiLogSchema, 'apiLogs');
