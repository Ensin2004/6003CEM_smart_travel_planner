/**
 * Api Logs module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');

// Api Log Schema groups database fields before model registration.
// Defines the structure for storing API request/response logs for monitoring and debugging
const apiLogSchema = new mongoose.Schema(
  {
    // Service identifier - which microservice or component generated the log
    service: { type: String, required: true, trim: true },
    
    // Log category for filtering and aggregation
    category: {
      type: String,
      enum: ['api', 'system', 'auth', 'rate-limit'], // Allowable categories
      default: 'api',
      index: true, // Indexed for efficient category-based queries
    },
    
    // Severity level for alerting and prioritization
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'], // Severity levels from lowest to highest
      default: 'info',
      index: true, // Indexed for severity-based filtering
    },
    
    // HTTP method of the request (GET, POST, PUT, DELETE, etc.)
    method: { type: String, trim: true, uppercase: true },
    
    // API endpoint path that was called
    endpoint: { type: String, trim: true },
    
    // Overall request status - success, fail, or error
    status: { type: String, enum: ['success', 'fail', 'error'], required: true },
    
    // HTTP status code returned to the client
    statusCode: Number,
    
    // Standardized error code for client and system handling
    errorCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    
    // Correlation ID for tracing requests across services
    requestId: { type: String, required: true, trim: true, index: true },
    
    // Human-readable log message
    message: { type: String, trim: true },
    
    // User ID associated with the request (if authenticated)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    
    // Flexible metadata field for additional context (request payload, error details, etc.)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt timestamps
);

// Compound indexes for optimized query performance
apiLogSchema.index({ createdAt: -1 }); // For retrieving most recent logs
apiLogSchema.index({ status: 1, createdAt: -1 }); // For filtering by status and ordering by date
apiLogSchema.index({ category: 1, severity: 1 }); // For filtering by category and severity

// Create and export the Mongoose model for the apiLogs collection
module.exports = mongoose.model('ApiLog', apiLogSchema, 'apiLogs');