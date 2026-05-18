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

  if (payload.preferences && !payload.travelPreferences) {
    payload.travelPreferences = payload.preferences;
    delete payload.preferences;
  }

  return payload;
};

const createTrip = (userId, data) => tripRepository.create({ ...normalizeTripPayload(data), userId });

const getMyTrips = (userId) => tripRepository.findByUserId(userId);

const getTripById = async (tripId, userId) => {
  const trip = await tripRepository.findByIdAndUserId(tripId, userId);
  if (!trip) throw new AppError('Trip not found', 404);
  return trip;
};

const updateTrip = async (tripId, userId, data) => {
  const trip = await tripRepository.updateByIdAndUserId(tripId, userId, normalizeTripPayload(data));
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
    exploreService.getWeatherByDestination(trip.destination),
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
