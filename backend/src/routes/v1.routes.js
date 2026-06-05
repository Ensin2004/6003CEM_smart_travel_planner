/**
 * V1 module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');

const authRoutes = require('../modules/auth/auth.routes');
const aiAssistantRoutes = require('../modules/aiAssistant/aiAssistant.routes');
const userRoutes = require('../modules/users/user.routes');
const tripRoutes = require('../modules/trips/trip.routes');
const notificationRoutes = require('../modules/notifications/notification.routes');
const exploreRoutes = require('../modules/explore/explore.routes');
const adminRoutes = require('../modules/admin/admin.routes');
const apiLogRoutes = require('../modules/apiLogs/apiLog.routes');
const settingsRoutes = require('../modules/settings/settings.routes');
const feedbackRoutes = require('../modules/feedback/feedback.routes');
const favoriteRoutes = require('../modules/favorites/favorite.routes');
const travelToolsRoutes = require('../modules/travelTools/travelTools.routes');
const travelGuideRoutes = require('../modules/travelGuide/travelGuide.routes');
const currencyRoutes = require('../modules/currency/currency.routes');
const mapRoutes = require('../modules/map/map.routes');
const itineraryRoutes = require('../modules/itinerary/itinerary.routes');
const languageRoutes = require('../modules/language/language.routes');
const transportationRoutes = require('../modules/transportation/transportation.routes');
const visitedPlaceRoutes = require('../modules/visitedPlaces/visitedPlace.routes');
const comparisonRoutes = require('../modules/comparison/comparison.routes');

const router = express.Router();
//  route wires  to validation, access checks, and controller logic.
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Smart Travel Planner API v1',
    endpoints: [
      '/auth',
      '/ai',
      '/users',
      '/trips',
      '/packing-lists',
      '/notifications',
      '/travel-guide',
      '/explore',
      '/admin',
      '/api-logs',
      '/settings',
      '/feedback',
      '/favorites',
      '/currency',
      '/language',
      '/map',
      '/itinerary',
      '/transportation',
      '/visited-places',
      '/comparison',
    ],
  });
});

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/auth', authRoutes);
router.use('/ai', aiAssistantRoutes);
router.use('/users', userRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/trips', tripRoutes);

router.use('/notifications', notificationRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/packing-lists', travelToolsRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/travel-tools', travelToolsRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/travel-guide', travelGuideRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/explore', exploreRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/admin', adminRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/api-logs', apiLogRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/settings', settingsRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/feedback', feedbackRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/favorites', favoriteRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/currency', currencyRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/language', languageRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/map', mapRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/itinerary', itineraryRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/transportation', transportationRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/visited-places', visitedPlaceRoutes);

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use('/comparison', comparisonRoutes);
module.exports = router;
