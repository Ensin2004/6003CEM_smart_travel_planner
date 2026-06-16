/**
 * Language Helper module.
 * Small utilities keep repeated formatting and transformation logic reusable.
 */

// ============================================================
// IMPORTS
// ============================================================

import { getApiErrorMessage } from '../../utils/apiError';

// ============================================================
// SPEECH RECOGNITION ACCESSOR
// ============================================================

/**
 * Retrieves the browser's speech recognition constructor.
 * Provides cross-browser compatibility by checking both standard and prefixed versions.
 * Returns undefined if speech recognition is not supported in the current browser.
 */
export const getSpeechRecognition = () => window.SpeechRecognition || window.webkitSpeechRecognition;

// ============================================================
// LANGUAGE CODE LOOKUP
// ============================================================

/**
 * Finds a language object by its code from a provided array.
 * Returns the matching language object, or the first language in the array as a fallback,
 * or null if the array is empty or undefined.
 * 
 * @param {Array} languages - Array of language objects with a 'code' property
 * @param {string} code - The language code to search for
 * @returns {Object|null} The found language object or null
 */
export const getLanguageByCode = (languages, code) =>
  languages.find((language) => language.code === code) || languages[0] || null;

// ============================================================
// API ERROR FORMATTING
// ============================================================

/**
 * Formats an API error into a user-friendly message.
 * Delegates to the shared apiError utility with a fallback message.
 * Ensures consistent error messaging across the application.
 * 
 * @param {Error|string} error - The error object or message from the API
 * @param {string} fallbackMessage - Default message to display when error cannot be parsed
 * @returns {string} A readable error message
 */
export const getFriendlyApiError = (error, fallbackMessage) =>
  getApiErrorMessage(error, fallbackMessage);

// ============================================================
// BROWSER SPEECH CODE NORMALIZATION
// ============================================================

/**
 * Normalizes a language code for browser speech recognition compatibility.
 * Returns the code unchanged if it already contains a hyphen (e.g., 'en-US').
 * For codes without a hyphen (e.g., 'en'), returns the code as-is for browser compatibility.
 * 
 * @param {string} languageCode - The language code to normalize
 * @returns {string} The normalized language code suitable for speech recognition APIs
 */
export const getBrowserSpeechCode = (languageCode) => {
  const normalizedCode = String(languageCode || '').trim();
  return normalizedCode.includes('-') ? normalizedCode : normalizedCode;
};

// ============================================================
// HISTORY DATE FORMATTING
// ============================================================

/**
 * Formats a date value into a readable display string for history entries.
 * Uses the browser's Intl.DateTimeFormat with medium date and short time styles.
 * Automatically handles various date input formats (timestamps, date strings, Date objects).
 * 
 * @param {string|number|Date} value - The date value to format
 * @returns {string} A formatted date string (e.g., "Jan 15, 2024, 2:30 PM")
 */
export const formatHistoryDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
  