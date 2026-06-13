/**
 * Favorites module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const AppError = require('../../utils/AppError');
const favoriteRepository = require('./favorite.repository');
// Normalize Coordinates prepares incoming data for consistent storage.
const normalizeCoordinates = (coordinates = {}) => {
  const latitude = Number(coordinates.latitude);
  const longitude = Number(coordinates.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined;
  }

  return {
    type: 'Point',
    coordinates: [longitude, latitude],
  };
};
// Build Favorite Location omits invalid GeoJSON entirely so address-only favourites remain valid.
const buildFavoriteLocation = (data) => {
  const coordinates = normalizeCoordinates(data.coordinates);
  if (!data.address && !coordinates) return undefined;

  return {
    address: data.address,
    ...(coordinates ? { coordinates } : {}),
  };
};
// Build Favorite Payload transforms source data into the shape required nearby.
const buildFavoritePayload = (userId, data) => ({
  userId,
  type: data.type,
  title: data.title,
  description: data.description,
  location: buildFavoriteLocation(data),
  priceLevel: data.priceLevel,
  rating: data.rating,
  externalId: data.externalId,
  source: data.source || 'explore',
});
const listFavorites = (userId) => favoriteRepository.findByUserId(userId);
// Add Favorite builds a new record from validated input.
const addFavorite = async (userId, data) => {
  const isTripFavorite = data.source === 'trips' && String(data.externalId || '').startsWith('trip-');
  const existing = isTripFavorite
    ? await favoriteRepository.findByUserIdTypeAndExternalId({
      userId,
      type: data.type,
      externalId: data.externalId,
    })
    : await favoriteRepository.findExisting({
      userId,
      type: data.type,
      externalId: data.externalId || data.title,
      title: data.title,
    });

  if (existing) return existing;

  return favoriteRepository.create(buildFavoritePayload(userId, data));
};
// Remove Favorite removes a record after ownership checks.
const removeFavorite = async (userId, favoriteId) => {
  const favorite = await favoriteRepository.deleteByIdAndUserId(favoriteId, userId);
  if (!favorite) throw new AppError('Favorite not found', 404);
  return favorite;
};
module.exports = { addFavorite, listFavorites, removeFavorite };
