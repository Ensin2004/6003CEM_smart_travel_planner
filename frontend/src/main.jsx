/**
 * Main module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Initializes the React application by mounting the root component in the DOM
createRoot(document.getElementById('root')).render(
  // Enables React's strict mode for additional development checks and warnings
  <StrictMode>
    <App />
  </StrictMode>,
)
