/**
 * Auth Context module.
 * Context export gives React components a stable shared state entry.
 */
import { createContext } from 'react';

const AuthContext = createContext(null);
// Default export registers the primary  value.
export default AuthContext;
