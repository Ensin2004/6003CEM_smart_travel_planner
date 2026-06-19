/**
 * Favorites module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const AppError = require('../../utils/AppError');
const favoriteRepository = require('./favorite.repository');

/**
 * Normalize Coordinates prepares incoming data for consistent storage.
 * Converts latitude/longitude to GeoJSON Point format.
 * 
 * @param {Object} coordinates - Coordinates object with latitude and longitude
 * @returns {Object|undefined} GeoJSON Point object or undefined if invalid
 */
const normalizeCoordinates = (coordinates = {}) => {
  const latitude = Number(coordinates.latitude);
  const longitude = Number(coordinates.longitude);

  // Validate that both values are finite numbers
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined;
  }

  return {
    type: 'Point',
    coordinates: [longitude, latitude], // GeoJSON uses [longitude, latitude] order
  };
};

/**
 * Build Favorite Location omits invalid GeoJSON entirely so address-only favourites remain valid.
 * Creates a location object with address and optional coordinates.
 * 
 * @param {Object} data - Favorite data with address and coordinates
 * @returns {Object|undefined} Location object or undefined if no location data
 */
const buildFavoriteLocation = (data) => {
  const coordinates = normalizeCoordinates(data.coordinates);
  
  // Skip if neither address nor coordinates are provided
  if (!data.address && !coordinates) return undefined;

  return {
    address: data.address,
    ...(coordinates ? { coordinates } : {}), // Only include coordinates if valid
  };
};

/**
 * Build Favorite Payload transforms source data into the shape required nearby.
 * Constructs the favorite document payload for database insertion.
 * 
 * @param {string} userId - ID of the user creating the favorite
 * @param {Object} data - Raw favorite data from request
 * @returns {Object} Formatted favorite payload
 */
const buildFavoritePayload = (userId, data) => ({
  userId,
  type: data.type,
  title: data.title,
  description: data.description,
  location: buildFavoriteLocation(data),
  priceLevel: data.priceLevel,
  rating: data.rating,
  externalId: data.externalId,
  source: data.source || 'explore', // Default source if not specified
});

/**
 * Lists all favorites for a user.
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of favorite documents
 */
const listFavorites = (userId) => favoriteRepository.findByUserId(userId);

/**
 * Add Favorite builds a new record from validated input.
 * Checks for existing favorites to prevent duplicates.
 * Trip favorites use externalId matching, others use title/externalId OR matching.
 * 
 * @param {string} userId - User ID
 * @param {Object} data - Favorite data
 * @returns {Promise<Object>} Created or existing favorite document
 */
const addFavorite = async (userId, data) => {
  // Trip favorites use exact externalId matching to avoid duplicate trip saves
  const isTripFavorite = data.source === 'trips' && String(data.externalId || '').startsWith('trip-');
  
  // Check for existing favorite using appropriate strategy
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

  // Return existing favorite if found (idempotent operation)
  if (existing) return existing;

  // Create new favorite
  return favoriteRepository.create(buildFavoritePayload(userId, data));
};

/**
 * Remove Favorite removes a record after ownership checks.
 * Deletes a favorite only if it belongs to the specified user.
 * 
 * @param {string} userId - User ID for ownership verification
 * @param {string} favoriteId - Favorite ID to delete
 * @returns {Promise<Object>} Deleted favorite document
 * @throws {AppError} If favorite not found or doesn't belong to user
 */
const removeFavorite = async (userId, favoriteId) => {
  const favorite = await favoriteRepository.deleteByIdAndUserId(favoriteId, userId);
  if (!favorite) throw new AppError('Favorite not found', 404);
  return favorite;
};

module.exports = { addFavorite, listFavorites, removeFavorite };