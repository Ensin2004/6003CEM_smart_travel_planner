/**
 * Compare hook.
 * Components use this hook to access the shared compare basket.
 */
import { useContext } from 'react';
import CompareContext from '../context/CompareProvider';

// Retrieves the compare context value for managing comparison items across components
const useCompare = () => useContext(CompareContext);

export default useCompare;