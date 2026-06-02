/**
 * Trip Map Utils module.
 * Small utilities keep repeated formatting and transformation logic reusable.
 */
const defaultMapCenter = [5.4141, 100.3288];

const knownCoordinates = {
  bali: [-8.3405, 115.092],
  bangkok: [13.7563, 100.5018],
  busan: [35.1796, 129.0756],
  japan: [36.2048, 138.2529],
  kuala: [3.139, 101.6869],
  malaysia: [4.2105, 101.9758],
  penang: [5.4141, 100.3288],
  seoul: [37.5665, 126.978],
  singapore: [1.3521, 103.8198],
  thailand: [15.87, 100.9925],
  tokyo: [35.6762, 139.6503],
};
export const getTripMapPoint = (place, index = 0) => {
  const lat = Number(place?.lat ?? place?.latitude ?? place?.coordinates?.latitude);
  const lng = Number(place?.lng ?? place?.longitude ?? place?.coordinates?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];

  const lookupText = `${place?.city || ''} ${place?.country || ''} ${place?.title || ''} ${place?.name || ''}`.toLowerCase();
  const match = Object.entries(knownCoordinates).find(([key]) => lookupText.includes(key));
  if (match) return match[1];

  return [
    defaultMapCenter[0] + index * 4,
    defaultMapCenter[1] + index * 7,
  ];
};

export { defaultMapCenter };
