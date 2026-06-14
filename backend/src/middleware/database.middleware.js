const connectDatabase = require('../config/database');
const env = require('../config/env');

const ensureDatabaseConnection = async (req, res, next) => {
  if (env.nodeEnv === 'test') {
    return next();
  }

  try {
    await connectDatabase();
    return next();
  } catch (error) {
    error.statusCode = 503;
    error.code = error.code || 'DATABASE_UNAVAILABLE';
    return next(error);
  }
};

module.exports = ensureDatabaseConnection;
