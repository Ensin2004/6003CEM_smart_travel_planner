/**
 * Visited places module.
 * Business rules for place identity, calendar grouping, and ownership live here.
 */
const AppError = require('../../utils/AppError');
const visitedPlaceRepository = require('./visitedPlace.repository');

const normalizeKeyPart = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 180);

const buildPlaceKey = (data = {}) => {
  const type = normalizeKeyPart(data.type || 'location');
  const externalId = normalizeKeyPart(data.externalId);
  const title = normalizeKeyPart(data.title);
  const address = normalizeKeyPart(data.address);

  return [type, externalId || title, address].filter(Boolean).join('|');
};

const listVisitedPlaces = (userId) => visitedPlaceRepository.findByUserId(userId);

const markVisitedPlace = (userId, data) => {
  const placeKey = data.placeKey || buildPlaceKey(data);
  if (!placeKey) throw new AppError('Place details are required.', 400);

  const visitCount = Math.max(1, Math.min(Number(data.visitCount) || 1, 999));
  const visitEntry = {
    visitCount,
    notes: data.notes,
    tripId: data.tripId,
    itineraryItemId: data.itineraryItemId,
  };

  if (data.visitedDate) {
    visitEntry.visitedDate = data.visitedDate;
  }

  return visitedPlaceRepository.addVisitByUserAndPlaceKey(userId, placeKey, {
    type: data.type || 'location',
    title: data.title,
    address: data.address,
    source: data.source || 'manual',
    externalId: data.externalId,
  }, visitEntry);
};

const removeVisitedPlace = async (userId, visitedPlaceId) => {
  const record = await visitedPlaceRepository.deleteByIdAndUserId(visitedPlaceId, userId);
  if (!record) throw new AppError('Visited place not found', 404);
  return record;
};

const getVisitedCalendar = async (userId, { startDate, endDate }) => {
  const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date('1970-01-01T00:00:00.000Z');
  const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date('2999-12-31T23:59:59.999Z');
  const records = await visitedPlaceRepository.findBetweenDates(userId, start, end);
  const dayMap = new Map();

  records.forEach((record) => {
    record.visits
      .filter((visit) => visit.visitedDate && visit.visitedDate >= start && visit.visitedDate <= end)
      .forEach((visit) => {
        const dayKey = visit.visitedDate.toISOString().slice(0, 10);
        const currentDay = dayMap.get(dayKey) || [];
        currentDay.push({
          id: `${record._id}-${visit._id}`,
          placeId: record._id,
          title: record.title,
          type: record.type,
          address: record.address,
          source: record.source,
          externalId: record.externalId,
          visitedDate: visit.visitedDate,
          visitCount: visit.visitCount,
          notes: visit.notes,
        });
        dayMap.set(dayKey, currentDay);
      });
  });

  return [...dayMap.entries()].map(([date, places]) => ({ date, places }));
};

module.exports = {
  buildPlaceKey,
  getVisitedCalendar,
  listVisitedPlaces,
  markVisitedPlace,
  removeVisitedPlace,
};
