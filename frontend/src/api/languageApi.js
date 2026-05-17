const TRANSLATE_SCRIPT_ID = 'translate-js-client';
const TRANSLATE_SCRIPT_SRC = 'https://cdn.staticfile.net/translate.js/3.18.66/translate.js';

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
  aymara: 'Aymar aru',
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
  igbo: 'Igbo',
  icelandic: 'Íslenska',
  hebrew: 'עברית',
  georgian: 'ქართული',
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
  sanskrit: 'संस्कृतम्',
  sindhi: 'سنڌي',
  singapore: 'සිංහල',
  slovak: 'Slovenčina',
  slovene: 'Slovenščina',
  samoan: 'Gagana Samoa',
  shona: 'Shona',
  somali: 'Somali',
  albanian: 'Shqip',
  swedish: 'Svenska',
  swahili: 'Swahili',
  tamil: 'தமிழ்',
  telugu: 'తెలుగు',
  tajik: 'Тоҷикӣ',
  turkmen: 'Türkmençe',
  filipino: 'Filipino',
  ukrainian: 'Українська',
  urdu: 'اردو',
  yoruba: 'Yorùbá',
  javanese: 'Basa Jawa',
  scottish_gaelic: 'Gàidhlig',
  ewe: 'Eʋegbe',
  bambara: 'Bambara',
  haitian_creole: 'Kreyòl Ayisyen',
  serbian: 'Српски',
  afrikaans_xhosa: 'isiXhosa',
  south_african_zulu: 'isiZulu',
  uzbek: 'Oʻzbekcha',
  kazakh: 'Қазақша',
  malagasy: 'Malagasy',
  mongolian: 'Монгол',
  tetum: 'Tetum',
  bashkir: 'Башҡортса',
  bislama: 'Bislama',
  breton: 'Brezhoneg',
  faroese: 'Føroyskt',
  montenegrin: 'Crnogorski',
  marshallese: 'Kajin M̧ajeļ',
  mauritian_creole: 'Kreol Morisien',
  papiamento: 'Papiamento',
  tagalog: 'Tagalog',
  venda: 'Tshivenḓa',
  wolof: 'Wolof',
  aceh: 'Bahsa Acèh',
  cantonese: '粵語',
  niuean: 'Ko e Vagahau Niuē',
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
  aymara: 'bo',
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
  igbo: 'ng',
  icelandic: 'is',
  hebrew: 'il',
  georgian: 'ge',
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
  sanskrit: 'in',
  sindhi: 'pk',
  singapore: 'lk',
  slovak: 'sk',
  slovene: 'si',
  samoan: 'ws',
  shona: 'zw',
  somali: 'so',
  albanian: 'al',
  swedish: 'se',
  swahili: 'tz',
  tamil: 'in',
  telugu: 'in',
  tajik: 'tj',
  turkmen: 'tm',
  filipino: 'ph',
  tagalog: 'ph',
  ukrainian: 'ua',
  urdu: 'pk',
  yoruba: 'ng',
  javanese: 'id',
  scottish_gaelic: 'gb-sct',
  ewe: 'gh',
  bambara: 'ml',
  haitian_creole: 'ht',
  serbian: 'rs',
  afrikaans_xhosa: 'za',
  south_african_zulu: 'za',
  uzbek: 'uz',
  kazakh: 'kz',
  malagasy: 'mg',
  mongolian: 'mn',
  tetum: 'tl',
  bashkir: 'ru',
  bislama: 'vu',
  breton: 'fr',
  faroese: 'fo',
  montenegrin: 'me',
  marshallese: 'mh',
  mauritian_creole: 'mu',
  papiamento: 'cw',
  venda: 'za',
  wolof: 'sn',
  aceh: 'id',
  cantonese: 'hk',
  niuean: 'nu',
  tongan: 'to',
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
  preferredLanguage = language;
  removeDefaultTranslateSelector();
  window.translate.language.setLocal(preferredLanguage);
  window.translate.selectLanguageTag.show = false;
  window.translate.service.use('client.edge');
  window.translate.listener.start();
  window.translate.execute();
  removeDefaultTranslateSelector();
};

export const loadTranslateClient = (language = DEFAULT_LANGUAGE) =>
  new Promise((resolve, reject) => {
    preferredLanguage = language;

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
  preferredLanguage = language;

  if (window.translate) {
    window.translate.changeLanguage(language);
    return;
  }

  loadTranslateClient(language)
    .then(() => {
      window.translate.changeLanguage(language);
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
