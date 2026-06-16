/**
 * Converts Axios and ordinary JavaScript errors into consistent UI messages.
 */
export const isCanceledApiRequest = (error) =>
  error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError';

export const getApiErrorCode = (error) =>
  error?.response?.data?.code || error?.code || 'REQUEST_FAILED';

export const getApiFieldErrors = (error) => {
  const errors = error?.response?.data?.errors;
  return Array.isArray(errors) ? errors : [];
};

const apiErrorMessages = {
  INVALID_API_KEY: 'This service is not configured correctly. Please contact an administrator.',
  NETWORK_FAILURE: 'Unable to reach the service. Check your connection and try again.',
  NO_RESULTS_FOUND: 'No results were found. Try changing your search.',
  RATE_LIMIT_EXCEEDED: 'Too many requests were made. Please wait and try again.',
  REQUEST_TIMEOUT: 'The request timed out. Please try again.',
  VALIDATION_ERROR: 'Some information is invalid. Check the highlighted fields.',
};

export const getApiErrorMessage = (error, fallbackMessage = 'Something went wrong. Please try again.') => {
  if (isCanceledApiRequest(error)) return '';

  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return 'The request timed out. Please try again.';
  }

  const responseData = error?.response?.data;
  const fieldMessage = getApiFieldErrors(error).find((item) => item?.message || item?.msg);
  const errorCode = getApiErrorCode(error);

  if (fieldMessage) return fieldMessage.message || fieldMessage.msg;
  if (responseData?.message) return responseData.message;
  if (apiErrorMessages[errorCode]) return apiErrorMessages[errorCode];
  if (responseData?.error) return responseData.error;

  if (!error?.response && error?.request) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'You appear to be offline. Check your internet connection and try again.';
    }

    return 'Unable to connect to the server. Please try again.';
  }

  return error?.message || fallbackMessage;
};
