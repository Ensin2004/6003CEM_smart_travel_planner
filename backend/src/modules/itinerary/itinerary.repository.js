/**
 * Itinerary module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const ItineraryDay = require('./itineraryDay.model');
const ItineraryItem = require('./itineraryItem.model');
const findDaysByTripId = (tripId, userId) =>
  ItineraryDay.find({ tripId, userId }).sort({ dayNumber: 1 });
const upsertDay = (tripId, userId, dayNumber, data) =>
  ItineraryDay.findOneAndUpdate(
    { tripId, userId, dayNumber },
    { ...data, tripId, userId, dayNumber },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
const findItemsByTripId = (tripId, userId) =>
  ItineraryItem.find({ tripId, userId }).sort({ scheduledDate: 1, startTime: 1, createdAt: 1 });
// Create Item builds a new record from validated input.
const createItem = (data) => ItineraryItem.create(data);
// Update Item By Id And User Id applies allowed changes to an existing record.
const updateItemByIdAndUserId = (id, userId, data) =>
  ItineraryItem.findOneAndUpdate({ _id: id, userId }, data, {
    returnDocument: 'after',
    runValidators: true,
  });
// Delete Item By Id And User Id removes a record after ownership checks.
const deleteItemByIdAndUserId = (id, userId) => ItineraryItem.findOneAndDelete({ _id: id, userId });
module.exports = {
  createItem,
  deleteItemByIdAndUserId,
  findDaysByTripId,
  findItemsByTripId,
  updateItemByIdAndUserId,
  upsertDay,
};
