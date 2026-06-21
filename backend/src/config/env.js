/**
 * Centralizes environment variables and development defaults.
 * Keeping defaults here avoids repeated fallback logic across services,
 * controllers, and external API clients.
 */
const path = require('path');
const { DEFAULT_ROTATION_DAYS, resolveRotatedApiKey } = require('../utils/apiKeyRotation');

// Load environment variables from the .env file located in the project root
// The path is resolved relative to the current module's location
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const apiKeyRotationDays = Number(process.env.API_KEY_ROTATION_DAYS || DEFAULT_ROTATION_DAYS);
const apiKeyRotationWarnings = [];

const getRotatedApiKey = (keyName, key, rotatedAt) =>
  resolveRotatedApiKey({
    key,
    keyName,
    nodeEnv,
    rotatedAt,
    rotationDays: apiKeyRotationDays,
    warnings: apiKeyRotationWarnings,
  });

const env = {
  // Application environment: development, test, or production
  nodeEnv,
  
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
  apiKeyRotationDays,
  apiKeyRotationWarnings,
  placesApiKey: getRotatedApiKey('PLACES_API_KEY', process.env.PLACES_API_KEY || '', process.env.PLACES_API_KEY_ROTATED_AT),
  geoapifyApiKey: getRotatedApiKey(
    'GEOAPIFY_API_KEY',
    process.env.GEOAPIFY_API_KEY || process.env.GEOAPIFY_KEY || '',
    process.env.GEOAPIFY_API_KEY_ROTATED_AT || process.env.GEOAPIFY_KEY_ROTATED_AT
  ),
  openRouteServiceApiKey: getRotatedApiKey(
    'OPENROUTESERVICE_API_KEY',
    process.env.OPENROUTESERVICE_API_KEY || process.env.ORS_API_KEY || '',
    process.env.OPENROUTESERVICE_API_KEY_ROTATED_AT || process.env.ORS_API_KEY_ROTATED_AT
  ),
  foursquareApiKey: getRotatedApiKey('FOURSQUARE_API_KEY', process.env.FOURSQUARE_API_KEY || '', process.env.FOURSQUARE_API_KEY_ROTATED_AT),
  restCountriesApiKey: getRotatedApiKey('REST_COUNTRIES_API_KEY', process.env.REST_COUNTRIES_API_KEY || '', process.env.REST_COUNTRIES_API_KEY_ROTATED_AT),
  
  // Search and data aggregation APIs
  serpApiKey: getRotatedApiKey(
    'SERPAPI_KEY',
    process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY || '',
    process.env.SERPAPI_KEY_ROTATED_AT || process.env.SERPAPI_API_KEY_ROTATED_AT
  ),
  airlabsApiKey: getRotatedApiKey('AIRLABS_API_KEY', process.env.AIRLABS_API_KEY || '', process.env.AIRLABS_API_KEY_ROTATED_AT),
  
  // Transportation APIs
  transportApiAppId: process.env.TRANSPORTAPI_APP_ID || process.env.TAPI_APP_ID || '',
  transportApiAppKey: getRotatedApiKey(
    'TRANSPORTAPI_APP_KEY',
    process.env.TRANSPORTAPI_APP_KEY || process.env.TAPI_APP_KEY || '',
    process.env.TRANSPORTAPI_APP_KEY_ROTATED_AT || process.env.TAPI_APP_KEY_ROTATED_AT
  ),
  
  // Daily rate limits for external API usage - prevents quota exhaustion
  serpApiDailyLimit: Number(process.env.SERPAPI_DAILY_LIMIT || 500),
  airlabsDailyLimit: Number(process.env.AIRLABS_DAILY_LIMIT || 100),
  openMeteoDailyLimit: Number(process.env.OPEN_METEO_DAILY_LIMIT || 500),

  // AI and LLM API configurations
  geminiApiKey: getRotatedApiKey('GEMINI_API_KEY', process.env.GEMINI_API_KEY || '', process.env.GEMINI_API_KEY_ROTATED_AT),
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
  geminiDailyLimit: Number(process.env.GEMINI_DAILY_LIMIT || 100),
  
  groqApiKey: getRotatedApiKey('GROQ_API_KEY', process.env.GROQ_API_KEY || '', process.env.GROQ_API_KEY_ROTATED_AT),
  groqModel: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
  groqDailyLimit: Number(process.env.GROQ_DAILY_LIMIT || 100),

  // Translation service configuration with self-hosted option
  libreTranslateBaseUrl: process.env.LIBRETRANSLATE_BASE_URL || 'http://127.0.0.1:5001',
  libreTranslateApiKey: getRotatedApiKey(
    'LIBRETRANSLATE_API_KEY',
    process.env.LIBRETRANSLATE_API_KEY || '',
    process.env.LIBRETRANSLATE_API_KEY_ROTATED_AT
  ),
  libreTranslateDailyLimit: Number(process.env.LIBRETRANSLATE_DAILY_LIMIT || 100),
};

if (apiKeyRotationWarnings.length && nodeEnv !== 'test') {
  apiKeyRotationWarnings.forEach((warning) => {
    console.warn(`[api-key-rotation] ${warning}`);
  });
}

module.exports = env;
