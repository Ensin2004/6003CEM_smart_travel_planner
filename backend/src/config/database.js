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
  // This ensures that query filters only include fields defined in the schema,
  // avoiding silent failures from typos or undefined fields.
  mongoose.set('strictQuery', true);

  // Custom DNS servers are applied only when configured through environment variables.
  // This allows overriding default DNS resolution for MongoDB Atlas connections
  // in environments with restricted network access or custom DNS requirements.
  if (env.mongoDnsServers.length > 0) {
    dns.setServers(env.mongoDnsServers);
  }

  // Establish connection to MongoDB using the URI from environment configuration
  await mongoose.connect(env.mongoUri);
  
  // Log successful connection establishment for operational monitoring
  console.log('MongoDB connected');
};

module.exports = connectDatabase;
