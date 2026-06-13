/**
 * Currency module.
 * Assertions cover expected behavior, error handling, and response shape.
 */
const axios = require('axios');
const currencyService = require('../src/modules/currency/currency.service');

jest.mock('axios');
// Test group covers  behavior.
describe('Currency service', () => {
  // Setup prepares shared data before assertions.
  beforeEach(() => {
    jest.clearAllMocks();
  });
  // Scenario verifies one expected outcome or error path.
  test('returns supported currencies for the selector', () => {
    const currencies = currencyService.getSupportedCurrencies();

    expect(currencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'USD', label: 'US Dollar' }),
        expect.objectContaining({ code: 'MYR', label: 'Malaysian Ringgit' }),
      ])
    );
  });
  // Scenario verifies one expected outcome or error path.
  test('converts amounts with Frankfurter rates', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        base: 'USD',
        date: '2026-05-18',
        rates: {
          MYR: 4.72,
        },
      },
    });

    const conversion = await currencyService.convertCurrency({
      amount: 100,
      from: 'USD',
      to: 'MYR',
    });

    expect(conversion.convertedAmount).toBe(472);
    expect(conversion.rate).toBe(4.72);
    expect(conversion.available).toBe(true);
  });
  // Scenario verifies one expected outcome or error path.
  test('does not call Frankfurter when currencies match', async () => {
    const conversion = await currencyService.convertCurrency({
      amount: 125,
      from: 'USD',
      to: 'USD',
    });

    expect(conversion.convertedAmount).toBe(125);
    expect(conversion.rate).toBe(1);
    expect(axios.get).not.toHaveBeenCalled();
  });
});
