const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

const getOpenStreetMapErrorMessage = (status) => {
  if (status === 429) {
    return 'Map search is busy right now. Please try again in a moment.';
  }

  if (status >= 500) {
    return 'Map search is temporarily unavailable.';
  }

  return 'Unable to search this location.';
};

export const searchOpenStreetMapPlaces = async (query, options = {}) => {
  const trimmedQuery = String(query || '').trim();

  if (trimmedQuery.length < 2) {
    return [];
  }

  const params = new URLSearchParams({
    q: trimmedQuery,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(options.limit || 6),
  });

  const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(getOpenStreetMapErrorMessage(response.status));
  }

  const places = await response.json();

  return places
    .map((place) => ({
      id: `${place.osm_type}-${place.osm_id}`,
      name: place.name || place.display_name?.split(',')[0] || 'Selected place',
      displayName: place.display_name || 'Location',
      lat: Number(place.lat),
      lng: Number(place.lon),
      category: place.category || 'place',
      type: place.type || 'location',
      importance: Number(place.importance || 0),
    }))
    .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));
};
