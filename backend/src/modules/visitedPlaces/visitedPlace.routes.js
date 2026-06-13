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

router.use(protect);
router.get('/', visitedPlaceController.listVisitedPlaces);
router.get('/calendar', calendarRules, validate, visitedPlaceController.getVisitedCalendar);
router.post('/', markVisitedPlaceRules, validate, visitedPlaceController.markVisitedPlace);
router.delete('/:id', visitedPlaceIdRule, validate, visitedPlaceController.removeVisitedPlace);

module.exports = router;
