/**
 * Currency Provider module.
 * Provider state exposes shared values and actions to nested React screens.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { convertCurrency, getCurrencies } from '../api/currencyApi';
import CurrencyContext from './currencyContext';

const DEFAULT_CURRENCY = 'USD';
const getSavedCurrency = () => localStorage.getItem('preferredCurrency') || DEFAULT_CURRENCY;

export function CurrencyProvider({ children }) {
  const [selectedCurrency, setSelectedCurrency] = useState(getSavedCurrency);
  const [currencies, setCurrencies] = useState([]);
  const [isCurrencyListLoading, setIsCurrencyListLoading] = useState(true);
  const [rates, setRates] = useState({ USD: { rate: 1, date: null, cached: true } });
  const [errorMessage, setErrorMessage] = useState('');
  useEffect(() => {
    getCurrencies()
      .then((response) => {
        const nextCurrencies = response.data?.data?.currencies;

        if (Array.isArray(nextCurrencies) && nextCurrencies.length) {
          setCurrencies(nextCurrencies);
        }
      })
      .catch(() => {
        setErrorMessage('Currency list temporarily unavailable.');
      })
      .finally(() => {
        setIsCurrencyListLoading(false);
      });
  }, []);

  const changeCurrency = useCallback((currencyCode) => {
    setSelectedCurrency(currencyCode);
    setErrorMessage('');
    localStorage.setItem('preferredCurrency', currencyCode);
  }, []);
  useEffect(() => {
    const hasAccessToken = Boolean(localStorage.getItem('accessToken'));
    if (selectedCurrency === DEFAULT_CURRENCY || rates[selectedCurrency] || !hasAccessToken) {
      return;
    }

    let isActive = true;

    convertCurrency({ amount: 1, from: DEFAULT_CURRENCY, to: selectedCurrency })
      .then((response) => {
        const conversion = response.data?.data?.conversion;
        if (!isActive || !conversion?.rate) {
          return;
        }

        setRates((currentRates) => ({
          ...currentRates,
          [selectedCurrency]: {
            rate: conversion.rate,
            date: conversion.date,
            cached: conversion.cached,
          },
        }));
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setErrorMessage(error.response?.data?.message || 'Currency conversion temporarily unavailable.');
      })
    // Cleanup prevents state updates after component unmount.
    return () => {
      isActive = false;
    };
  }, [rates, selectedCurrency]);
  const formatAmount = useCallback(
    (amount, sourceCurrency = DEFAULT_CURRENCY) => {
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount)) {
        return '';
      }
      if (sourceCurrency !== DEFAULT_CURRENCY || selectedCurrency === sourceCurrency) {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: sourceCurrency,
          maximumFractionDigits: 2,
        }).format(numericAmount);
      }

      const rate = rates[selectedCurrency]?.rate;
      if (!rate) {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: sourceCurrency,
          maximumFractionDigits: 2,
        }).format(numericAmount);
      }

      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: selectedCurrency,
        maximumFractionDigits: 2,
      }).format(numericAmount * rate);
    },
    [rates, selectedCurrency]
  );
  const value = useMemo(
    () => ({
      currencies,
      selectedCurrency,
      activeCurrency: currencies.find((currency) => currency.code === selectedCurrency) || currencies[0],
      changeCurrency,
      formatAmount,
      errorMessage,
      isCurrencyListLoading,
      baseCurrency: DEFAULT_CURRENCY,
      rateDate: rates[selectedCurrency]?.date,
    }),
    [changeCurrency, currencies, errorMessage, formatAmount, isCurrencyListLoading, rates, selectedCurrency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
