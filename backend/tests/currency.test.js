/**
 * Currency module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// Import axios for mocking HTTP requests and the currency service for testing
const axios = require('axios');
const currencyService = require('../src/modules/currency/currency.service');

// Mock axios to prevent actual API calls during tests
jest.mock('axios');

// Test group covers currency service functionality including supported currencies,
// conversion with external rates, caching behavior, and edge cases.
describe('Currency service', () => {
  // Setup prepares shared data before assertions - reset all mock state.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Scenario verifies that supported currencies list is returned for selector dropdown.
  test('returns supported currencies for the selector', () => {
    // Execute supported currencies retrieval
    const currencies = currencyService.getSupportedCurrencies();

    // Verify USD (US Dollar) is in the supported list
    expect(currencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'USD', label: 'US Dollar' }),
        expect.objectContaining({ code: 'MYR', label: 'Malaysian Ringgit' }),
      ])
    );
  });

  // Scenario verifies that currency conversion uses Frankfurter API rates correctly.
  test('converts amounts with Frankfurter rates', async () => {
    // Mock axios GET to return Frankfurter API response with USD to MYR rate
    axios.get.mockResolvedValueOnce({
      data: {
        base: 'USD',
        date: '2026-05-18',
        rates: {
          MYR: 4.72,  // 1 USD = 4.72 MYR
        },
      },
    });

    // Execute conversion of 100 USD to MYR
    const conversion = await currencyService.convertCurrency({
      amount: 100,
      from: 'USD',
      to: 'MYR',
    });

    // Verify converted amount is correct (100 * 4.72 = 472)
    expect(conversion.convertedAmount).toBe(472);
    // Verify exchange rate is correctly captured
    expect(conversion.rate).toBe(4.72);
    // Verify conversion is marked as available
    expect(conversion.available).toBe(true);
  });

  // Scenario verifies that conversion short-circuits when currencies are identical.
  test('does not call Frankfurter when currencies match', async () => {
    // Execute conversion with same source and target currency
    const conversion = await currencyService.convertCurrency({
      amount: 125,
      from: 'USD',
      to: 'USD',  // Same currency - no API call needed
    });

    // Verify converted amount equals original amount
    expect(conversion.convertedAmount).toBe(125);
    // Verify rate is 1 (no conversion needed)
    expect(conversion.rate).toBe(1);
    // Verify axios.get was never called (conversion bypassed external API)
    expect(axios.get).not.toHaveBeenCalled();
  });

  // Scenario verifies that exchange rates are cached and reused across requests.
  test('reuses a cached exchange rate without calling Frankfurter again', async () => {
    // Mock axios GET to return Frankfurter API response with EUR to SGD rate
    axios.get.mockResolvedValueOnce({
      data: {
        base: 'EUR',
        date: '2026-06-13',
        rates: {
          SGD: 1.46,  // 1 EUR = 1.46 SGD
        },
      },
    });

    // First conversion - should fetch fresh rate from API
    const first = await currencyService.convertCurrency({
      amount: 10,
      from: 'EUR',
      to: 'SGD',
    });
    
    // Second conversion with same currency pair - should use cached rate
    const second = await currencyService.convertCurrency({
      amount: 20,
      from: 'EUR',
      to: 'SGD',
    });

    // Verify first conversion was not from cache
    expect(first.cached).toBe(false);
    // Verify second conversion came from cache (no API call)
    expect(second.cached).toBe(true);
    // Verify second conversion calculates correctly (20 * 1.46 = 29.2)
    expect(second.convertedAmount).toBe(29.2);
    // Verify only one API call was made (first request only)
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});