/**
 * Vite module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Default export registers the primary  value.
export default defineConfig({
  plugins: [react()],
})
