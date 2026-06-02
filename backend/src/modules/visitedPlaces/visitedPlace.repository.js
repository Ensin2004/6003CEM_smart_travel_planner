/**
 * Visited places module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const VisitedPlace = require('./visitedPlace.model');

const findByUserId = (userId) => VisitedPlace.find({ userId }).sort({ updatedAt: -1 });

const findBetweenDates = (userId, startDate, endDate) =>
  VisitedPlace.find({
    userId,
    'visits.visitedDate': { $gte: startDate, $lte: endDate },
  }).sort({ title: 1 });

const addVisitByUserAndPlaceKey = (userId, placeKey, placeData, visitEntry) =>
  VisitedPlace.findOneAndUpdate(
    { userId, placeKey },
    {
      $set: { ...placeData, userId, placeKey },
      $push: { visits: visitEntry },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

const deleteByIdAndUserId = (id, userId) => VisitedPlace.findOneAndDelete({ _id: id, userId });

module.exports = {
  deleteByIdAndUserId,
  findBetweenDates,
  findByUserId,
  addVisitByUserAndPlaceKey,
};
