/**
 * Compare hook.
 * Components use this hook to access the shared compare basket.
 */
import { useContext } from 'react';
import CompareContext from '../context/CompareProvider';

const useCompare = () => useContext(CompareContext);

export default useCompare;
