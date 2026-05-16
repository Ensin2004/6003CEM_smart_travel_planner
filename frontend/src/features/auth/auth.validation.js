import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js/min';

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });

const getCountryFlag = (countryCode) =>
  countryCode
    .toUpperCase()
    .replace(/./g, (character) => String.fromCodePoint(127397 + character.charCodeAt()));

const getCountryName = (countryCode) => countryNames.of(countryCode) || countryCode;

export const countryCallingCodes = getCountries()
  .map((countryCode) => ({
    country: getCountryName(countryCode),
    countryCode,
    code: `+${getCountryCallingCode(countryCode)}`,
    flag: getCountryFlag(countryCode),
    flagUrl: `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`,
  }))
  .sort((firstCountry, secondCountry) => firstCountry.country.localeCompare(secondCountry.country));

export const formatInternationalPhoneNumber = (countryCode, phoneNumber) => {
  const parsedPhoneNumber = parsePhoneNumberFromString(phoneNumber, countryCode);

  return parsedPhoneNumber?.number || '';
};

export const validatePhoneNumber = (countryCode, phoneNumber) => {
  const parsedPhoneNumber = parsePhoneNumberFromString(phoneNumber, countryCode);

  return Boolean(parsedPhoneNumber?.isValid());
};

export const passwordRequirements = [
  {
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    label: 'At least one uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: 'At least one lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    label: 'At least one number',
    test: (password) => /\d/.test(password),
  },
  {
    label: 'At least one symbol',
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];
