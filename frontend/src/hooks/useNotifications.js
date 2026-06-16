import { useContext } from 'react';
import NotificationContext from '../context/NotificationProvider';

// Retrieves the notification context value for managing alerts and messages
const useNotifications = () => useContext(NotificationContext);

export default useNotifications;
