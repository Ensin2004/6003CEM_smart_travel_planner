/**
 * Currency Amount module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { useContext } from 'react';
import CurrencyContext from '../../context/currencyContext';
// CurrencyAmount renders the main screen and handles nearby interactions.
function CurrencyAmount({ amount, sourceCurrency = 'USD' }) {
  const currency = useContext(CurrencyContext);
  const formattedAmount = currency?.formatAmount(amount, sourceCurrency);

  return <>{formattedAmount || `${sourceCurrency} ${amount}`}</>;
}
// Default export registers the primary  value.
export default CurrencyAmount;
