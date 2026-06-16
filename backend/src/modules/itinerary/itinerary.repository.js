/**
 * Itinerary module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const ItineraryDay = require('./itineraryDay.model');
const ItineraryItem = require('./itineraryItem.model');

/**
 * Retrieves all days for a specific trip, sorted by day number.
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID for ownership verification
 * @returns {Promise<Array>} Array of day documents sorted by dayNumber
 */
const findDaysByTripId = (tripId, userId) =>
  ItineraryDay.find({ tripId, userId }).sort({ dayNumber: 1 });

/**
 * Updates or creates a day for a specific trip and user.
 * Uses upsert to handle both create and update in one operation.
 * 
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID
 * @param {number} dayNumber - Day number to upsert
 * @param {Object} data - Day data to save
 * @returns {Promise<Object>} Updated or created day document
 */
const upsertDay = (tripId, userId, dayNumber, data) =>
  ItineraryDay.findOneAndUpdate(
    { tripId, userId, dayNumber },
    { ...data, tripId, userId, dayNumber },
    { 
      new: true, // Return the updated document
      upsert: true, // Create if it doesn't exist
      runValidators: true, // Apply schema validation
      setDefaultsOnInsert: true // Apply default values on insert
    }
  );

/**
 * Retrieves all items for a specific trip, sorted by scheduled date, start time, and creation time.
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID for ownership verification
 * @returns {Promise<Array>} Array of item documents sorted appropriately
 */
const findItemsByTripId = (tripId, userId) =>
  ItineraryItem.find({ tripId, userId }).sort({ scheduledDate: 1, startTime: 1, createdAt: 1 });

/**
 * Deletes all days after a specific day number for a trip.
 * Used when reducing the number of days in an itinerary.
 * 
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID for ownership verification
 * @param {number} lastDayNumber - Keep days up to this number, delete the rest
 * @returns {Promise<Object>} Delete operation result
 */
const deleteDaysAfter = (tripId, userId, lastDayNumber) =>
  ItineraryDay.deleteMany({ tripId, userId, dayNumber: { $gt: lastDayNumber } });

/**
 * Updates the date for a specific day in a trip.
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID for ownership verification
 * @param {number} dayNumber - Day number to update
 * @param {Date} date - New date for the day
 * @returns {Promise<Object>} Update operation result
 */
const updateDayDate = (tripId, userId, dayNumber, date) =>
  ItineraryDay.updateOne({ tripId, userId, dayNumber }, { $set: { date } });

/**
 * Deletes multiple items by IDs with ownership verification.
 * @param {Array<string>} itemIds - Array of item IDs to delete
 * @param {string} userId - User ID for ownership verification
 * @returns {Promise<Object>} Delete operation result or resolved promise
 */
const deleteItemsByIds = (itemIds, userId) =>
  itemIds.length ? ItineraryItem.deleteMany({ _id: { $in: itemIds }, userId }) : Promise.resolve();

/**
 * Updates the scheduled date for a specific item.
 * @param {string} itemId - Item ID to update
 * @param {string} userId - User ID for ownership verification
 * @param {Date} scheduledDate - New scheduled date
 * @returns {Promise<Object>} Update operation result
 */
const updateItemScheduledDate = (itemId, userId, scheduledDate) =>
  ItineraryItem.updateOne({ _id: itemId, userId }, { $set: { scheduledDate } });

/**
 * Create Item builds a new record from validated input.
 * Creates a new itinerary item.
 * 
 * @param {Object} data - Item data to create
 * @returns {Promise<Object>} Created item document
 */
const createItem = (data) => ItineraryItem.create(data);

/**
 * Update Item By Id And User Id applies allowed changes to an existing record.
 * Updates an item only if it belongs to the specified user.
 * 
 * @param {string} id - Item ID to update
 * @param {string} userId - User ID for ownership verification
 * @param {Object} data - Updated item data
 * @returns {Promise<Object>} Updated item document
 */
const updateItemByIdAndUserId = (id, userId, data) =>
  ItineraryItem.findOneAndUpdate({ _id: id, userId }, data, {
    returnDocument: 'after', // Return the updated document
    runValidators: true, // Apply schema validation
  });

/**
 * Delete Item By Id And User Id removes a record after ownership checks.
 * Deletes an item only if it belongs to the specified user.
 * 
 * @param {string} id - Item ID to delete
 * @param {string} userId - User ID for ownership verification
 * @returns {Promise<Object>} Deleted item document or null
 */
const deleteItemByIdAndUserId = (id, userId) => ItineraryItem.findOneAndDelete({ _id: id, userId });

module.exports = {
  createItem,
  deleteDaysAfter,
  deleteItemByIdAndUserId,
  deleteItemsByIds,
  findDaysByTripId,
  findItemsByTripId,
  updateDayDate,
  updateItemScheduledDate,
  updateItemByIdAndUserId,
  upsertDay,
};