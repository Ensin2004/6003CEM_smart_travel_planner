/**
 * Currency Context module.
 * Context export gives React components a stable shared state entry.
 */
import { createContext } from 'react';

const CurrencyContext = createContext(null);
// Default export registers the primary  value.
export default CurrencyContext;
