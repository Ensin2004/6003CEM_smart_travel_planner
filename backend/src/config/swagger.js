/**
 * Swagger module.
 * Exports and local helpers keep related behavior in a single module.
 */
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Travel Planner API',
      version: '1.0.0',
      description: 'REST API for trips, weather, attractions, users, and admin tools.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [path.join(__dirname, '../modules/**/*.routes.js')],
});
const setupSwagger = (app) => {
  // Express middleware mounts  into the request pipeline.
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
module.exports = setupSwagger;
