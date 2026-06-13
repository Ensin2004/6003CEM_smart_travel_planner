/**
 * Itinerary module.
 * Route definitions connect endpoints with validation, authorization, and controllers.
 */
const express = require('express');
const itineraryController = require('./itinerary.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const {
  createItemRules,
  dayRules,
  itemIdRule,
  tripIdRule,
  updateItemRules,
} = require('./itinerary.validation');

const router = express.Router();

// Route section connects URL patterns with validation, authentication, and controller actions.
router.use(protect);
//  route wires  to validation, access checks, and controller logic.
router.get('/trips/:tripId', tripIdRule, validate, itineraryController.getItinerary);
//  route wires  to validation, access checks, and controller logic.
router.patch('/trips/:tripId/days/:dayNumber', dayRules, validate, itineraryController.updateDay);
//  route wires  to validation, access checks, and controller logic.
router.post('/trips/:tripId/items', createItemRules, validate, itineraryController.createItem);
//  route wires  to validation, access checks, and controller logic.
router.patch('/items/:itemId', updateItemRules, validate, itineraryController.updateItem);
//  route wires  to validation, access checks, and controller logic.
router.delete('/items/:itemId', itemIdRule, validate, itineraryController.deleteItem);
module.exports = router;
