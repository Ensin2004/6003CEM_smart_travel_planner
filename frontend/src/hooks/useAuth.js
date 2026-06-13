/**
 * Use Auth module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { useContext } from 'react';
import AuthContext from '../context/authContext';
// Default export registers the primary  value.
export default function useAuth() {
  return useContext(AuthContext);
}
