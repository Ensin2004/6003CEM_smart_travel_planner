const env = require('../config/env');

const handleCastError = (error) => ({
  statusCode: 400,
  message: `Invalid ${error.path}: ${error.value}`,
});

const errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Something went wrong';

  if (error.name === 'CastError') {
    const castError = handleCastError(error);
    statusCode = castError.statusCode;
    message = castError.message;
  }

  res.status(statusCode).json({
    status: `${statusCode}`.startsWith('4') ? 'fail' : 'error',
    message: env.nodeEnv === 'production' && statusCode === 500 ? 'Internal server error' : message,
    ...(env.nodeEnv === 'development' && { stack: error.stack }),
  });
};

module.exports = errorHandler;
