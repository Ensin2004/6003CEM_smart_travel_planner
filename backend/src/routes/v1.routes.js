const express = require('express');

const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/users/user.routes');
const tripRoutes = require('../modules/trips/trip.routes');
const exploreRoutes = require('../modules/explore/explore.routes');
const adminRoutes = require('../modules/admin/admin.routes');
const apiLogRoutes = require('../modules/apiLogs/apiLog.routes');
const settingsRoutes = require('../modules/settings/settings.routes');
const feedbackRoutes = require('../modules/feedback/feedback.routes');
const travelToolsRoutes = require('../modules/travelTools/travelTools.routes');
const travelGuideRoutes = require('../modules/travelGuide/travelGuide.routes');
const currencyRoutes = require('../modules/currency/currency.routes');
const mapRoutes = require('../modules/map/map.routes');
const itineraryRoutes = require('../modules/itinerary/itinerary.routes');
const languageRoutes = require('../modules/language/language.routes');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Smart Travel Planner API v1',
    endpoints: [
      '/auth',
      '/users',
      '/trips',
      '/packing-lists',
      '/travel-guide',
      '/explore',
      '/admin',
      '/api-logs',
      '/settings',
      '/feedback',
      '/currency',
      '/language',
      '/map',
      '/itinerary',
    ],
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/trips', tripRoutes);
router.use('/packing-lists', travelToolsRoutes);
router.use('/travel-tools', travelToolsRoutes);
router.use('/travel-guide', travelGuideRoutes);
router.use('/explore', exploreRoutes);
router.use('/admin', adminRoutes);
router.use('/api-logs', apiLogRoutes);
router.use('/settings', settingsRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/currency', currencyRoutes);
router.use('/language', languageRoutes);
router.use('/map', mapRoutes);
router.use('/itinerary', itineraryRoutes);

module.exports = router;
