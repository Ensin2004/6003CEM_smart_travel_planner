const AppError = require('./AppError');

const getByPath = (source, path) =>
  path.split('.').reduce((value, key) => value?.[key], source);

const ensureApiResult = (
  result,
  {
    itemPaths = ['items'],
    noResultsMessage = 'No results found.',
  } = {}
) => {
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

  const hasResults = itemPaths.some((path) => {
    const value = getByPath(result, path);
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });

  if (!hasResults) {
    throw new AppError(noResultsMessage, 404, 'NO_RESULTS_FOUND');
  }

  return result;
};

module.exports = ensureApiResult;
