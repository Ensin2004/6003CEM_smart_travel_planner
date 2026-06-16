/**
 * Language Helper module.
 * Small utilities keep repeated formatting and transformation logic reusable.
 */
import { getApiErrorMessage } from '../../utils/apiError';

export const getSpeechRecognition = () => window.SpeechRecognition || window.webkitSpeechRecognition;
export const getLanguageByCode = (languages, code) =>
  languages.find((language) => language.code === code) || languages[0] || null;
export const getFriendlyApiError = (error, fallbackMessage) =>
  getApiErrorMessage(error, fallbackMessage);
export const getBrowserSpeechCode = (languageCode) => {
  const normalizedCode = String(languageCode || '').trim();
  return normalizedCode.includes('-') ? normalizedCode : normalizedCode;
};
// Format History Date converts raw values into readable display text.
export const formatHistoryDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
