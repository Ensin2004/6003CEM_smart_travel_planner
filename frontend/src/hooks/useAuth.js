/**
 * Use Auth module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { useContext } from 'react';
import AuthContext from '../context/authContext';

// Returns the authentication context value for accessing auth state and methods
export default function useAuth() {
  return useContext(AuthContext);
}
