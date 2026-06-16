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
// Apply authentication to all itinerary routes
router.use(protect);

/**
 * GET /trips/:tripId - Retrieves the full itinerary for a trip.
 * Returns all days and items organized by day.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. tripIdRule - URL parameter validation (MongoDB ObjectId)
 * 2. validate - Validation result processing
 * 3. itineraryController.getItinerary - Route handler
 */
router.get('/trips/:tripId', tripIdRule, validate, itineraryController.getItinerary);

/**
 * PATCH /trips/:tripId/days/:dayNumber - Updates a specific day's metadata.
 * Updates title, date, or notes for a day in the itinerary.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. dayRules - URL parameter validation (tripId and dayNumber)
 * 2. validate - Validation result processing
 * 3. itineraryController.updateDay - Route handler
 */
router.patch('/trips/:tripId/days/:dayNumber', dayRules, validate, itineraryController.updateDay);

/**
 * POST /trips/:tripId/items - Adds a new item to a trip's itinerary.
 * Creates a place, activity, restaurant, or hotel entry for a specific day.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. createItemRules - Request body validation
 * 2. validate - Validation result processing
 * 3. itineraryController.createItem - Route handler
 */
router.post('/trips/:tripId/items', createItemRules, validate, itineraryController.createItem);

/**
 * PATCH /items/:itemId - Updates an existing itinerary item.
 * Modifies name, time, notes, or scheduled date for an item.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. updateItemRules - URL parameter and request body validation
 * 2. validate - Validation result processing
 * 3. itineraryController.updateItem - Route handler
 */
router.patch('/items/:itemId', updateItemRules, validate, itineraryController.updateItem);

/**
 * DELETE /items/:itemId - Removes an item from the itinerary.
 * Deletes the item after verifying the user owns the trip.
 * 
 * route wires endpoint to validation, access checks, and controller logic.
 * Middleware chain:
 * 1. itemIdRule - URL parameter validation (MongoDB ObjectId)
 * 2. validate - Validation result processing
 * 3. itineraryController.deleteItem - Route handler
 */
router.delete('/items/:itemId', itemIdRule, validate, itineraryController.deleteItem);

module.exports = router;