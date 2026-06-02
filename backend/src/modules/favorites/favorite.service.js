const AppError = require('../../utils/AppError');
const favoriteRepository = require('./favorite.repository');

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

const buildFavoritePayload = (userId, data) => ({
  userId,
  type: data.type,
  title: data.title,
  description: data.description,
  location: data.address || data.coordinates
    ? {
        address: data.address,
        coordinates: normalizeCoordinates(data.coordinates),
      }
    : undefined,
  priceLevel: data.priceLevel,
  rating: data.rating,
  externalId: data.externalId,
  source: data.source || 'explore',
});

const listFavorites = (userId) => favoriteRepository.findByUserId(userId);

const addFavorite = async (userId, data) => {
  const existing = await favoriteRepository.findExisting({
    userId,
    type: data.type,
    externalId: data.externalId || data.title,
    title: data.title,
  });

  if (existing) return existing;

  return favoriteRepository.create(buildFavoritePayload(userId, data));
};

const removeFavorite = async (userId, favoriteId) => {
  const favorite = await favoriteRepository.deleteByIdAndUserId(favoriteId, userId);
  if (!favorite) throw new AppError('Favorite not found', 404);
  return favorite;
};

module.exports = { addFavorite, listFavorites, removeFavorite };
