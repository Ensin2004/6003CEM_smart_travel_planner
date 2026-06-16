/**
 * Favorite utilities centralize card identity and payload mapping.
 * Shared helpers keep favourite toggles consistent across explore cards and trip cards.
 */

// Normalizes text by trimming, converting to lowercase, and collapsing spaces for consistent comparison
export const normalizeFavoriteText = (value) =>
  String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

// Generates a unique composite key by combining normalized type and identity fields
export const getFavoriteKey = ({ type, title, externalId }) => {
  const normalizedType = normalizeFavoriteText(type);
  const normalizedIdentity = normalizeFavoriteText(externalId || title);

  return normalizedType && normalizedIdentity ? `${normalizedType}:${normalizedIdentity}` : '';
};

// Derives a unique key directly from a favorite object's own properties
export const getFavoriteRecordKey = (favorite = {}) =>
  getFavoriteKey({
    type: favorite.type,
    title: favorite.title,
    externalId: favorite.externalId,
  });

// Constructs a map for O(1) favorite lookups using both primary keys and title-based keys
export const buildFavoriteLookup = (favorites = []) =>
  favorites.reduce((lookup, favorite) => {
    const primaryKey = getFavoriteRecordKey(favorite);
    const titleKey = getFavoriteKey({
      type: favorite.type,
      title: favorite.title,
      externalId: favorite.title,
    });

    if (primaryKey) lookup[primaryKey] = favorite;
    if (titleKey) lookup[titleKey] = favorite;

    return lookup;
  }, {});

// Converts generic category names into the favorite system's internal type identifiers
export const getPlaceFavoriteType = (type = '') => {
  if (type === 'hotels') return 'hotel';
  if (type === 'food' || type === 'restaurants') return 'restaurant';
  if (type === 'location') return 'location';
  return 'attraction';
};

// Determines the appropriate source string for a favorite based on the card context
export const getPlaceFavoriteSource = ({ isHotelCard, isFoodCard, type, visitedSource }) => {
  if (isHotelCard) return 'explore-hotels';
  if (isFoodCard) return 'explore-food';
  return visitedSource || `explore-${type}`;
};

// Creates a complete favorite payload from a place item with all required fields
export const buildPlaceFavoritePayload = ({
  item = {},
  type = 'attractions',
  originalPriceText = '',
  visitedSource = '',
}) => {
  const isHotelCard = type === 'hotels';
  const isFoodCard = type === 'food' || type === 'restaurants';
  const favoriteType = getPlaceFavoriteType(type);
  const externalId = item.dataId || item.placeId || item.id || item.name;

  return {
    type: favoriteType,
    title: item.name || item.title,
    description: item.address,
    address: item.address,
    coordinates: item.coordinates,
    priceLevel: originalPriceText || item.priceDetail?.display || item.price,
    rating: item.rating,
    externalId,
    source: getPlaceFavoriteSource({ isHotelCard, isFoodCard, type, visitedSource }),
  };
};

// Creates a complete favorite payload from a trip object for location-based favorites
export const buildTripFavoritePayload = (trip = {}) => {
  const title = trip.title || trip.destination || 'Trip destination';
  const destinationLabel = [trip.destination, trip.country].filter(Boolean).join(', ') || title;

  return {
    type: 'location',
    title,
    description: destinationLabel,
    address: destinationLabel,
    priceLevel: trip.budget?.totalAmount
      ? `${trip.budget.currency || 'MYR'} ${Number(trip.budget.totalAmount).toLocaleString()}`
      : undefined,
    externalId: `trip-${trip._id}`,
    source: 'trips',
  };
};
