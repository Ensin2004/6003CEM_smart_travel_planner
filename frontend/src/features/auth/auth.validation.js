/**
 * Auth module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
import { getCountries } from 'libphonenumber-js/min';

// Creates a display name formatter for country names in English
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });

// Converts a country code to its corresponding emoji flag
const getCountryFlag = (countryCode) =>
  countryCode
    .toUpperCase()
    .replace(/./g, (character) => String.fromCodePoint(127397 + character.charCodeAt()));

// Retrieves the full country name from a country code
const getCountryName = (countryCode) => countryNames.of(countryCode) || countryCode;

// Maximum allowed length for user names
export const maxNameLength = 80;

// Maximum allowed length for passwords
export const maxPasswordLength = 64;

// Generates a sorted list of countries with flags and display names
export const countries = getCountries()
  .map((countryCode) => ({
    country: getCountryName(countryCode),
    countryCode,
    flag: getCountryFlag(countryCode),
    flagUrl: `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`,
  }))
  .sort((firstCountry, secondCountry) => firstCountry.country.localeCompare(secondCountry.country));

// Defines password validation requirements with test functions
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

// Available gender selection options
export const genderOptions = [
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
  { label: 'Non-binary', value: 'non-binary' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
];

// Available age group selection options
export const ageGroupOptions = [
  { label: 'Under 18', value: 'under-18' },
  { label: '18-24', value: '18-24' },
  { label: '25-34', value: '25-34' },
  { label: '35-44', value: '35-44' },
  { label: '45-54', value: '45-54' },
  { label: '55+', value: '55+' },
];
