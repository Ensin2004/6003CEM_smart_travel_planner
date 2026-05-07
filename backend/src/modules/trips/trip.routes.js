const express = require('express');
const tripController = require('./trip.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { objectIdRule, tripBodyRules, updateTripRules } = require('./trip.validation');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(tripBodyRules, validate, tripController.createTrip)
  .get(tripController.getMyTrips);

router.get('/:id/summary', objectIdRule, validate, tripController.getTripSummary);

router
  .route('/:id')
  .get(objectIdRule, validate, tripController.getTrip)
  .put(updateTripRules, validate, tripController.updateTrip)
  .delete(objectIdRule, validate, tripController.deleteTrip);

module.exports = router;
