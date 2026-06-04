/**
 * Centralizes environment variables and development defaults.
 * Keeping defaults here avoids repeated fallback logic across services,
 * controllers, and external API clients.
 */
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || '',

  // Comma-separated DNS override supports MongoDB connections on restricted networks.
  mongoDnsServers: (process.env.MONGODB_DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean),

  jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30m',
  refreshJwtSecret:
    process.env.REFRESH_JWT_SECRET || 'development-only-refresh-secret-change-me',
  refreshJwtExpiresIn: process.env.REFRESH_JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173',
  emailVerificationExpiresInHours: Number(process.env.EMAIL_VERIFICATION_EXPIRES_IN_HOURS || 24),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || 'Smart Travel Planner <no-reply@smarttravelplanner.local>',

  // External API keys remain empty by default so services can decide when to use fallbacks.
  placesApiKey: process.env.PLACES_API_KEY || '',
  geoapifyApiKey: process.env.GEOAPIFY_API_KEY || process.env.GEOAPIFY_KEY || '',
  foursquareApiKey: process.env.FOURSQUARE_API_KEY || '',
  serpApiKey: process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY || '',
  airlabsApiKey: process.env.AIRLABS_API_KEY || '',
  transportApiAppId: process.env.TRANSPORTAPI_APP_ID || process.env.TAPI_APP_ID || '',
  transportApiAppKey: process.env.TRANSPORTAPI_APP_KEY || process.env.TAPI_APP_KEY || '',
  serpApiDailyLimit: Number(process.env.SERPAPI_DAILY_LIMIT || 100),
  airlabsDailyLimit: Number(process.env.AIRLABS_DAILY_LIMIT || 100),
  openMeteoDailyLimit: Number(process.env.OPEN_METEO_DAILY_LIMIT || 500),

  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
  geminiDailyLimit: Number(process.env.GEMINI_DAILY_LIMIT || 100),

  libreTranslateBaseUrl: process.env.LIBRETRANSLATE_BASE_URL || 'http://127.0.0.1:5001',
  libreTranslateApiKey: process.env.LIBRETRANSLATE_API_KEY || '',
  libreTranslateDailyLimit: Number(process.env.LIBRETRANSLATE_DAILY_LIMIT || 100),
};
