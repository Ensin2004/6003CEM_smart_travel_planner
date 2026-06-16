/**
 * App module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './app/routes';
import { AuthProvider } from './context/AuthProvider';
import { CompareProvider } from './context/CompareProvider';
import { CurrencyProvider } from './context/CurrencyProvider';
import { NotificationProvider } from './context/NotificationProvider';
import './styles/index.css';

// App renders the main screen and handles nearby interactions.
function App() {
  return (
    // Provides client-side routing capabilities for the entire application
    <BrowserRouter>
      {/* Manages authentication state and session across the application */}
      <AuthProvider>
        {/* Handles real-time notifications and alerts throughout the app */}
        <NotificationProvider>
          {/* Provides currency conversion and exchange rate functionality globally */}
          <CurrencyProvider>
            {/* Manages comparison state for items across different contexts */}
            <CompareProvider>
              {/* Defines the main route configuration and page rendering */}
              <AppRoutes />
            </CompareProvider>
          </CurrencyProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Default export registers the primary value.
export default App;
