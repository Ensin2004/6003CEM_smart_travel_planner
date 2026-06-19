/**
 * Currency Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

// Retrieves the list of supported currencies and their exchange information
export const getCurrencies = () => axiosClient.get('/currency');

// Converts an amount from one currency to another using the current exchange rate
export const convertCurrency = ({ amount, from, to }) =>
  axiosClient.get('/currency/convert', {
    params: {
      amount,
      from,
      to,
    },
  });
  