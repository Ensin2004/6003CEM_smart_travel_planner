import { useContext } from 'react';
import NotificationContext from '../context/NotificationProvider';

const useNotifications = () => useContext(NotificationContext);

export default useNotifications;
