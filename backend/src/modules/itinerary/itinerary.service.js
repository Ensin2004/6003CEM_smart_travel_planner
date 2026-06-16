/**
 * Itinerary module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const AppError = require('../../utils/AppError');
const tripRepository = require('../trips/trip.repository');
const itineraryRepository = require('./itinerary.repository');
// Add Days builds a new record from validated input.
const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};
const startOfUtcDay = (date) => {
  const value = new Date(date);
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
};
const getInclusiveDayCount = (startDate, endDate) =>
  Math.max(1, Math.round((startOfUtcDay(endDate) - startOfUtcDay(startDate)) / 86400000) + 1);
const getTripForUser = async (tripId, userId) => {
  const trip = await tripRepository.findByIdAndUserId(tripId, userId);
  if (!trip) throw new AppError('Trip not found', 404);
  return trip;
};
// Build Default Days transforms source data into the shape required nearby.
const buildDefaultDays = (trip, savedDays = []) => {
  const savedDayMap = new Map(savedDays.map((day) => [day.dayNumber, day]));
  const totalDays = trip.durationDays || 1;

  return Array.from({ length: totalDays }, (_, index) => {
    const dayNumber = index + 1;
    const savedDay = savedDayMap.get(dayNumber);

    const destinationSegment = (trip.destinationSegments || []).find((segment) => {
      const date = addDays(trip.startDate, index);
      return new Date(segment.startDate) <= date && new Date(segment.endDate) >= date;
    }) || trip.destinationSegments?.[0];

    return savedDay || {
      tripId: trip._id,
      userId: trip.userId,
      dayNumber,
      date: addDays(trip.startDate, index),
      title: `Day ${dayNumber}`,
      location: {
        name: destinationSegment?.city || trip.destination || '',
        country: destinationSegment?.country || trip.country || '',
        address: [destinationSegment?.city || trip.destination, destinationSegment?.country || trip.country].filter(Boolean).join(', '),
        coordinates: destinationSegment?.coordinates,
      },
      notes: '',
      budget: {
        amount: trip.budget?.dailyLimit || 0,
        currency: trip.budget?.currency || 'MYR',
      },
    };
  });
};
const getItinerary = async (tripId, userId) => {
  const trip = await getTripForUser(tripId, userId);
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
// Update Day applies allowed changes to an existing record.
const updateDay = async (tripId, dayNumber, userId, data) => {
  const trip = await getTripForUser(tripId, userId);
  const numericDayNumber = Number(dayNumber);

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
// Create Item builds a new record from validated input.
const createItem = async (tripId, userId, data) => {
  await getTripForUser(tripId, userId);

  return itineraryRepository.createItem({
    ...data,
    tripId,
    userId,
    priceEstimate: data.priceEstimate
      ? {
        amount: Number(data.priceEstimate.amount) || 0,
        currency: (data.priceEstimate.currency || 'MYR').toString().toUpperCase(),
      }
      : undefined,
  });
};
// Update Item applies allowed changes to an existing record.
const updateItem = async (itemId, userId, data) => {
  const item = await itineraryRepository.updateItemByIdAndUserId(itemId, userId, data);
  if (!item) throw new AppError('Itinerary item not found', 404);
  return item;
};
const syncTripDateRange = async (previousTrip, updatedTrip, userId) => {
  const previousStart = startOfUtcDay(previousTrip.startDate);
  const updatedStart = startOfUtcDay(updatedTrip.startDate);
  const updatedDuration = getInclusiveDayCount(updatedTrip.startDate, updatedTrip.endDate);
  const [savedDays, items] = await Promise.all([
    itineraryRepository.findDaysByTripId(updatedTrip._id, userId),
    itineraryRepository.findItemsByTripId(updatedTrip._id, userId),
  ]);

  await itineraryRepository.deleteDaysAfter(updatedTrip._id, userId, updatedDuration);
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

  const itemUpdates = [];
  const itemIdsToDelete = [];
  items.forEach((item) => {
    if (!item.scheduledDate) return;
    const previousDayOffset = Math.round(
      (startOfUtcDay(item.scheduledDate) - previousStart) / 86400000
    );
    if (previousDayOffset < 0 || previousDayOffset >= updatedDuration) {
      itemIdsToDelete.push(item._id);
      return;
    }
    itemUpdates.push(
      itineraryRepository.updateItemScheduledDate(
        item._id,
        userId,
        addDays(updatedStart, previousDayOffset)
      )
    );
  });

  await Promise.all([
    itineraryRepository.deleteItemsByIds(itemIdsToDelete, userId),
    ...itemUpdates,
  ]);
};
// Delete Item removes a record after ownership checks.
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
