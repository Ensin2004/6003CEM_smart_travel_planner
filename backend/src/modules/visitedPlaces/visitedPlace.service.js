/**
 * Visited places module.
 * Business rules for place identity, calendar grouping, and ownership live here.
 */
const AppError = require('../../utils/AppError');
const env = require('../../config/env');
const { normalizePlaceItem, searchGoogleMaps } = require('../explore/googleMaps.service');
const visitedPlaceRepository = require('./visitedPlace.repository');

// In-memory cache for image enrichment results to avoid repeated API calls.
const imageEnrichmentCache = new Map();

// Maximum number of records to process in a single image enrichment run.
const IMAGE_ENRICHMENT_LIMIT = 10;

// Normalizes string values for consistent comparison and key generation.
const normalizeKeyPart = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 180);

// Builds a unique composite key from place attributes.
const buildPlaceKey = (data = {}) => {
  const type = normalizeKeyPart(data.type || 'location');
  const externalId = normalizeKeyPart(data.externalId);
  const title = normalizeKeyPart(data.title);
  const address = normalizeKeyPart(data.address);

  return [type, externalId || title, address].filter(Boolean).join('|');
};

// Retrieves all visited places for a user without additional processing.
const listVisitedPlaces = (userId) => visitedPlaceRepository.findByUserId(userId);

// Enriches visited places with images from external search providers.
const enrichVisitedPlaceImages = async (userId) => {
  const records = await visitedPlaceRepository.findByUserId(userId);
  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return { enrichedCount: 0, visitedPlaces: records };
  }

  const missingImageRecords = records
    .filter((record) => !record.imageUrl && !record.imageUrls?.length && record.title)
    .slice(0, IMAGE_ENRICHMENT_LIMIT);
  let enrichedCount = 0;

  for (const record of missingImageRecords) {
    const query = [record.title, record.address].filter(Boolean).join(', ');

    try {
      const result = await searchGoogleMaps({
        cache: imageEnrichmentCache,
        cacheKey: `visited-image:${query.toLowerCase()}`,
        query,
        metadata: {},
        mapItem: (item, index) => normalizePlaceItem(item, index, {
          name: record.title,
          category: record.type,
        }),
      });
      const matchedPlace = result.items?.find((item) => item.imageUrl) || result.items?.[0];
      if (!matchedPlace?.imageUrl) continue;

      await visitedPlaceRepository.updateImagesByIdAndUserId(
        record._id,
        userId,
        matchedPlace.imageUrl,
        matchedPlace.imageUrls?.length ? matchedPlace.imageUrls : [matchedPlace.imageUrl]
      );
      enrichedCount += 1;
    } catch {
      // A failed provider lookup should not prevent other visited places from loading.
    }
  }

  return {
    enrichedCount,
    visitedPlaces: enrichedCount ? await visitedPlaceRepository.findByUserId(userId) : records,
  };
};

// Creates or updates a visited place with visit entry.
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
    imageUrl: data.imageUrl,
    imageUrls: data.imageUrls,
  }, visitEntry);
};

// Removes a visited place record by ID, verifying ownership.
const removeVisitedPlace = async (userId, visitedPlaceId) => {
  const record = await visitedPlaceRepository.deleteByIdAndUserId(visitedPlaceId, userId);
  if (!record) throw new AppError('Visited place not found', 404);
  return record;
};

// Fetches and groups visited places by calendar date within a range.
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
          imageUrl: record.imageUrl,
          imageUrls: record.imageUrls,
          visitedDate: visit.visitedDate,
          visitCount: visit.visitCount,
          notes: visit.notes,
        });
        dayMap.set(dayKey, currentDay);
      });
  });

  return [...dayMap.entries()].map(([date, places]) => ({ date, places }));
};

// Exports all service functions for use by controllers.
module.exports = {
  buildPlaceKey,
  enrichVisitedPlaceImages,
  getVisitedCalendar,
  listVisitedPlaces,
  markVisitedPlace,
  removeVisitedPlace,
};