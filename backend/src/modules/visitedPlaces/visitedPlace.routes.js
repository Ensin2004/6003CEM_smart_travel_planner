/**
 * Visited places module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const visitedPlaceController = require('./visitedPlace.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const {
  calendarRules,
  markVisitedPlaceRules,
  visitedPlaceIdRule,
} = require('./visitedPlace.validation');

const router = express.Router();

// All routes require authentication.
router.use(protect);

// Retrieves all visited places for the authenticated user.
router.get('/', visitedPlaceController.listVisitedPlaces);

// Fetches calendar data for visited places with date range filtering.
router.get('/calendar', calendarRules, validate, visitedPlaceController.getVisitedCalendar);

// Triggers image enrichment for all visited places.
router.post('/enrich-images', visitedPlaceController.enrichVisitedPlaceImages);

// Creates a new visited place record with validation rules.
router.post('/', markVisitedPlaceRules, validate, visitedPlaceController.markVisitedPlace);

// Deletes a specific visited place by ID with route parameter validation.
router.delete('/:id', visitedPlaceIdRule, validate, visitedPlaceController.removeVisitedPlace);

// Exports the configured router for use in the main application.
module.exports = router;