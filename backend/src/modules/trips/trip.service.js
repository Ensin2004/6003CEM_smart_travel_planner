const AppError = require('../../utils/AppError');
const tripRepository = require('./trip.repository');
const exploreService = require('../explore/explore.service');

const normalizeTripPayload = (data = {}) => {
  const payload = { ...data };

  if (typeof payload.budget === 'number' || typeof payload.budget === 'string') {
    payload.budget = {
      totalAmount: Number(payload.budget) || 0,
    };
  }

  if (payload.budget && typeof payload.budget === 'object') {
    payload.budget = {
      ...payload.budget,
      totalAmount: Number(payload.budget.totalAmount) || 0,
      dailyLimit: Number(payload.budget.dailyLimit) || 0,
      currency: (payload.budget.currency || 'MYR').toString().trim().toUpperCase(),
    };
  }

  if (payload.preferences && !payload.travelPreferences) {
    payload.travelPreferences = payload.preferences;
    delete payload.preferences;
  }

  if (Array.isArray(payload.destinationSegments)) {
    payload.destinationSegments = payload.destinationSegments
      .filter((segment) => segment?.city?.trim())
      .map((segment, index) => ({
        ...segment,
        city: segment.city.trim(),
        country: segment.country?.trim(),
        placeName: segment.placeName?.trim(),
        startDate: segment.startDate || payload.startDate,
        endDate: segment.endDate || payload.endDate,
        order: Number(segment.order) || index + 1,
      }));
  }

  const firstSegment = payload.destinationSegments?.[0];
  if (!payload.destination && firstSegment?.city) payload.destination = firstSegment.city;
  if (!payload.country && firstSegment?.country) payload.country = firstSegment.country;

  return payload;
};

const validateTripPayload = (payload) => {
  if (!payload.destination && !payload.destinationSegments?.length) {
    throw new AppError('Add at least one trip destination.', 400);
  }

  if (new Date(payload.endDate) < new Date(payload.startDate)) {
    throw new AppError('End date cannot be before start date.', 400);
  }

  payload.destinationSegments?.forEach((segment) => {
    if (new Date(segment.endDate) < new Date(segment.startDate)) {
      throw new AppError('Destination end date cannot be before its start date.', 400);
    }
  });
};

const createTrip = (userId, data) => {
  const payload = normalizeTripPayload(data);
  validateTripPayload(payload);
  return tripRepository.create({ ...payload, userId });
};

const getMyTrips = (userId) => tripRepository.findByUserId(userId);

const getTripById = async (tripId, userId) => {
  const trip = await tripRepository.findByIdAndUserId(tripId, userId);
  if (!trip) throw new AppError('Trip not found', 404);
  return trip;
};

const updateTrip = async (tripId, userId, data) => {
  const payload = normalizeTripPayload(data);
  if (payload.startDate && payload.endDate) validateTripPayload(payload);
  const trip = await tripRepository.updateByIdAndUserId(tripId, userId, payload);
  if (!trip) throw new AppError('Trip not found', 404);
  return trip;
};

const deleteTrip = async (tripId, userId) => {
  const trip = await tripRepository.deleteByIdAndUserId(tripId, userId);
  if (!trip) throw new AppError('Trip not found', 404);
};

const getTripSummary = async (tripId, userId) => {
  const trip = await getTripById(tripId, userId);
  const [weather, attractions] = await Promise.all([
    exploreService.getWeatherByDestination(trip.destination, trip.startDate?.toISOString().slice(0, 10)),
    exploreService.getAttractionsByDestination(trip.destination),
  ]);

  return { trip, weather, attractions };
};

module.exports = {
  createTrip,
  getMyTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  getTripSummary,
  normalizeTripPayload,
};
