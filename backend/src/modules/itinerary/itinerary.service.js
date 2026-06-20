/**
 * Itinerary module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const AppError = require('../../utils/AppError');
const tripRepository = require('../trips/trip.repository');
const itineraryRepository = require('./itinerary.repository');

const allowedPriceEstimateSources = new Set(['manual', 'api', 'ai']);

const normalizePriceEstimate = (priceEstimate) => {
  if (!priceEstimate) return undefined;

  const source = allowedPriceEstimateSources.has(priceEstimate.source)
    ? priceEstimate.source
    : 'manual';

  return {
    amount: Number(priceEstimate.amount) || 0,
    currency: (priceEstimate.currency || 'MYR').toString().toUpperCase(),
    source,
    suggestionText: priceEstimate.suggestionText?.toString().trim().slice(0, 160) || '',
  };
};

/**
 * Add Days builds a new record from validated input.
 * Adds a specified number of days to a date.
 * 
 * @param {Date} date - Starting date
 * @param {number} days - Number of days to add
 * @returns {Date} New date with days added
 */
const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

/**
 * Returns the start of the UTC day for a given date.
 * @param {Date} date - Date to normalize
 * @returns {Date} Date at UTC midnight
 */
const startOfUtcDay = (date) => {
  const value = new Date(date);
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
};

/**
 * Calculates the number of days between two dates (inclusive).
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Number of days (minimum 1)
 */
const getInclusiveDayCount = (startDate, endDate) =>
  Math.max(1, Math.round((startOfUtcDay(endDate) - startOfUtcDay(startDate)) / 86400000) + 1);

/**
 * Retrieves a trip for a specific user.
 * Verifies the user owns the trip.
 * 
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Trip document
 * @throws {AppError} If trip not found
 */
const getTripForUser = async (tripId, userId) => {
  const trip = await tripRepository.findByIdAndUserId(tripId, userId);
  if (!trip) throw new AppError('Trip not found', 404);
  return trip;
};

/**
 * Build Default Days transforms source data into the shape required nearby.
 * Creates day objects for the entire trip duration, using saved data where available.
 * 
 * @param {Object} trip - Trip document
 * @param {Array} savedDays - Existing saved day documents
 * @returns {Array} Array of day objects with default values
 */
const buildDefaultDays = (trip, savedDays = []) => {
  const savedDayMap = new Map(savedDays.map((day) => [day.dayNumber, day]));
  const totalDays = trip.durationDays || 1;

  return Array.from({ length: totalDays }, (_, index) => {
    const dayNumber = index + 1;
    const savedDay = savedDayMap.get(dayNumber);

    // Find the destination segment for this specific day
    const destinationSegment = (trip.destinationSegments || []).find((segment) => {
      const date = addDays(trip.startDate, index);
      return new Date(segment.startDate) <= date && new Date(segment.endDate) >= date;
    }) || trip.destinationSegments?.[0];

    // Use saved day if available, otherwise create default day
    return savedDay || {
      tripId: trip._id,
      userId: trip.userId,
      dayNumber,
      date: addDays(trip.startDate, index),
      title: `Day ${dayNumber}`,
      location: {
        name: destinationSegment?.city || trip.destination || '',
        country: destinationSegment?.country || trip.country || '',
        address: [destinationSegment?.city || trip.destination, destinationSegment?.country || trip.country]
          .filter(Boolean)
          .join(', '),
        coordinates: destinationSegment?.coordinates,
      },
      notes: '',
      budget: {
        amount: 0,
        currency: trip.budget?.currency || 'MYR',
      },
    };
  });
};

/**
 * Retrieves the full itinerary for a trip.
 * Combines trip data, saved days, and items into a single response.
 * 
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Itinerary with trip, days, and items
 */
const getItinerary = async (tripId, userId) => {
  const trip = await getTripForUser(tripId, userId);
  
  // Fetch days and items in parallel for performance
  const [savedDays, items] = await Promise.all([
    itineraryRepository.findDaysByTripId(tripId, userId),
    itineraryRepository.findItemsByTripId(tripId, userId),
  ]);

  return {
    trip,
    days: buildDefaultDays(trip, savedDays),
    items,
  };
};

/**
 * Update Day applies allowed changes to an existing record.
 * Updates a specific day's metadata (date, title, location, notes, budget).
 * 
 * @param {string} tripId - Trip ID
 * @param {number} dayNumber - Day number to update
 * @param {string} userId - User ID
 * @param {Object} data - Updated day data
 * @returns {Promise<Object>} Updated day document
 * @throws {AppError} If day number is outside trip duration
 */
