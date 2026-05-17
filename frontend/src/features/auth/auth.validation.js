import { getCountries } from 'libphonenumber-js/min';

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });

const getCountryFlag = (countryCode) =>
  countryCode
    .toUpperCase()
    .replace(/./g, (character) => String.fromCodePoint(127397 + character.charCodeAt()));

const getCountryName = (countryCode) => countryNames.of(countryCode) || countryCode;

export const maxNameLength = 80;
export const maxPasswordLength = 64;

export const countries = getCountries()
  .map((countryCode) => ({
    country: getCountryName(countryCode),
    countryCode,
    flag: getCountryFlag(countryCode),
    flagUrl: `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`,
  }))
  .sort((firstCountry, secondCountry) => firstCountry.country.localeCompare(secondCountry.country));

export const passwordRequirements = [
  {
    label: '8 to 64 characters',
    test: (password) => password.length >= 8 && password.length <= maxPasswordLength,
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

export const genderOptions = [
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
  { label: 'Non-binary', value: 'non-binary' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
];

export const ageGroupOptions = [
  { label: 'Under 18', value: 'under-18' },
  { label: '18-24', value: '18-24' },
  { label: '25-34', value: '25-34' },
  { label: '35-44', value: '35-44' },
  { label: '45-54', value: '45-54' },
  { label: '55+', value: '55+' },
];
