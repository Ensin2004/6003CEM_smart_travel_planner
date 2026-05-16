const express = require('express');

const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/users/user.routes');
const tripRoutes = require('../modules/trips/trip.routes');
const exploreRoutes = require('../modules/explore/explore.routes');
const adminRoutes = require('../modules/admin/admin.routes');
const apiLogRoutes = require('../modules/apiLogs/apiLog.routes');
const settingsRoutes = require('../modules/settings/settings.routes');
const feedbackRoutes = require('../modules/feedback/feedback.routes');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Smart Travel Planner API v1',
    endpoints: ['/auth', '/users', '/trips', '/explore', '/admin', '/api-logs', '/settings', '/feedback'],
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/trips', tripRoutes);
router.use('/explore', exploreRoutes);
router.use('/admin', adminRoutes);
router.use('/api-logs', apiLogRoutes);
router.use('/settings', settingsRoutes);
router.use('/feedback', feedbackRoutes);

module.exports = router;
