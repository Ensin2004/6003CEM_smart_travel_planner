require('dotenv').config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || '',
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
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY || '',
  placesApiKey: process.env.PLACES_API_KEY || '',
};
