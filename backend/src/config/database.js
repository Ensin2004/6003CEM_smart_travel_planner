/**
 * Creates the MongoDB connection used by repository modules.
 * Optional DNS server overrides support environments where Atlas hostnames need
 * custom resolution before Mongoose opens the connection.
 */

// Import DNS module for custom DNS server configuration
const dns = require('dns');
// Import Mongoose for MongoDB connection management
const mongoose = require('mongoose');
// Import environment configuration containing database URI and DNS settings
const env = require('./env');

// Main function that establishes MongoDB connection with optional DNS overrides
const connectDatabase = async () => {
  // Strict query mode prevents accidental filtering by fields missing from schemas.
  // Enables Mongoose to reject queries that reference fields not defined in schemas,
  // reducing the risk of unexpected behavior from typos or malformed queries.
  mongoose.set('strictQuery', true);

  // Custom DNS servers are applied only when configured through environment variables.
  // This is particularly useful for environments where MongoDB Atlas hostnames
  // require custom resolution (e.g., development environments with internal DNS).
  if (env.mongoDnsServers.length > 0) {
    dns.setServers(env.mongoDnsServers);
  }

  // Establish connection to MongoDB using the URI from environment configuration
  await mongoose.connect(env.mongoUri);
  
  // Log successful connection (production would use structured logger instead of console)
  console.log('MongoDB connected');
};

// Export the connection function for use in application startup
module.exports = connectDatabase;