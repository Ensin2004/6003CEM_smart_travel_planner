/**
 * Visited place helpers.
 * Shared identity helpers keep watermarks consistent across travel surfaces.
 */
const normalizeKeyPart = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 180);

export const buildVisitedPlaceKey = ({
  type = 'location',
  externalId = '',
  title = '',
  name = '',
  address = '',
} = {}) =>
  [type, externalId || title || name, address]
    .map(normalizeKeyPart)
    .filter(Boolean)
    .join('|');

export const getVisitedPlacePayload = ({
  item = {},
  type = 'location',
  source = 'manual',
  defaultDate,
  tripId,
  itineraryItemId,
} = {}) => {
  const title = item.title || item.name || item.displayName || 'Visited place';
  const address = item.address || item.displayName || item.location?.address || '';
  const externalId = item.externalId || item.dataId || item.placeId || item.id || title;
  const imageUrl = item.imageUrl || item.imageUrls?.[0] || item.photoUrl || item.thumbnail || '';
  const imageUrls = item.imageUrls || (imageUrl ? [imageUrl] : []);
  const placeKey = buildVisitedPlaceKey({ source, type, externalId, title, address });

  return {
    placeKey,
    type,
    title,
    address,
    source,
    externalId,
    imageUrl,
    imageUrls,
    visitedDate: defaultDate,
    tripId,
    itineraryItemId,
  };
};

export const buildVisitedLookup = (visitedPlaces = []) =>
  visitedPlaces.reduce((lookup, place) => {
    if (place.placeKey) lookup[place.placeKey] = place;
    return lookup;
  }, {});
