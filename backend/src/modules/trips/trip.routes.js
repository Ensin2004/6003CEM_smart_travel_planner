/**
 * Trips module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const tripController = require('./trip.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { objectIdRule, tripBodyRules, updateTripRules } = require('./trip.validation');

const router = express.Router();

// Route section connects URL patterns with validation, authentication, and controller actions.

// All trip routes require authentication
router.use(protect);

/**
 * GET /trips - Retrieve all trips for the authenticated user
 * POST /trips - Create a new trip
 */
router
  .route('/')
  .post(tripBodyRules, validate, tripController.createTrip)  // Create with validation
  .get(tripController.getMyTrips);  // Get user's trips

/**
 * GET /trips/:id/summary - Retrieve a summary of a specific trip
 * Route wires to validation, access checks, and controller logic.
 */
router.get('/:id/summary', objectIdRule, validate, tripController.getTripSummary);

/**
 * GET /trips/:id - Retrieve a specific trip
 * PUT /trips/:id - Update a trip (full update)
 * PATCH /trips/:id - Update a trip (partial update)
 * DELETE /trips/:id - Delete a trip
 */
router
  .route('/:id')
  .get(objectIdRule, validate, tripController.getTrip)  // Get with ID validation
  .put(updateTripRules, validate, tripController.updateTrip)  // Full update with validation
  .patch(updateTripRules, validate, tripController.updateTrip)  // Partial update with validation
  .delete(objectIdRule, validate, tripController.deleteTrip);  // Delete with ID validation

// Export the router for use in main application
module.exports = router;