const updateDay = async (tripId, dayNumber, userId, data) => {
  const trip = await getTripForUser(tripId, userId);
  const numericDayNumber = Number(dayNumber);

  // Validate day number is within trip duration
  if (numericDayNumber < 1 || numericDayNumber > (trip.durationDays || 1)) {
    throw new AppError('Itinerary day is outside this trip date range.', 400);
  }

  return itineraryRepository.upsertDay(tripId, userId, numericDayNumber, {
    date: data.date || addDays(trip.startDate, numericDayNumber - 1),
    title: data.title?.trim() || `Day ${numericDayNumber}`,
    location: {
      name: data.location?.name?.trim() || '',
      country: data.location?.country?.trim() || '',
      address: data.location?.address?.trim() || '',
      coordinates: data.location?.coordinates,
    },
    notes: data.notes?.trim() || '',
    budget: {
      amount: Number(data.budget?.amount) || 0,
      currency: (data.budget?.currency || trip.budget?.currency || 'MYR').toString().toUpperCase(),
    },
  });
};

/**
 * Create Item builds a new record from validated input.
 * Adds a new item to a trip's itinerary.
 * 
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID
 * @param {Object} data - Item data
 * @returns {Promise<Object>} Created item
 */
const createItem = async (tripId, userId, data) => {
  // Verify trip exists and belongs to user
  await getTripForUser(tripId, userId);

  return itineraryRepository.createItem({
    ...data,
    priceEstimate: normalizePriceEstimate(data.priceEstimate),
    tripId,
    userId,
  });
};

/**
 * Update Item applies allowed changes to an existing record.
 * Updates an itinerary item by ID with ownership verification.
 * 
 * @param {string} itemId - Item ID
 * @param {string} userId - User ID
 * @param {Object} data - Updated item data
 * @returns {Promise<Object>} Updated item
 * @throws {AppError} If item not found
 */
const updateItem = async (itemId, userId, data) => {
  const item = await itineraryRepository.updateItemByIdAndUserId(itemId, userId, {
    ...data,
    ...(data.priceEstimate ? { priceEstimate: normalizePriceEstimate(data.priceEstimate) } : {}),
  });
  if (!item) throw new AppError('Itinerary item not found', 404);
  return item;
};

/**
 * Synchronizes the itinerary with a trip's updated date range.
 * Adjusts day dates, removes extra days, and updates item schedules.
 * 
 * @param {Object} previousTrip - Trip before update
 * @param {Object} updatedTrip - Trip after update
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const syncTripDateRange = async (previousTrip, updatedTrip, userId) => {
  const previousStart = startOfUtcDay(previousTrip.startDate);
  const updatedStart = startOfUtcDay(updatedTrip.startDate);
  const updatedDuration = getInclusiveDayCount(updatedTrip.startDate, updatedTrip.endDate);
  
  // Fetch existing days and items
  const [savedDays, items] = await Promise.all([
    itineraryRepository.findDaysByTripId(updatedTrip._id, userId),
    itineraryRepository.findItemsByTripId(updatedTrip._id, userId),
  ]);

  // Delete days beyond the new duration
  await itineraryRepository.deleteDaysAfter(updatedTrip._id, userId, updatedDuration);
  
  // Update dates for remaining days
  await Promise.all(
    savedDays
      .filter((day) => day.dayNumber <= updatedDuration)
      .map((day) =>
        itineraryRepository.updateDayDate(
          updatedTrip._id,
          userId,
          day.dayNumber,
          addDays(updatedStart, day.dayNumber - 1)
        )
      )
  );

  // Update or delete items based on new date range
  const itemUpdates = [];
  const itemIdsToDelete = [];
  
  items.forEach((item) => {
    if (!item.scheduledDate) return;
    
    const previousDayOffset = Math.round(
      (startOfUtcDay(item.scheduledDate) - previousStart) / 86400000
    );
    
    // Delete items that fall outside the new date range
    if (previousDayOffset < 0 || previousDayOffset >= updatedDuration) {
      itemIdsToDelete.push(item._id);
      return;
    }
    
    // Update item scheduled date to new date range
    itemUpdates.push(
      itineraryRepository.updateItemScheduledDate(
        item._id,
        userId,
        addDays(updatedStart, previousDayOffset)
      )
    );
  });

  // Execute all updates and deletions in parallel
  await Promise.all([
    itineraryRepository.deleteItemsByIds(itemIdsToDelete, userId),
    ...itemUpdates,
  ]);
};

/**
 * Delete Item removes a record after ownership checks.
 * Deletes an item by ID with ownership verification.
 * 
 * @param {string} itemId - Item ID to delete
 * @param {string} userId - User ID for ownership verification
 * @returns {Promise<void>}
 * @throws {AppError} If item not found
 */
const deleteItem = async (itemId, userId) => {
  const item = await itineraryRepository.deleteItemByIdAndUserId(itemId, userId);
  if (!item) throw new AppError('Itinerary item not found', 404);
};

module.exports = {
  createItem,
  deleteItem,
  getItinerary,
  syncTripDateRange,
  updateDay,
  updateItem,
};
