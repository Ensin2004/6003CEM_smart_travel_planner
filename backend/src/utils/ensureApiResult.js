const AppError = require('./AppError');

// Retrieves a nested value from an object using dot notation path.
const getByPath = (source, path) =>
  path.split('.').reduce((value, key) => value?.[key], source);

// Ensures an API result contains data and throws appropriate errors otherwise.
const ensureApiResult = (
  result,
  {
    itemPaths = ['items'],
    noResultsMessage = 'No results found.',
  } = {}
) => {
  // Throws AppError when the result contains an error code.
  if (result?.errorCode) {
    const statusCode =
      result.errorCode === 'NO_RESULTS_FOUND'
        ? 404
        : result.errorCode === 'RATE_LIMIT_EXCEEDED'
          ? 429
          : result.errorCode === 'INVALID_API_KEY'
            ? 502
            : 503;
    throw new AppError(result.message || noResultsMessage, statusCode, result.errorCode);
  }

  // Checks if any specified path contains data (non-empty array or truthy value).
  const hasResults = itemPaths.some((path) => {
    const value = getByPath(result, path);
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });

  // Throws error when no results are found in any of the specified paths.
  if (!hasResults) {
    throw new AppError(noResultsMessage, 404, 'NO_RESULTS_FOUND');
  }

  // Returns the original result when data is present.
  return result;
};

// Exports the result validation function for use in external API calls.
module.exports = ensureApiResult;