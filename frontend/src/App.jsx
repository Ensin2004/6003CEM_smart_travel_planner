import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './app/routes';
import { AuthProvider } from './context/AuthProvider';
import { CurrencyProvider } from './context/CurrencyProvider';
import './styles/index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CurrencyProvider>
          <AppRoutes />
        </CurrencyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
