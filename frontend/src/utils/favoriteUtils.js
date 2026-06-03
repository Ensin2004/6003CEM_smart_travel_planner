/**
 * Favorite utilities centralize card identity and payload mapping.
 * Shared helpers keep favourite toggles consistent across explore cards and trip cards.
 */
export const normalizeFavoriteText = (value) =>
  String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

export const getFavoriteKey = ({ type, title, externalId }) => {
  const normalizedType = normalizeFavoriteText(type);
  const normalizedIdentity = normalizeFavoriteText(externalId || title);

  return normalizedType && normalizedIdentity ? `${normalizedType}:${normalizedIdentity}` : '';
};

export const getFavoriteRecordKey = (favorite = {}) =>
  getFavoriteKey({
    type: favorite.type,
    title: favorite.title,
    externalId: favorite.externalId,
  });

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

export const getPlaceFavoriteType = (type = '') => {
  if (type === 'hotels') return 'hotel';
  if (type === 'food' || type === 'restaurants') return 'restaurant';
  if (type === 'location') return 'location';
  return 'attraction';
};

export const getPlaceFavoriteSource = ({ isHotelCard, isFoodCard, type, visitedSource }) => {
  if (isHotelCard) return 'explore-hotels';
  if (isFoodCard) return 'explore-food';
  return visitedSource || `explore-${type}`;
};

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
