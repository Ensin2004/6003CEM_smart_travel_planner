/**
 * Contains the business rules for creating and maintaining trips.
 * The service keeps controller code small while ensuring every create or update
 * uses the same destination, budget, and date normalization rules.
 */
const AppError = require('../../utils/AppError');
const tripRepository = require('./trip.repository');
const exploreService = require('../explore/explore.service');
const notificationService = require('../notifications/notification.service');

// Request bodies can arrive from manual trip forms, AI-assisted forms, or older payload shapes.
// This mapper folds those variants into the schema shape expected by the repository.
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

  // Older clients may still send preferences; the model now stores the same values as travelPreferences.
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

  // The first destination segment becomes the trip summary destination when no top-level value exists.
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

const getWeatherGuidance = (weather) => {
  if (!weather?.available) {
    return {
      available: false,
      mode: 'default',
      headline: 'Default place ideas',
      packingTips: ['Weather advice appears for today or future trip dates.'],
      placeTips: ['Start with attractions, food, hotels, and transport options.'],
      recommendedCategories: ['attractions', 'food', 'hotels', 'train'],
      message: weather?.message === 'Choose today or a future travel date.'
        ? 'Weather advice appears for today or future trip dates.'
        : weather?.message || 'Weather guidance is unavailable.',
    };
  }

  const condition = String(weather.condition || '').toLowerCase();
  const precipitation = weather.precipitation || {};
  const temperature = weather.temperature || {};
  const rainLikely =
    condition.includes('rain') ||
    condition.includes('drizzle') ||
    condition.includes('thunder') ||
    Number(precipitation.amountMm || 0) >= 2 ||
    Number(precipitation.probability || 0) >= 50;
  const verySunny = condition.includes('clear') || condition.includes('sun');
  const hotDay = Number(temperature.max || temperature.mean || 0) >= 30;
  const coldDay = Number(temperature.min || temperature.mean || 99) <= 10;

  if (rainLikely) {
    return {
      available: true,
      mode: 'rainy',
      headline: 'Rain-friendly plan',
      packingTips: ['Bring an umbrella or raincoat.', 'Use waterproof shoes or sandals.', 'Keep electronics and documents in a dry pouch.'],
      placeTips: ['Choose indoor places such as museums, malls, cafes, and hotels.', 'Keep outdoor attractions flexible in case rain becomes heavy.'],
      recommendedCategories: ['shopping', 'food', 'hotels', 'attractions'],
    };
  }

  if (hotDay || verySunny) {
    return {
      available: true,
      mode: 'sunny',
      headline: hotDay ? 'Hot sunny plan' : 'Sunny-day plan',
      packingTips: ['Bring sunscreen, sunglasses, and a refillable water bottle.', 'Use a cap or light outer layer for shade.', 'Plan water breaks between outdoor stops.'],
      placeTips: ['Mix outdoor attractions with cold or air-conditioned places.', 'Use malls, cafes, museums, and shaded attractions during the hottest hours.'],
      recommendedCategories: ['shopping', 'food', 'attractions', 'hotels'],
    };
  }

  if (coldDay) {
    return {
      available: true,
      mode: 'cold',
      headline: 'Cold-weather plan',
      packingTips: ['Bring a warm jacket and extra layers.', 'Keep hands warm during outdoor transfers.'],
      placeTips: ['Choose warm indoor places and reduce long outdoor walks.'],
      recommendedCategories: ['food', 'shopping', 'hotels', 'attractions'],
    };
  }

  return {
    available: true,
    mode: 'comfortable',
    headline: 'Comfortable weather plan',
    packingTips: ['Pack normal day-trip essentials and comfortable walking shoes.'],
    placeTips: ['Outdoor attractions and food stops should fit well today.'],
    recommendedCategories: ['attractions', 'food', 'shopping', 'train'],
  };
};

const createTrip = async (userId, data) => {
  const payload = normalizeTripPayload(data);
  validateTripPayload(payload);
  const trip = await tripRepository.create({ ...payload, userId });
  await notificationService.scheduleTripReminder(trip);
  return trip;
};

const getMyTrips = (userId) => tripRepository.findByUserId(userId);

const getTripById = async (tripId, userId) => {
  const trip = await tripRepository.findByIdAndUserId(tripId, userId);
  if (!trip) throw new AppError('Trip not found', 404);
  return trip;
};

const updateTrip = async (tripId, userId, data) => {
  const payload = normalizeTripPayload(data);

  // Partial updates validate dates only when both ends of the range are present.
  if (payload.startDate && payload.endDate) validateTripPayload(payload);

  const trip = await tripRepository.updateByIdAndUserId(tripId, userId, payload);
  if (!trip) throw new AppError('Trip not found', 404);
  await notificationService.scheduleTripReminder(trip);
  return trip;
};

const deleteTrip = async (tripId, userId) => {
  const trip = await tripRepository.deleteByIdAndUserId(tripId, userId);
  if (!trip) throw new AppError('Trip not found', 404);
};

const getTripSummary = async (tripId, userId) => {
  const trip = await getTripById(tripId, userId);

  // Summary data is fetched in parallel because weather and attractions do not depend on each other.
  const [weather, attractions] = await Promise.all([
    exploreService.getWeatherByDestination(trip.destination, trip.startDate?.toISOString().slice(0, 10)),
    exploreService.getAttractionsByDestination(trip.destination),
  ]);

  return { trip, weather, weatherGuidance: getWeatherGuidance(weather), attractions };
};

module.exports = {
  createTrip,
  getMyTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  getTripSummary,
  getWeatherGuidance,
  normalizeTripPayload,
};
