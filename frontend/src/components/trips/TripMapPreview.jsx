/**
 * Trip Map Preview module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { defaultMapCenter, getTripMapPoint } from './tripMapUtils';
import './TripMapPreview.css';

// Ordinary places use map pins, while optimized routes use numbered stop markers.
// Creates a custom Leaflet divIcon marker with appropriate styling for different pin types
const createTripMarker = ({
  index,
  tone = 'primary',
  label = index + 1,
  isHighlighted = false,
  showStopOrder = false,
}) => {
  // Builds the CSS class string for the marker based on its type and state
  const markerClass = [
    'shared-trip-map-pin',
    `shared-trip-map-pin-${tone}`,
    showStopOrder ? 'shared-trip-map-pin-numbered' : 'shared-trip-map-pin-location',
    isHighlighted ? 'shared-trip-map-pin-highlighted' : '',
  ].filter(Boolean).join(' ');
  
  // Determines what content to display inside the marker
  const markerContent = showStopOrder || isHighlighted
    ? label
    : '<span class="shared-trip-map-pin-dot"></span>';

  return L.divIcon({
    className: '',
    html: `<span class="${markerClass}">${markerContent}</span>`,
    iconSize: isHighlighted ? [48, 48] : showStopOrder ? [34, 34] : [34, 42],
    iconAnchor: isHighlighted ? [24, 24] : showStopOrder ? [17, 17] : [17, 42],
  });
};

// Updates the map view based on focus state, route bounds, or center coordinates
function MapViewUpdater({ center, focusCenter, focusOffset, routeCoordinates, zoom }) {
  const map = useMap();
  const [latitude, longitude] = center;
  const [focusOffsetX, focusOffsetY] = focusOffset;

  useEffect(() => {
    // When focusCenter is true, fly to a specific offset point
    if (focusCenter) {
      const targetPoint = map.project([latitude, longitude], zoom);
      const offsetCenter = map.unproject(
        targetPoint.add(L.point(focusOffsetX, focusOffsetY)),
        zoom
      );
      map.flyTo(offsetCenter, zoom, { duration: 0.75 });
      return;
    }

    // When route coordinates exist, fit the map to show the entire route
    if (routeCoordinates?.length > 1) {
      map.fitBounds(routeCoordinates, { animate: true, padding: [42, 42] });
      return;
    }

    // Default: set the view to the center coordinates
    map.setView([latitude, longitude], zoom, { animate: true });
  }, [focusCenter, focusOffsetX, focusOffsetY, latitude, longitude, map, routeCoordinates, zoom]);

  return null;
}

// TripMapPreview renders the main screen and handles nearby interactions.
function TripMapPreview({
  center,
  className = '',
  focusCenter = false,
  focusOffset = [0, 0],
  highlightedPlace,
  onPlaceClick,
  places = [],
  route,
  scrollWheelZoom = false,
  showZoomControl = false,
  zoom,
}) {
  // Filters places that have location data (city, title, or name)
  const visiblePlaces = places.filter((place) => place?.city || place?.title || place?.name);
  const mapPoints = visiblePlaces.map(getTripMapPoint);
  
  // Determines the map center from provided coordinates or falls back to first place or default
  const requestedCenter = Array.isArray(center)
    && Number.isFinite(Number(center[0]))
    && Number.isFinite(Number(center[1]))
    ? [Number(center[0]), Number(center[1])]
    : null;
  const mapCenter = requestedCenter || mapPoints[0] || defaultMapCenter;
  
  // Sets zoom level: higher zoom for multiple places, lower for single place
  const mapZoom = zoom || (visiblePlaces.length > 1 ? 5 : 6);
  const routeCoordinates = route?.coordinates || [];
  const showStopOrder = routeCoordinates.length > 1;
  const highlightedPoint = highlightedPlace ? getTripMapPoint(highlightedPlace) : null;

  return (
    <div className={`shared-trip-map ${className}`.trim()}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={scrollWheelZoom}
        zoomControl={showZoomControl}
        attributionControl={false}
        className="shared-trip-leaflet-map"
      >
        {/* Updates map view based on focus state or route bounds */}
        <MapViewUpdater
          center={mapCenter}
          focusCenter={focusCenter}
          focusOffset={focusOffset}
          routeCoordinates={routeCoordinates}
          zoom={mapZoom}
        />
        
        {/* OpenStreetMap tile layer with minimal attribution */}
        <TileLayer
          attribution=""
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Connection line between points when no route is available */}
        {!routeCoordinates.length && mapPoints.length > 1
          ? <Polyline positions={mapPoints} pathOptions={{ color: '#0f766e', weight: 4 }} />
          : null}
        
        {/* Alternative route polylines shown as dashed lines for visual comparison */}
        {(route?.alternatives || [])
          .filter((alternative) => alternative.id !== route.id)
          .map((alternative) => (
            <Polyline
              key={alternative.id}
              positions={alternative.coordinates}
              pathOptions={{ color: '#64748b', dashArray: '8 8', opacity: 0.5, weight: 4 }}
            />
          ))}
        
        {/* Main route polyline with prominent blue styling */}
        {routeCoordinates.length ? (
          <Polyline positions={routeCoordinates} pathOptions={{ color: '#2563eb', opacity: 0.92, weight: 5 }} />
        ) : null}
        
        {/* Renders markers for each visible place with appropriate styling */}
        {visiblePlaces.map((place, index) => {
          const point = getTripMapPoint(place, index);
          const isHighlighted = Boolean(
            highlightedPoint
            && Number(point[0]) === Number(highlightedPoint[0])
            && Number(point[1]) === Number(highlightedPoint[1])
          );

          return (
            <Marker
              key={`${place.city || place.title || place.name}-${index}`}
              position={point}
              icon={createTripMarker({
                index,
                // Selects color tone based on place type or day number
                tone: place.type === 'idea' ? 'idea' : place.dayNumber ? `day-${((place.dayNumber - 1) % 6) + 1}` : 'primary',
                label: showStopOrder ? index + 1 : place.dayNumber || index + 1,
                isHighlighted,
                showStopOrder,
              })}
              eventHandlers={onPlaceClick ? { click: () => onPlaceClick(place) } : undefined}
              zIndexOffset={isHighlighted ? 1000 : 0}
            >
              <Tooltip
                className={isHighlighted ? 'shared-trip-map-highlight-label' : ''}
                direction="top"
                offset={[0, isHighlighted ? -28 : -14]}
                opacity={1}
                permanent={isHighlighted}
              >
                {isHighlighted ? (
                  <span>
                    <strong>HERE!</strong>
                    <small>{place.title || place.name || place.city}</small>
                  </span>
                ) : (
                  [place.title || place.name || place.city, place.country].filter(Boolean).join(', ')
                )}
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

// Default export registers the primary value.
export default TripMapPreview;
