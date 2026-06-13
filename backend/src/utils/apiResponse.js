/**
 * Api Response module.
 * Exports and local helpers keep related behavior in a single module.
 */
const sendSuccess = (res, statusCode, data, message = 'Success') => {
  res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
};
module.exports = { sendSuccess };
