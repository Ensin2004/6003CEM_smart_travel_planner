const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const corsOptions = require('./config/cors');
const setupSwagger = require('./config/swagger');
const v1Routes = require('./routes/v1.routes');
const notFound = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));

app.use(
  '/api/v1/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'fail',
      message: 'Too many authentication requests. Please try again later.',
    },
  })
);

setupSwagger(app);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Smart Travel Planner API is healthy',
  });
});

app.use('/api/v1', v1Routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
