/**
 * Swagger module.
 * Exports and local helpers keep related behavior in a single module.
 */
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Generate OpenAPI specification from JSDoc comments in route files
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0', // OpenAPI specification version
    info: {
      title: 'Smart Travel Planner API',
      version: '1.0.0',
      description: 'REST API for trips, weather, attractions, users, and admin tools.',
    },
    servers: [{ url: '/api/v1' }], // Base path for all API endpoints
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http', // HTTP authentication
          scheme: 'bearer', // Bearer token scheme
          bearerFormat: 'JWT', // JWT format for bearer tokens
        },
      },
    },
  },
  // Path to route files containing JSDoc annotations for API documentation
  apis: [path.join(__dirname, '../modules/**/*.routes.js')],
});

/**
 * Sets up Swagger UI documentation endpoint for the Express application.
 * Mounts the Swagger UI middleware to serve interactive API documentation.
 * 
 * @param {Object} app - Express application instance
 * @returns {void}
 */
const setupSwagger = (app) => {
  // Express middleware mounts Swagger UI into the request pipeline.
  // Provides interactive API documentation at /api-docs endpoint
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = setupSwagger;