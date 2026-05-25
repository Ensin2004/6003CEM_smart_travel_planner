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

router.use(protect);

router.get('/trips/:tripId', tripIdRule, validate, itineraryController.getItinerary);
router.patch('/trips/:tripId/days/:dayNumber', dayRules, validate, itineraryController.updateDay);
router.post('/trips/:tripId/items', createItemRules, validate, itineraryController.createItem);
router.patch('/items/:itemId', updateItemRules, validate, itineraryController.updateItem);
router.delete('/items/:itemId', itemIdRule, validate, itineraryController.deleteItem);

module.exports = router;
