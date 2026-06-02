/**
 * Currency Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';
export const getCurrencies = () => axiosClient.get('/currency');
export const convertCurrency = ({ amount, from, to }) =>
  axiosClient.get('/currency/convert', {
    params: {
      amount,
      from,
      to,
    },
  });
