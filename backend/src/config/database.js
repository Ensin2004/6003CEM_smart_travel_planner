/**
 * Creates the MongoDB connection used by repository modules.
 * Optional DNS server overrides support environments where Atlas hostnames need
 * custom resolution before Mongoose opens the connection.
 */
const dns = require('dns');
const mongoose = require('mongoose');
const env = require('./env');

const connectDatabase = async () => {
  // Strict query mode prevents accidental filtering by fields missing from schemas.
  mongoose.set('strictQuery', true);

  // Custom DNS servers are applied only when configured through environment variables.
  if (env.mongoDnsServers.length > 0) {
    dns.setServers(env.mongoDnsServers);
  }

  await mongoose.connect(env.mongoUri);
  console.log('MongoDB connected');
};

module.exports = connectDatabase;
