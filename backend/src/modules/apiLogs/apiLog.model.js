const mongoose = require('mongoose');

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
    message: { type: String, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: {
      type: Map,
      of: String,
      default: undefined,
    },
  },
  { timestamps: true }
);

apiLogSchema.index({ createdAt: -1 });
apiLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ApiLog', apiLogSchema);
