/**
 * Creates the MongoDB connection used by repository modules.
 * Optional DNS server overrides support environments where Atlas hostnames need
 * custom resolution before Mongoose opens the connection.
 */
const dns = require('dns');
const mongoose = require('mongoose');
const env = require('./env');

let connectionPromise;

const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!env.mongoUri) {
    const error = new Error('MONGODB_URI is not configured');
    error.statusCode = 503;
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  // Strict query mode prevents accidental filtering by fields missing from schemas.
  mongoose.set('strictQuery', true);

  // Custom DNS servers are applied only when configured through environment variables.
  if (env.mongoDnsServers.length > 0) {
    dns.setServers(env.mongoDnsServers);
  }

  connectionPromise = mongoose
    .connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 })
    .then(() => {
      console.log('MongoDB connected');
      return mongoose.connection;
    })
    .catch((error) => {
      connectionPromise = undefined;
      throw error;
    });

  return connectionPromise;
};

module.exports = connectDatabase;
