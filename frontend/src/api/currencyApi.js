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
