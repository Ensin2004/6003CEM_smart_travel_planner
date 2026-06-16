/**
 * Google Maps price parsing behavior.
 */
const { getPriceDetail } = require('../src/modules/explore/googleMaps.service');

describe('Google Maps price details', () => {
  test('labels an ambiguous Malaysian dollar price as MYR', () => {
    expect(getPriceDetail('$63', {
      country: 'Malaysia',
      address: 'Gombak, Selangor, Malaysia',
    })).toEqual(expect.objectContaining({
      display: 'RM 63',
      currency: 'MYR',
      amount: 63,
    }));
  });

  test('keeps explicit USD prices unchanged', () => {
    expect(getPriceDetail('US$ 63', {
      country: 'Malaysia',
    })).toEqual(expect.objectContaining({
      display: 'US$ 63',
      currency: 'USD',
      amount: 63,
    }));
  });

  test('keeps price tiers unchanged', () => {
    expect(getPriceDetail('$$', {
      country: 'Malaysia',
    })).toEqual(expect.objectContaining({
      display: '$$',
      isTier: true,
    }));
  });
});
