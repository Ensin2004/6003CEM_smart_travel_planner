export const getSpeechRecognition = () => window.SpeechRecognition || window.webkitSpeechRecognition;

export const getLanguageByCode = (languages, code) =>
  languages.find((language) => language.code === code) || languages[0] || null;

export const getFriendlyApiError = (error, fallbackMessage) =>
  error.response?.data?.message || error.response?.data?.errors?.[0]?.message || fallbackMessage;

export const getBrowserSpeechCode = (languageCode) => {
  const normalizedCode = String(languageCode || '').trim();
  return normalizedCode.includes('-') ? normalizedCode : normalizedCode;
};

export const formatHistoryDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
