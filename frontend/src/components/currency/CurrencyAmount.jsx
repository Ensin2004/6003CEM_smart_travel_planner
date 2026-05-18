import { useContext } from 'react';
import CurrencyContext from '../../context/currencyContext';

function CurrencyAmount({ amount, sourceCurrency = 'USD' }) {
  const currency = useContext(CurrencyContext);
  const formattedAmount = currency?.formatAmount(amount, sourceCurrency);

  return <>{formattedAmount || `${sourceCurrency} ${amount}`}</>;
}

export default CurrencyAmount;
