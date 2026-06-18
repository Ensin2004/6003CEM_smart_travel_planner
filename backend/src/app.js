/**
 * Builds the Express application shared by the HTTP server and tests.
 * Middleware order matters here because request parsing, authentication limits,
 * API documentation, routes, and error handling all depend on this sequence.
 */
const express = require('express');
const cors = require('cors');

const corsOptions = require('./config/cors');
const securityHeaders = require('./config/security');
const setupSwagger = require('./config/swagger');
const v1Routes = require('./routes/v1.routes');
const notFound = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');
const requestContext = require('./middleware/requestContext.middleware');
const { authRateLimit } = require('./middleware/rateLimit.middleware');

const app = express();

// Helmet and CORS run before routes so every response receives the same browser-facing protections.
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(requestContext);

// Large JSON payloads are allowed for travel tools that may submit generated document content.
app.use(express.json({ limit: '1400mb' }));

// Authentication routes receive a tighter limiter before joining the main versioned router.
app.use('/api/v1/auth', authRateLimit);

setupSwagger(app);

// Root route for Render/browser testing.
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Smart Travel Planner API is running',
    health: '/health',
    apiBase: '/api/v1',
  });
});

// Health check stays outside the versioned router so uptime monitors can call a simple endpoint.
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Smart Travel Planner API is healthy',
  });
});

app.use('/api/v1', v1Routes);

// The not-found handler must run after all valid routes have had a chance to match.
app.use(notFound);

// Final error middleware centralizes response formatting for controller and middleware failures.
app.use(errorHandler);

module.exports = app;
