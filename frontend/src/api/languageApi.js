import axiosClient from './axiosClient';

const TRANSLATE_SCRIPT_ID = 'translate-js-client';
const TRANSLATE_SCRIPT_SRC = 'https://cdn.staticfile.net/translate.js/3.18.66/translate.js';
const LANGUAGE_STORAGE_KEY = 'smartTravelPlanner.language';

export const DEFAULT_LANGUAGE = 'english';

let preferredLanguage = DEFAULT_LANGUAGE;

const formatLanguageLabel = (value) =>
  value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const languageLabels = {
  english: 'English',
  chinese_simplified: '简体中文',
  chinese_traditional: '繁體中文',
  malay: 'Bahasa Melayu',
  korean: '한국어',
  japanese: '日本語',
  russian: 'Русский',
  arabic: 'العربية',
  deutsch: 'Deutsch',
  french: 'Français',
  portuguese: 'Português',
  thai: 'ภาษาไทย',
  turkish: 'Türkçe',
  vietnamese: 'Tiếng Việt',
  afrikaans: 'Afrikaans',
  amharic: 'አማርኛ',
  azerbaijani: 'Azərbaycanca',
  bengali: 'বাংলা',
  bosnian: 'Bosnian',
  catalan: 'Català',
  czech: 'Čeština',
  welsh: 'Cymraeg',
  danish: 'Dansk',
  greek: 'Ελληνικά',
  spanish: 'Español',
  estonian: 'Eesti',
  persian: 'فارسی',
  finnish: 'Suomi',
  irish: 'Gaeilge',
  gujarati: 'ગુજરાતી',
  hindi: 'हिन्दी',
  croatian: 'Hrvatski',
  hungarian: 'Magyar',
  armenian: 'Հայերեն',
  dutch: 'Nederlands',
  italian: 'Italiano',
  indonesian: 'Bahasa Indonesia',
  icelandic: 'Íslenska',
  hebrew: 'עברית',
  khmer: 'ភាសាខ្មែរ',
  kannada: 'ಕನ್ನಡ',
  kurdish: 'Kurdî',
  kyrgyz: 'Кыргызча',
  latin: 'Latin',
  luxembourgish: 'Lëtzebuergesch',
  luganda: 'Luganda',
  lao: 'ລາວ',
  lithuanian: 'Lietuvių',
  latvian: 'Latviešu',
  maori: 'Māori',
  macedonian: 'Македонски',
  malayalam: 'മലയാളം',
  marathi: 'मराठी',
  maltese: 'Malti',
  burmese: 'မြန်မာ',
  nepali: 'नेपाली',
  norwegian: 'Norsk',
  punjabi: 'ਪੰਜਾਬੀ',
  polish: 'Polski',
  pashto: 'پښتو',
  quechua: 'Runa Simi',
  romanian: 'Română',
  kinyarwanda: 'Kinyarwanda',
  slovak: 'Slovenčina',
  slovene: 'Slovenščina',
  samoan: 'Gagana Samoa',
  albanian: 'Shqip',
  swedish: 'Svenska',
  swahili: 'Swahili',
  tamil: 'தமிழ்',
  telugu: 'తెలుగు',
  tajik: 'Тоҷикӣ',
  filipino: 'Filipino',
  ukrainian: 'Українська',
  urdu: 'اردو',
  haitian_creole: 'Kreyòl Ayisyen',
  malagasy: 'Malagasy',
  tongan: 'Lea Faka-Tonga',
};

const languageFlags = {
  english: 'gb',
  chinese_simplified: 'cn',
  chinese_traditional: 'tw',
  malay: 'my',
  korean: 'kr',
  japanese: 'jp',
  russian: 'ru',
  arabic: 'sa',
  deutsch: 'de',
  french: 'fr',
  portuguese: 'pt',
  thai: 'th',
  turkish: 'tr',
  vietnamese: 'vn',
  afrikaans: 'za',
  amharic: 'et',
  azerbaijani: 'az',
  bengali: 'bd',
  bosnian: 'ba',
  catalan: 'es',
  czech: 'cz',
  welsh: 'gb-wls',
  danish: 'dk',
  greek: 'gr',
  spanish: 'es',
  estonian: 'ee',
  persian: 'ir',
  finnish: 'fi',
  irish: 'ie',
  gujarati: 'in',
  hindi: 'in',
  croatian: 'hr',
  hungarian: 'hu',
  armenian: 'am',
  dutch: 'nl',
  italian: 'it',
  indonesian: 'id',
  icelandic: 'is',
  hebrew: 'il',
  khmer: 'kh',
  kannada: 'in',
  kurdish: 'tr',
  kyrgyz: 'kg',
  latin: 'va',
  luxembourgish: 'lu',
  luganda: 'ug',
  lao: 'la',
  lithuanian: 'lt',
  latvian: 'lv',
  maori: 'nz',
  macedonian: 'mk',
  malayalam: 'in',
  marathi: 'in',
  maltese: 'mt',
  burmese: 'mm',
  nepali: 'np',
  norwegian: 'no',
  punjabi: 'in',
  polish: 'pl',
  pashto: 'af',
  quechua: 'pe',
  romanian: 'ro',
  kinyarwanda: 'rw',
  slovak: 'sk',
  slovene: 'si',
  samoan: 'ws',
  albanian: 'al',
  swedish: 'se',
  swahili: 'tz',
  tamil: 'in',
  telugu: 'in',
  tajik: 'tj',
  filipino: 'ph',
  ukrainian: 'ua',
  urdu: 'pk',
  haitian_creole: 'ht',
  malagasy: 'mg',
  tongan: 'to',
};

