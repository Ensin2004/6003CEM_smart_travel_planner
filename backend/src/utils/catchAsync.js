/**
 * Catch Async module.
 * Exports and local helpers keep related behavior in a single module.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
module.exports = catchAsync;
