/**
 * Currency module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const supportedCurrencies = [
  'USD',
  'EUR',
  'GBP',
  'MYR',
  'SGD',
  'JPY',
  'CNY',
  'KRW',
  'THB',
  'AUD',
  'CAD',
  'CHF',
  'INR',
  'IDR',
  'PHP',
  'VND',
  'ARS',
  'BRL',
  'CLP',
  'COP',
  'MXN',
];

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
