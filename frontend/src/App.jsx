/**
 * App module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './app/routes';
import { AuthProvider } from './context/AuthProvider';
import { CompareProvider } from './context/CompareProvider';
import { CurrencyProvider } from './context/CurrencyProvider';
import './styles/index.css';
// App renders the main screen and handles nearby interactions.
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CurrencyProvider>
          <CompareProvider>
            <AppRoutes />
          </CompareProvider>
        </CurrencyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
// Default export registers the primary  value.
export default App;
