/**
 * Centralizes environment variables and development defaults.
 * Keeping defaults here avoids repeated fallback logic across services,
 * controllers, and external API clients.
 */
const path = require('path');

// Load environment variables from the .env file located in the project root
// The path is resolved relative to the current module's location
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  // Application environment: development, test, or production
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // HTTP server port for the application to listen on
  port: process.env.PORT || 5000,
  
  // MongoDB connection URI - must be provided in production environments
  mongoUri: process.env.MONGODB_URI || '',

  // Comma-separated DNS override supports MongoDB connections on restricted networks.
  // Parses custom DNS servers from environment variable into an array of server addresses
  mongoDnsServers: (process.env.MONGODB_DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean),

  // JWT configuration for authentication tokens
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30m',
  
  // Refresh token configuration for obtaining new access tokens
  refreshJwtSecret:
    process.env.REFRESH_JWT_SECRET || 'development-only-refresh-secret-change-me',
  refreshJwtExpiresIn: process.env.REFRESH_JWT_EXPIRES_IN || '7d',
  
  // Allowed client origins for CORS - supports multiple comma-separated origins
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173',
  
  // Email verification token expiration duration in hours
  emailVerificationExpiresInHours: Number(process.env.EMAIL_VERIFICATION_EXPIRES_IN_HOURS || 24),

  // Transactional email configuration. Resend is preferred when configured;
  // SMTP remains available for local development and fallback environments.
  resendApiKey: process.env.RESEND_API_KEY || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true', // Use TLS/SSL if explicitly set to 'true'
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || 'Smart Travel Planner <no-reply@smarttravelplanner.local>',

  // External API keys remain empty by default so services can decide when to use fallbacks.
  // Each service handles its own fallback logic when API keys are not provided
  
  // Location and places APIs
  placesApiKey: process.env.PLACES_API_KEY || '',
  geoapifyApiKey: process.env.GEOAPIFY_API_KEY || process.env.GEOAPIFY_KEY || '',
  openRouteServiceApiKey: process.env.OPENROUTESERVICE_API_KEY || process.env.ORS_API_KEY || '',
  foursquareApiKey: process.env.FOURSQUARE_API_KEY || '',
  restCountriesApiKey: process.env.REST_COUNTRIES_API_KEY || '',
  
  // Search and data aggregation APIs
  serpApiKey: process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY || '',
  airlabsApiKey: process.env.AIRLABS_API_KEY || '',
  
  // Transportation APIs
  transportApiAppId: process.env.TRANSPORTAPI_APP_ID || process.env.TAPI_APP_ID || '',
  transportApiAppKey: process.env.TRANSPORTAPI_APP_KEY || process.env.TAPI_APP_KEY || '',
  
  // Daily rate limits for external API usage - prevents quota exhaustion
  serpApiDailyLimit: Number(process.env.SERPAPI_DAILY_LIMIT || 100),
  airlabsDailyLimit: Number(process.env.AIRLABS_DAILY_LIMIT || 100),
  openMeteoDailyLimit: Number(process.env.OPEN_METEO_DAILY_LIMIT || 500),

  // AI and LLM API configurations
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
  geminiDailyLimit: Number(process.env.GEMINI_DAILY_LIMIT || 100),
  
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
  groqDailyLimit: Number(process.env.GROQ_DAILY_LIMIT || 100),

  // Translation service configuration with self-hosted option
  libreTranslateBaseUrl: process.env.LIBRETRANSLATE_BASE_URL || 'http://127.0.0.1:5001',
  libreTranslateApiKey: process.env.LIBRETRANSLATE_API_KEY || '',
  libreTranslateDailyLimit: Number(process.env.LIBRETRANSLATE_DAILY_LIMIT || 100),
};
