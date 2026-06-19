/**
 * Starts the API process after optional database connection setup.
 * Keeping startup logic in this file lets the Express app be imported separately
 * by automated tests without opening a listening port.
 */
const app = require('./src/app');
const connectDatabase = require('./src/config/database');
const env = require('./src/config/env');
const { createServer } = require('http');
const { setupNotificationSocket } = require('./src/modules/notifications/notification.socket');
const { startNotificationWorker } = require('./src/modules/notifications/notification.service');

// Initializes the server with database connection and all services.
const startServer = async () => {
  // Local development can still boot the API without MongoDB, but database-backed routes will fail later.
  if (env.mongoUri) {
    await connectDatabase();
  } else {
    console.warn('MONGODB_URI is not set. Server started without database connection.');
  }

  // Creates HTTP server from the Express application.
  const server = createServer(app);

  // Sets up WebSocket for real-time notification delivery.
  setupNotificationSocket(server);

  // Starts background worker for processing notification queues.
  startNotificationWorker();

  // Begins listening for incoming requests on the configured port.
  server.listen(env.port, () => {
    console.log(`Smart Travel Planner API running on port ${env.port}`);
  });
};

// Startup failures are handled once here so the process exits instead of running in a broken state.
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});