const isSupportedLanguage = (language) =>
  Boolean(language && Object.prototype.hasOwnProperty.call(languageLabels, language));

const savePreferredLanguage = (language) => {
  if (!isSupportedLanguage(language) || typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage failures so translation still works in private/restricted contexts.
  }
};

export const getSavedTranslateLanguage = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }

  try {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(savedLanguage) ? savedLanguage : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

export const getAvailableLanguages = () =>
  Object.entries(languageLabels).map(([value, label]) => ({
    value,
    label: label || formatLanguageLabel(value),
    flagCode: languageFlags[value],
    flagUrl: languageFlags[value]
      ? `https://flagcdn.com/24x18/${languageFlags[value]}.png`
      : '',
  }));

const removeDefaultTranslateSelector = () => {
  document
    .querySelectorAll('#translate, .translateSelectLanguage')
    .forEach((element) => element.remove());
};

const configureTranslate = (language = preferredLanguage) => {
  preferredLanguage = isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;
  savePreferredLanguage(preferredLanguage);
  removeDefaultTranslateSelector();
  window.translate.language.setLocal(DEFAULT_LANGUAGE);
  window.translate.selectLanguageTag.show = false;
  window.translate.service.use('client.edge');
  window.translate.listener.start();
  window.translate.execute();
  window.translate.changeLanguage(preferredLanguage);
  removeDefaultTranslateSelector();
};

export const loadTranslateClient = (language = DEFAULT_LANGUAGE) =>
  new Promise((resolve, reject) => {
    preferredLanguage = isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;
    savePreferredLanguage(preferredLanguage);

    if (window.translate) {
      configureTranslate(preferredLanguage);
      resolve(window.translate);
      return;
    }

    const existingScript = document.getElementById(TRANSLATE_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        configureTranslate(preferredLanguage);
        resolve(window.translate);
      });
      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = TRANSLATE_SCRIPT_ID;
    script.src = TRANSLATE_SCRIPT_SRC;
    script.async = true;

    script.onload = () => {
      configureTranslate(preferredLanguage);
      resolve(window.translate);
    };
    script.onerror = reject;

    document.body.appendChild(script);
  });

export const changeTranslateLanguage = (language) => {
  preferredLanguage = isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;
  savePreferredLanguage(preferredLanguage);

  if (window.translate) {
    window.translate.changeLanguage(preferredLanguage);
    return;
  }

  loadTranslateClient(preferredLanguage)
    .then(() => {
      window.translate.changeLanguage(preferredLanguage);
    })
    .catch(() => {});
};

export const refreshTranslatedContent = () => {
  if (!window.translate) {
    return;
  }

  const refresh = () => {
    removeDefaultTranslateSelector();
    window.translate.execute();
    removeDefaultTranslateSelector();
  };

  if (window.requestAnimationFrame) {
    window.requestAnimationFrame(refresh);
    return;
  }

  window.setTimeout(refresh, 0);
};

export const getLanguageHelperLanguages = () => axiosClient.get('/language/languages');

export const translateLanguageHelperText = ({ sourceLanguage, targetLanguage, text }) =>
  axiosClient.post('/language/translate', {
    sourceLanguage,
    targetLanguage,
    text,
  });

export const getLanguageHelperHistory = ({ page = 1, limit = 10, search = '' } = {}) =>
  axiosClient.get('/language/history', {
    params: { page, limit, search },
  });

export const deleteLanguageHelperHistory = (id) => axiosClient.delete(`/language/history/${id}`);
