const app = require('./src/app');
const connectDatabase = require('./src/config/database');
const env = require('./src/config/env');

const startServer = async () => {
  if (env.mongoUri) {
    await connectDatabase();
  } else {
    console.warn('MONGODB_URI is not set. Server started without database connection.');
  }

  app.listen(env.port, () => {
    console.log(`Smart Travel Planner API running on port ${env.port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
