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

const createItem = (data) => ItineraryItem.create(data);

const updateItemByIdAndUserId = (id, userId, data) =>
  ItineraryItem.findOneAndUpdate({ _id: id, userId }, data, {
    returnDocument: 'after',
    runValidators: true,
  });

const deleteItemByIdAndUserId = (id, userId) => ItineraryItem.findOneAndDelete({ _id: id, userId });

module.exports = {
  createItem,
  deleteItemByIdAndUserId,
  findDaysByTripId,
  findItemsByTripId,
  updateItemByIdAndUserId,
  upsertDay,
};
