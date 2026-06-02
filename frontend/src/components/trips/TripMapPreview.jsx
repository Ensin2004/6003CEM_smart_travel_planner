/**
 * Trip Map Preview module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { defaultMapCenter, getTripMapPoint } from './tripMapUtils';
import './TripMapPreview.css';
// Create Trip Marker builds a new record from validated input.
const createTripMarker = (index, tone = 'primary') =>
  L.divIcon({
    className: '',
    html: `<span class="shared-trip-map-pin shared-trip-map-pin-${tone}">${index + 1}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
// TripMapPreview renders the main screen and handles nearby interactions.
function TripMapPreview({ className = '', places = [], zoom }) {
  const visiblePlaces = places.filter((place) => place?.city || place?.title || place?.name);
  const mapPoints = visiblePlaces.map(getTripMapPoint);
  const mapCenter = mapPoints[0] || defaultMapCenter;
  const mapZoom = zoom || (visiblePlaces.length > 1 ? 5 : 6);
  return (
    <div className={`shared-trip-map ${className}`.trim()}>
      <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={false} zoomControl={false} attributionControl={false} className="shared-trip-leaflet-map">
        <TileLayer
          attribution=""
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapPoints.length > 1 && <Polyline positions={mapPoints} pathOptions={{ color: '#0f766e', weight: 4 }} />}
        {visiblePlaces.map((place, index) => (
          <Marker
            key={`${place.city || place.title || place.name}-${index}`}
            position={getTripMapPoint(place, index)}
            icon={createTripMarker(index, place.type === 'idea' ? 'idea' : 'primary')}
          >
            <Tooltip direction="top" offset={[0, -14]}>
              {[place.title || place.name || place.city, place.country].filter(Boolean).join(', ')}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
// Default export registers the primary  value.
export default TripMapPreview;
