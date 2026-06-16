/**
 * Visited places module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const VisitedPlace = require('./visitedPlace.model');

// Retrieves all visited places for a user, sorted by most recent update.
const findByUserId = (userId) => VisitedPlace.find({ userId }).sort({ updatedAt: -1 });

// Finds visited places within a specific date range for calendar queries.
const findBetweenDates = (userId, startDate, endDate) =>
  VisitedPlace.find({
    userId,
    'visits.visitedDate': { $gte: startDate, $lte: endDate },
  }).sort({ title: 1 });

// Adds a new visit entry to an existing place or creates a new place record.
const addVisitByUserAndPlaceKey = (userId, placeKey, placeData, visitEntry) =>
  VisitedPlace.findOneAndUpdate(
    { userId, placeKey },
    {
      $set: { ...placeData, userId, placeKey },
      $push: { visits: visitEntry },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

// Deletes a visited place record by ID, ensuring it belongs to the specified user.
const deleteByIdAndUserId = (id, userId) => VisitedPlace.findOneAndDelete({ _id: id, userId });

// Updates image URLs for a specific visited place record.
const updateImagesByIdAndUserId = (id, userId, imageUrl, imageUrls) =>
  VisitedPlace.findOneAndUpdate(
    { _id: id, userId },
    { $set: { imageUrl, imageUrls } },
    { new: true, runValidators: true }
  );

// Exports all persistence functions for use by the service layer.
module.exports = {
  deleteByIdAndUserId,
  findBetweenDates,
  findByUserId,
  addVisitByUserAndPlaceKey,
  updateImagesByIdAndUserId,
};