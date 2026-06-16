/**
 * Currency module.
 * Schema fields define stored document structure, defaults, and indexes.
 */

/**
 * List of supported currency codes for the application.
 * Used for currency selection in trip budgets and expense tracking.
 * Includes major global currencies and regional currencies for common travel destinations.
 */
const supportedCurrencies = [
  'USD', // United States Dollar
  'EUR', // Euro
  'GBP', // British Pound
  'MYR', // Malaysian Ringgit
  'SGD', // Singapore Dollar
  'JPY', // Japanese Yen
  'CNY', // Chinese Yuan
  'KRW', // South Korean Won
  'THB', // Thai Baht
  'AUD', // Australian Dollar
  'CAD', // Canadian Dollar
  'CHF', // Swiss Franc
  'INR', // Indian Rupee
  'IDR', // Indonesian Rupiah
  'PHP', // Philippine Peso
  'VND', // Vietnamese Dong
  'ARS', // Argentine Peso
  'BRL', // Brazilian Real
  'CLP', // Chilean Peso
  'COP', // Colombian Peso
  'MXN', // Mexican Peso
];

/**
 * Human-readable currency labels mapped by currency code.
 * Provides display names for currency selection dropdowns and UI components.
 */
const currencyLabels = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  MYR: 'Malaysian Ringgit',
  SGD: 'Singapore Dollar',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
  KRW: 'South Korean Won',
  THB: 'Thai Baht',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc',
  INR: 'Indian Rupee',
  IDR: 'Indonesian Rupiah',
  PHP: 'Philippine Peso',
  VND: 'Vietnamese Dong',
  ARS: 'Argentine Peso',
  BRL: 'Brazilian Real',
  CLP: 'Chilean Peso',
  COP: 'Colombian Peso',
  MXN: 'Mexican Peso',
};

module.exports = { supportedCurrencies, currencyLabels };