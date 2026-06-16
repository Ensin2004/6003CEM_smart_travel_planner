/**
 * Auth Context module.
 * Context export gives React components a stable shared state entry.
 */
import { createContext } from 'react';

// Creates a context object for authentication state with null default value
const AuthContext = createContext(null);

// Default export registers the primary value.
export default AuthContext;
