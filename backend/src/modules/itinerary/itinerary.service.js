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
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};
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
// Delete Item removes a record after ownership checks.
const deleteItem = async (itemId, userId) => {
  const item = await itineraryRepository.deleteItemByIdAndUserId(itemId, userId);
  if (!item) throw new AppError('Itinerary item not found', 404);
};
module.exports = {
  createItem,
  deleteItem,
  getItinerary,
  updateDay,
  updateItem,
};
