/**
 * Converts Axios and ordinary JavaScript errors into consistent UI messages.
 */

// Checks whether an error was caused by a canceled/aborted API request
export const isCanceledApiRequest = (error) =>
  error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError';

// Extracts the error code from the response or falls back to a default
export const getApiErrorCode = (error) =>
  error?.response?.data?.code || error?.code || 'REQUEST_FAILED';

// Extracts field-level validation errors from the API response
export const getApiFieldErrors = (error) => {
  const errors = error?.response?.data?.errors;
  return Array.isArray(errors) ? errors : [];
};

// Maps known error codes to user-friendly messages
const apiErrorMessages = {
  INVALID_API_KEY: 'This service is not configured correctly. Please contact an administrator.',
  NETWORK_FAILURE: 'Unable to reach the service. Check your connection and try again.',
  NO_RESULTS_FOUND: 'No results were found. Try changing your search.',
  RATE_LIMIT_EXCEEDED: 'Too many requests were made. Please wait and try again.',
  REQUEST_TIMEOUT: 'The request timed out. Please try again.',
  VALIDATION_ERROR: 'Some information is invalid. Check the highlighted fields.',
};

// Generates a user-facing error message from the error object with a fallback
export const getApiErrorMessage = (error, fallbackMessage = 'Something went wrong. Please try again.') => {
  // Returns empty string for canceled requests to avoid confusing the user
  if (isCanceledApiRequest(error)) return '';

  // Handles timeout-related errors
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return 'The request timed out. Please try again.';
  }

  const responseData = error?.response?.data;
  const fieldMessage = getApiFieldErrors(error).find((item) => item?.message || item?.msg);
  const errorCode = getApiErrorCode(error);

  // Prioritizes field-level validation messages
  if (fieldMessage) return fieldMessage.message || fieldMessage.msg;
  // Uses the response message if available
  if (responseData?.message) return responseData.message;
  // Checks the predefined error code map
  if (apiErrorMessages[errorCode]) return apiErrorMessages[errorCode];
  // Falls back to the error field from response
  if (responseData?.error) return responseData.error;

  // Handles network errors without a response
  if (!error?.response && error?.request) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'You appear to be offline. Check your internet connection and try again.';
    }

    return 'Unable to connect to the server. Please try again.';
  }

  return error?.message || fallbackMessage;
};
