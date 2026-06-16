/**
 * Map module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useLocation } from 'react-router-dom';
import {
  BedDouble,
  ChevronRight,
  CloudSun,
  Clock3,
  DollarSign,
  Image,
  Heart,
  Layers,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Mountain,
  Navigation,
  Plane,
  Search,
  ShoppingBag,
  Star,
  SquarePen,
  TrainFront,
  Trash2,
  Utensils,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { convertCurrency } from '../../api/currencyApi';
import { addFavorite, getFavorites, removeFavorite } from '../../api/favoriteApi';
import {
  getMapPlaceDetails,
  getMapWeather,
  getRouteBetweenPlaces,
  searchMapCategoryPlaces,
  searchOpenStreetMapCategoryPlaces,
  searchOpenStreetMapPlaces,
} from '../../api/mapApi';
import CompareButton from '../../components/compare/CompareButton';
import CurrencyContext from '../../context/currencyContext';
import { buildFavoriteLookup, buildPlaceFavoritePayload, getFavoriteKey } from '../../utils/favoriteUtils';
import './MapPage.css';

const defaultCenter = [5.4141, 100.3288];
const defaultZoom = 11;

// Configuration object that maps each category identifier to its display properties
// Each entry includes a human-readable label, a Lucide icon component reference, and a hex color code
const categoryConfig = {
  hotels: { label: 'Hotels', icon: BedDouble, color: '#2563eb' },
  airports: { label: 'Airport', icon: Plane, color: '#7c3aed' },
  train: { label: 'Station', icon: TrainFront, color: '#4f46e5' },
  food: { label: 'Food', icon: Utensils, color: '#f97316' },
  attractions: { label: 'Attractions', icon: Mountain, color: '#0891b2' },
  shopping: { label: 'Shopping', icon: ShoppingBag, color: '#db2777' },
  custom: { label: 'Custom', icon: MapPin, color: '#16a34a' },
  saved: { label: 'Saved', icon: Heart, color: '#ef4444' },
};

// Defines the sequential order in which category filters appear in the UI
// This array references the keys from categoryConfig to maintain consistent ordering
const filterOrder = ['hotels', 'airports', 'train', 'food', 'attractions', 'shopping', 'custom', 'saved'];

// Storage key used for persisting user-created markers in the browser's localStorage
const userMarkersStorageKey = 'smartTravelPlanner.map.userMarkers';

// Fallback location object used when the user's actual location cannot be determined
// Contains default coordinates and a flag to identify it as a fallback rather than a real location
const fallbackUserLocation = {
  id: 'user-location',
  name: 'My location',
  lat: defaultCenter[0],
  lng: defaultCenter[1],
  isFallback: true,
};

// Available transportation modes for route planning between destinations
// Each mode includes an identifier and a display label for the UI
const routeModeOptions = [
  { id: 'car', label: 'Car' },
  { id: 'walking', label: 'Walking' },
  { id: 'bike', label: 'Bike' },
  { id: 'train', label: 'Train' },
  { id: 'plane', label: 'Plane' },
];

// Configuration object for different map tile layer sources
// Each layer specifies the tile URL pattern and attribution text required by the tile provider
const mapTileLayers = {
  default: {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  satellite: {
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
};

// Represents the category panel as a special place object with a panelMode flag
// This object is used to display a list of search results in a side panel rather than a single marker
const categoryPanelPlace = {
  id: 'category-panel',
  name: 'Map results',
  lat: defaultCenter[0],
  lng: defaultCenter[1],
  zoom: defaultZoom,
  panelMode: 'category',
};

// Extracts the address from a place object, checking multiple possible property names
// Returns a fallback string if no address information is available
const getPlaceAddress = (place) => place.address || place.displayName || 'Location details unavailable';

// Determines whether a place object contains rich detail data beyond basic coordinates and name
// Checks for properties like images, ratings, reviews, operating hours, and price information
const hasRichPlaceDetails = (place = {}) =>
  place.detailSource === 'serpapi' ||
  Boolean(
    place.imageUrl ||
    Number(place.rating) ||
    Number(place.reviews || place.reviewCount) ||
    place.openState ||
    (place.hours && place.hours !== 'Hours unavailable') ||
    place.priceDetail
  );

// Merges two place objects while preserving rich detail data from the base place
// Coordinates and categoryId from the next place take precedence over the base place's values
const mergePreservingRichPlace = (basePlace = {}, nextPlace = {}) => {
  if (!hasRichPlaceDetails(basePlace)) return { ...basePlace, ...nextPlace };

  return {
    ...nextPlace,
    ...basePlace,
    lat: nextPlace.lat ?? basePlace.lat,
    lng: nextPlace.lng ?? basePlace.lng,
    categoryId: nextPlace.categoryId || basePlace.categoryId,
  };
};

// Transforms raw place data into a standardized format with consistent property names
// Converts coordinate values to numbers, extracts addresses, and normalizes optional fields
const formatCategoryPlace = (place, categoryId) => ({
  ...place,
  lat: Number(place.lat ?? place.coordinates?.latitude),
  lng: Number(place.lng ?? place.coordinates?.longitude),
  categoryId,
  address: getPlaceAddress(place),
  imageUrl: place.imageUrl || place.imageUrls?.[0] || '',
  imageUrls: place.imageUrls || (place.imageUrl ? [place.imageUrl] : []),
  reviewItems: place.reviewItems || [],
  hours: place.hours || place.hoursSummary || place.openState || 'Hours unavailable',
  rating: place.rating || 'N/A',
  reviews: place.reviews || place.reviewCount || 'No reviews yet',
  price: place.price || place.priceDetail?.display || 'Price unavailable',
  phone: place.phone || '',
  openState: place.openState || '',
  url: place.url || '',
  summary: place.summary || place.category || 'Place result from map data.',
});

// Converts a date object to a string key in YYYY-MM-DD format
// Used for grouping or caching data by date
const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

// Formats a numeric temperature value with the Celsius symbol
// Returns a placeholder string if the value is not a valid number
const formatTemperature = (value) => (Number.isFinite(Number(value)) ? `${Math.round(Number(value))} C` : '--');

// Formats a monetary amount using the specified currency code and locale-aware formatting
// Uses the Intl.NumberFormat API for proper currency display with two decimal places
const formatMoney = (amount, currencyCode) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);

// Generates a unique cache key for price conversion based on item ID and target currency
// Includes price details in the key to invalidate cache when price information changes
const getPriceConversionKey = (item, targetCurrency) =>
  `${item.id}:${item.priceDetail?.display || item.price || 'price'}:${targetCurrency}`;

// Extracts the original price text from a place item, checking multiple possible properties
// Returns a fallback string if no price information is found
const getOriginalPriceText = (item) => item.priceDetail?.display || item.price || 'Price unavailable';

// Parses an open state string and returns a normalized status object with label and tone
// The tone is used for styling (e.g., 'open' for green, 'closed' for red, 'unknown' for gray)
const getOpenStatus = (openState = '') => {
  const normalizedState = openState.toLowerCase();

  if (normalizedState.includes('closed')) {
    return { label: 'Closed', tone: 'closed' };
  }

  if (normalizedState.includes('open')) {
    return { label: 'Open now', tone: 'open' };
  }

  return { label: 'Hours unknown', tone: 'unknown' };
};

// Generates a human-readable note about a route's reliability based on its mode
// Train and plane routes are noted as estimated, while other modes indicate mapping status
const getRouteModeNote = (route) => {
  if (!route) return 'Not calculated';
  if (route.mode === 'train' || route.mode === 'plane') {
    return 'Estimated only, confirm availability';
  }
  return route.estimated ? 'Estimated route' : 'Mapped route';
};

// Checks if an error object indicates a canceled request (AbortError or CanceledError)
// Used to prevent unnecessary error handling when requests are intentionally aborted
const isCanceledRequest = (error) => error.name === 'AbortError' || error.name === 'CanceledError';

// Creates a unique string key for a place request using place ID or coordinates
// Coordinates are rounded to 4 decimal places to group nearby requests and enable caching
const getPlaceRequestKey = (placeId, lat, lng) =>
  `${placeId || 'place'}:${Number(lat).toFixed(4)}:${Number(lng).toFixed(4)}`;

// Converts distance in meters to a human-readable string with appropriate units
// Returns meters for distances under 1km, otherwise converts to kilometers with one decimal
const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) {
    return 'Distance unavailable';
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
};

// Converts duration in seconds to a human-readable string with minutes or hours
// Returns minutes for durations under 1 hour, otherwise shows hours and remaining minutes
const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) {
    return 'Time unavailable';
  }

  const minutes = Math.max(1, Math.round(seconds / 60));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
};

// Retrieves user-created markers from localStorage and parses the JSON data
// Returns an empty array if no valid data exists or if parsing fails
const loadUserMarkers = () => {
  try {
    const savedMarkers = JSON.parse(localStorage.getItem(userMarkersStorageKey) || '[]');
    return Array.isArray(savedMarkers) ? savedMarkers : [];
  } catch {
    return [];
  }
};

// Persists an array of user markers to localStorage after serializing to JSON
// Overwrites any existing markers stored under the same key
const saveUserMarkers = (markers) => {
  localStorage.setItem(userMarkersStorageKey, JSON.stringify(markers));
};

// Determines whether a place result represents a country or administrative boundary
// Checks category and type fields for boundary-related keywords
const isCountryResult = (place) => (
  place?.category === 'boundary' ||
  ['country', 'state', 'province', 'administrative'].includes(place?.type)
);

// Infers the most appropriate category from a search query and place data
// Uses keyword matching on the query, category, and type fields to determine category
const inferCategoryFromSearch = (query, place) => {
  const text = `${query} ${place?.category || ''} ${place?.type || ''}`.toLowerCase();

  if (text.includes('hotel') || text.includes('resort')) return 'hotels';
  if (text.includes('airport') || text.includes('aerodrome')) return 'airports';
  if (text.includes('train') || text.includes('railway') || text.includes('station')) return 'train';
  if (text.includes('restaurant') || text.includes('food') || text.includes('cafe')) return 'food';
  if (text.includes('mall') || text.includes('shop') || text.includes('market')) return 'shopping';

  return 'attractions';
};

// Transforms a favorite record from GeoJSON coordinate format into a map place object
// Extracts coordinates from the nested location structure and maps favorite types to category IDs
const favoriteToMapPlace = (favorite = {}) => {
  const coordinates = favorite.location?.coordinates?.coordinates || [];
  const categoryId = {
    attraction: 'attractions',
    hotel: 'hotels',
    location: 'custom',
    restaurant: 'food',
  }[favorite.type] || 'attractions';

  return {
    id: `favorite-${favorite._id || favorite.externalId || favorite.title}`,
    dataId: favorite.externalId,
    name: favorite.title || 'Saved place',
    address: favorite.location?.address || favorite.description || 'Saved favourite',
    summary: favorite.description || favorite.location?.address || 'Saved favourite place.',
    rating: favorite.rating,
    price: favorite.priceLevel,
    lat: Number(coordinates[1]),
    lng: Number(coordinates[0]),
    categoryId,
    favoriteOrigin: true,
    panelMode: 'place',
    zoom: 17,
  };
};

// Validates that a place object contains finite latitude and longitude values
// Returns true only when both coordinates are valid numbers
const hasMapCoordinates = (place) => Number.isFinite(place?.lat) && Number.isFinite(place?.lng);

// Constructs a Leaflet divIcon for a map marker with category-based styling
// Renders the appropriate category icon and applies color from the category configuration
const createMapIcon = (pin, categoryId) => {
  const category = categoryConfig[categoryId] || categoryConfig.attractions;
  const PinIcon = category.icon;
  const iconMarkup = renderToStaticMarkup(<PinIcon size={17} strokeWidth={2.4} />);
  const isFavoriteOrigin = Boolean(pin.favoriteOrigin);

  return L.divIcon({
    className: '',
    html: `
      <span class="travel-map-pin${isFavoriteOrigin ? ' travel-map-pin-favorite-origin' : ''}" style="--pin-color: ${category.color}">
        <span class="travel-map-pin-icon">${iconMarkup}</span>
      </span>
    `,
    iconSize: isFavoriteOrigin ? [52, 60] : [42, 50],
    iconAnchor: isFavoriteOrigin ? [26, 58] : [21, 48],
    popupAnchor: isFavoriteOrigin ? [0, -54] : [0, -44],
  });
};

// Creates a specialized Leaflet divIcon for representing the user's current location
// Uses a distinct CSS class for the user location pin styling
const createUserLocationIcon = () => (
  L.divIcon({
    className: '',
    html: '<span class="travel-user-location-pin"></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
);

// React component that handles map focus animation when a place is selected
// Flies the map view to the place's coordinates when the place prop changes
function MapFocus({ place }) {
  const map = useMap();
  useEffect(() => {
    if (place?.panelMode !== 'category' && place?.lat && place?.lng) {
      map.flyTo([place.lat, place.lng], place.zoom || 12, { duration: 0.75 });
    }
  }, [map, place]);

  return null;
}

// React component that resets the map view to default center and zoom level
// Triggers animation when the resetCount prop increases, preserving normal focus behavior
function FavoriteMapReset({ resetCount }) {
  const map = useMap();
  useEffect(() => {
    if (resetCount > 0) {
      map.flyTo(defaultCenter, defaultZoom, { duration: 0.75 });
    }
  }, [map, resetCount]);

  return null;
}

// React component that renders a stack of map control buttons with tooltips
// Includes zoom controls, recenter, marker placement toggle, and layer selection
// Adapts positioning based on whether the panel is open or closed
function MapToolControls({
  isAddingMarker,
  isLayerMenuOpen,
  mapType,
  onSelectMapType,
  onToggleAddMarker,
  onToggleLayerMenu,
  panelOpen,
}) {
  const map = useMap();
  return (
    <div className={['map-tool-stack', panelOpen ? 'is-panel-open' : 'is-panel-closed'].join(' ')} aria-label="Map controls">
      <button type="button" onClick={() => map.zoomIn()} aria-label="Zoom in" data-tooltip="Zoom in">
        <ZoomIn size={22} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => map.zoomOut()} aria-label="Zoom out" data-tooltip="Zoom out">
        <ZoomOut size={22} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => map.flyTo(defaultCenter, defaultZoom)} aria-label="Recenter map" data-tooltip="Recenter map">
        <LocateFixed size={21} aria-hidden="true" />
      </button>
      <button
        className={isAddingMarker ? 'is-active' : ''}
        type="button"
        onClick={onToggleAddMarker}
        aria-label={isAddingMarker ? 'Cancel marker placement' : 'Add marker'}
        data-tooltip={isAddingMarker ? 'Click map to place marker' : 'Add marker'}
      >
        <MapPin size={21} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onToggleLayerMenu}
        aria-expanded={isLayerMenuOpen}
        aria-label="Choose map layer"
        data-tooltip="Map layers"
      >
        <Layers size={21} aria-hidden="true" />
      </button>
      {isLayerMenuOpen ? (
        <div className="map-layer-menu" aria-label="Map layer options">
          {Object.entries(mapTileLayers).map(([layerId]) => (
            <button
              className={mapType === layerId ? 'is-selected' : ''}
              key={layerId}
              type="button"
              onClick={() => onSelectMapType(layerId)}
            >
              {layerId === 'default' ? 'Default map' : 'Satellite map'}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// React component that listens for map click events and triggers marker creation
// Only processes clicks when the marker placement mode is active
function MapClickHandler({ isAddingMarker, onAddMarker }) {
  useMapEvents({
    click(event) {
      if (isAddingMarker) {
        onAddMarker(event.latlng);
      }
    },
  });

  return null;
}

// React component that tracks and reports map viewport changes to parent components
// Provides initial viewport data on mount and updates on every moveend event
function MapViewportTracker({ onViewportChange }) {
  const map = useMap();
  useEffect(() => {
    const center = map.getCenter();
    const bounds = map.getBounds();

    onViewportChange({
      center: [center.lat, center.lng],
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      },
    });
  }, [map, onViewportChange]);

  useMapEvents({
    moveend(event) {
      const mapInstance = event.target;
      const center = event.target.getCenter();
      const bounds = mapInstance.getBounds();

      onViewportChange({
        center: [center.lat, center.lng],
        bounds: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        },
      });
    },
  });

  return null;
}

function StarRating({ rating, size = 14 }) {
  const normalizedRating = Math.max(0, Math.min(Number(rating) || 0, 5));
  return (
    <div className="map-star-rating" aria-label={`${normalizedRating || 'No'} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fillPercent = Math.max(0, Math.min(normalizedRating - (star - 1), 1)) * 100;
        return (
          <span className="map-star" key={star} aria-hidden="true">
            <Star size={size} />
            <span style={{ width: `${fillPercent}%` }}>
              <Star size={size} fill="currentColor" />
            </span>
          </span>
        );
      })}
    </div>
  );
}

function PlaceDetails({
  categoryId,
  detailStatus,
  getConvertedPriceText,
  isFavorite,
  isSavingFavorite,
  onAddRoutePoint,
  onClearRoute,
  onCalculateRoute,
  onFavoriteToggle,
  onRenameCustomMarker,
  onRemove,
  onRemoveRoutePoint,
  place,
  route,
  routeMode,
  routePoints,
  routeResults,
  routeStatus,
  weather,
  weatherStatus,
  onRouteAlternativeChange,
  onRouteModeChange,
}) {
    // Retrieves the category configuration for the given categoryId, falling back to attractions if not found
  const category = categoryConfig[categoryId] || categoryConfig.attractions;
  // Extracts the icon component from the category configuration for rendering
  const CategoryIcon = category.icon;
  // Formats the raw place data into a standardized structure with consistent property names
  const details = formatCategoryPlace(place || {}, categoryId);
  // Determines the open/closed status from the place's open state or hours information
  const openStatus = getOpenStatus(details.openState || details.hours);
  // Gets the converted price text in the user's preferred currency if available
  const convertedPriceText = getConvertedPriceText(details);
  // Creates a comparison-ready item with normalized properties for the CompareButton component
  const compareItem = {
    ...details,
    category: category.label,
    source: 'map',
    price: getOriginalPriceText(details),
    hours: details.openState || details.hours || 'Opening hours unavailable',
    reviewCount: details.reviewCount || details.reviews,
    imageUrl: details.imageUrl,
  };
  return (
    <div className="map-place-details">
      {/* Image section with fallback placeholder and favorite toggle button */}
      <div className="map-detail-image-wrap">
        {details.imageUrl ? (
          <img className="map-detail-image" src={details.imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="map-detail-image map-detail-image-empty">
            <Image size={28} aria-hidden="true" />
          </div>
        )}
        <button
          className={`map-detail-favorite-button ${isFavorite ? 'active' : ''}`}
          type="button"
          aria-label={isFavorite ? `Remove ${details.name} from favourites` : `Add ${details.name} to favourites`}
          disabled={isSavingFavorite}
          onClick={() => onFavoriteToggle(details)}
        >
          {isSavingFavorite ? (
            <LoaderCircle className="map-spin" size={18} aria-hidden="true" />
          ) : (
            <Heart size={19} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Category badge displaying the category icon and label with color coding */}
      <div className="map-detail-category" style={{ '--detail-color': category.color }}>
        <CategoryIcon size={17} aria-hidden="true" />
        {category.label}
      </div>

      {/* Loading indicator shown while rich place details are being fetched */}
      {detailStatus === 'loading' ? (
        <p className="map-detail-loading">
          <LoaderCircle size={15} aria-hidden="true" />
          Loading richer place details...
        </p>
      ) : null}
      {/* Warning message displayed when enrichment fails or provides limited data */}
      {details.enrichmentMessage ? (
        <p className="map-detail-provider-warning" role="status">{details.enrichmentMessage}</p>
      ) : null}

      {/* Rating section showing star rating, numeric rating, and review count */}
      <div className="map-detail-rating">
        <StarRating rating={details.rating} size={17} />
        <strong>{details.rating && details.rating !== 'N/A' ? `${Number(details.rating).toFixed(1)} stars` : 'No rating'}</strong>
        <span className="map-detail-review-count">
          {Number(details.reviews) ? `${Number(details.reviews).toLocaleString()} reviews` : details.reviews}
        </span>
      </div>

      {/* Summary description of the place */}
      <p>{details.summary}</p>

      {/* Review highlights section showing up to 3 Google reviews with author and rating */}
      {details.reviewItems.length ? (
        <section className="map-review-list" aria-label="Google review highlights">
          <h3>Google review highlights</h3>
          {details.reviewItems.slice(0, 3).map((review) => (
            <article key={review.id}>
              <div>
                <strong>{review.author}</strong>
                <span>{review.rating ? `${Number(review.rating).toFixed(1)} stars` : review.date}</span>
              </div>
              <p>{review.text || 'No written review provided.'}</p>
            </article>
          ))}
        </section>
      ) : null}

      {/* Facts section displaying price information and operating hours with status badge */}
      <div className="map-detail-facts">
        <span>
          <DollarSign size={15} aria-hidden="true" />
          <span>
            <small>Original</small>
            <strong>{getOriginalPriceText(details)}</strong>
            {convertedPriceText ? <em>{convertedPriceText}</em> : null}
          </span>
        </span>
        <span>
          <Clock3 size={15} aria-hidden="true" />
          <span>
            <small>Working hour</small>
            <strong>{details.openState || details.hours || 'Opening hours unavailable'}</strong>
          </span>
          <mark className={`map-open-badge is-${openStatus.tone}`}>{openStatus.label}</mark>
        </span>
      </div>

      {/* Weather card showing current conditions and travel tip for the place location */}
      <section className="map-weather-card" aria-label={`${details.name} weather`}>
        <div>
          <CloudSun size={18} aria-hidden="true" />
          <strong>Weather near this place</strong>
        </div>
        {weatherStatus === 'loading' ? (
          <p>
            <LoaderCircle className="map-spin" size={15} aria-hidden="true" />
            Checking forecast...
          </p>
        ) : weather?.available ? (
          <>
            <div className="map-weather-main">
              <strong>{formatTemperature(weather.temperature?.mean)}</strong>
              <span>{weather.condition}</span>
            </div>
            <p>{weather.travelTip}</p>
          </>
        ) : (
          <p>{weather?.message || 'Weather appears when place coordinates are available.'}</p>
        )}
      </section>

      {/* Custom marker name editor that saves changes on blur or Enter key press */}
      {details.custom ? (
        <label className="map-custom-marker-name">
          <span>
            <SquarePen size={15} aria-hidden="true" />
            Marker name
          </span>
          <input
            type="text"
            defaultValue={details.name}
            onBlur={(event) => onRenameCustomMarker(details.id, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
        </label>
      ) : null}

      {/* Route planner section with stop management and multi-mode route calculation */}
      <section className="map-route-planner" aria-label="Route planner">
        <div className="map-route-header">
          <div>
            <strong>Route planner</strong>
            <span>{routePoints.length >= 2 ? `${routePoints.length} stops selected` : 'Add two or more stops'}</span>
          </div>
          <button type="button" onClick={onClearRoute} disabled={!routePoints.length && !route}>
            Clear
          </button>
        </div>

        <div className="map-route-actions">
          <CompareButton item={compareItem} label="Compare" className="map-compare-action" />
          <button type="button" onClick={() => onAddRoutePoint(details)}>
            <Navigation size={16} aria-hidden="true" />
            Add stop
          </button>
          <button
            type="button"
            onClick={() => onAddRoutePoint(details, { calculateFromUserLocation: true })}
            disabled={routeStatus === 'loading'}
          >
            <Navigation size={16} aria-hidden="true" />
            From my location
          </button>
          <button
            className="map-route-primary"
            type="button"
            onClick={onCalculateRoute}
            disabled={routeStatus === 'loading' || routePoints.length < 2}
          >
            {routeStatus === 'loading' ? <LoaderCircle className="map-spin" size={16} aria-hidden="true" /> : <Navigation size={16} aria-hidden="true" />}
            {routeStatus === 'loading' ? 'Checking routes' : 'Compare all modes'}
          </button>
        </div>

        {/* List of selected route stops with order numbers and remove buttons */}
        <div className="map-route-point-list">
          {routePoints.map((point, index) => (
            <div className="map-route-point" key={`${point.id}-${index}`}>
              <span>{index + 1}</span>
              <strong>{point.name}</strong>
              <button
                type="button"
                onClick={() => onRemoveRoutePoint(index)}
                aria-label={`Remove ${point.name} from route`}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
          {!routePoints.length ? (
            <p>No route stops selected yet.</p>
          ) : null}
        </div>

        {/* Grid of route mode options showing duration, distance, and status for each mode */}
        <div className="map-route-mode-grid" aria-label="Route options">
          {routeModeOptions.map((mode) => {
            const modeRoute = routeResults[mode.id];
            const isActive = routeMode === mode.id;
            return (
              <button
                className={isActive ? 'is-active' : ''}
                key={mode.id}
                type="button"
                onClick={() => onRouteModeChange(mode.id)}
                disabled={!modeRoute}
              >
                <strong>{mode.label}</strong>
                <span>{modeRoute ? formatDuration(modeRoute.durationSeconds) : '--'}</span>
                <small>{modeRoute ? formatDistance(modeRoute.distanceMeters) : getRouteModeNote(modeRoute)}</small>
                {modeRoute ? <em>{getRouteModeNote(modeRoute)}</em> : null}
              </button>
            );
          })}
        </div>
        {/* Alternative routes section showing different route options with rankings and characteristics */}
        {route?.alternatives?.length ? (
          <div className="map-route-alternatives" aria-label={`${routeMode} route alternatives`}>
            <strong>Possible {routeMode} routes</strong>
            {route.alternatives.map((alternative) => (
              <button
                className={route.id === alternative.id ? 'is-active' : ''}
                key={alternative.id}
                type="button"
                onClick={() => onRouteAlternativeChange(alternative)}
              >
                <span>Route {alternative.rank}</span>
                <small>{formatDistance(alternative.distanceMeters)} · {formatDuration(alternative.durationSeconds)}</small>
                <em>
                  {[
                    alternative.isBest ? 'Best balance' : '',
                    alternative.isShortest ? 'Shortest' : '',
                    alternative.isFastest ? 'Fastest' : '',
                  ].filter(Boolean).join(' · ') || 'Alternative'}
                </em>
              </button>
            ))}
            {route.message ? <p>{route.message}</p> : null}
          </div>
        ) : null}
      </section>

      <dl>
        <div>
          <dt>
            <Clock3 size={15} aria-hidden="true" />
            Business hours
          </dt>
          <dd>{details.hours}</dd>
        </div>
        {details.phone ? (
          <div>
            <dt>Phone</dt>
            <dd>{details.phone}</dd>
          </div>
        ) : null}
        <div>
          <dt>
            <MapPin size={15} aria-hidden="true" />
            Address
          </dt>
          <dd>{details.address || details.displayName}</dd>
        </div>
      </dl>

      {details.custom ? (
        <button className="map-remove-marker-button" type="button" onClick={() => onRemove(details.id)}>
          <Trash2 size={16} aria-hidden="true" />
          Remove marker
        </button>
      ) : null}
    </div>
  );
}

// Main map page component that orchestrates all map functionality including search, markers, and routing
function MapPage() {
  // Retrieves the currency context for price conversions and display
  const currency = useContext(CurrencyContext);
  // Accesses the current location state passed from navigation
  const location = useLocation();
  // Extracts a selected favorite from the location state if present
  const selectedFavorite = location.state?.selectedFavorite;
  // Converts the selected favorite to a map place format, memoized to prevent recalculation
  const initialFavoritePlace = useMemo(
    () => (selectedFavorite ? favoriteToMapPlace(selectedFavorite) : null),
    [selectedFavorite]
  );
  // Reference set tracking which place details have already been loaded to prevent duplicate requests
  const loadedPlaceDetailsRef = useRef(new Set());
  // Cache map for storing weather data by place and date to reduce API calls
  const placeWeatherCacheRef = useRef(new Map());
  // State for the search query input
  const [query, setQuery] = useState(selectedFavorite?.title || selectedFavorite?.location?.address || 'Penang');
  // State for the destination label used in search contexts
  const [mapDestination, setMapDestination] = useState(selectedFavorite?.location?.address || selectedFavorite?.title || 'Penang');
  // State for the list of active category filters
  const [activeCategories, setActiveCategories] = useState(initialFavoritePlace ? [initialFavoritePlace.categoryId] : []);
  // State storing all category search results keyed by category ID
  const [categoryResults, setCategoryResults] = useState({});
  // State for search suggestions displayed in the autocomplete dropdown
  const [suggestions, setSuggestions] = useState([]);
  // State controlling whether the suggestion dropdown is open
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  // State for custom markers created by the user, initialized from localStorage
  const [customMarkers, setCustomMarkers] = useState(() => loadUserMarkers());
  // State controlling whether the side panel is open or closed
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  // State tracking whether marker placement mode is active
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  // State controlling whether the layer selection menu is open
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  // State for the current map tile layer type (default or satellite)
  const [mapType, setMapType] = useState('default');
  // State for the current map center coordinates
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  // State for the current map bounds
  const [mapBounds, setMapBounds] = useState(null);
  // State for the currently selected place object
  const [selectedPlace, setSelectedPlace] = useState(
    hasMapCoordinates(initialFavoritePlace) ? initialFavoritePlace : categoryPanelPlace
  );
  // State for the user's geolocation, defaults to fallback location
  const [userLocation, setUserLocation] = useState(fallbackUserLocation);
  // State for the current route object
  const [route, setRoute] = useState(null);
  // State for the current selected route mode (car, walking, bike, train, plane)
  const [routeMode, setRouteMode] = useState('car');
  // State for the list of route points/stops
  const [routePoints, setRoutePoints] = useState([]);
  // State for route results for each mode type
  const [routeResults, setRouteResults] = useState({});
  // State for the route calculation status
  const [routeStatus, setRouteStatus] = useState('idle');
  // State for price conversion results keyed by item
  const [priceConversions, setPriceConversions] = useState({});
  // State for the status of loading place details
  const [placeDetailStatus, setPlaceDetailStatus] = useState('idle');
  // State for the weather data of the selected place
  const [placeWeather, setPlaceWeather] = useState(null);
  // State for the weather loading status
  const [placeWeatherStatus, setPlaceWeatherStatus] = useState('idle');
  // State for the general API request status
  const [status, setStatus] = useState('idle');
  // State for general messages displayed to the user
  const [message, setMessage] = useState('');
  // State controlling whether the favorite marker label is visible
  const [isFavoriteMarkerLabelVisible, setIsFavoriteMarkerLabelVisible] = useState(Boolean(selectedFavorite));
  // State for the list of favorites fetched from the API
  const [favorites, setFavorites] = useState(() => (selectedFavorite?._id ? [selectedFavorite] : []));
  // State tracking which favorite is currently being saved
  const [savingFavoriteKey, setSavingFavoriteKey] = useState('');
  // State for triggering a map reset when a favorite is selected
  const [favoriteMapResetCount, setFavoriteMapResetCount] = useState(0);

  // Derived values for panel mode and selected category
  const panelMode = selectedPlace?.panelMode || 'category';
  const selectedCategory = selectedPlace?.categoryId || activeCategories[0] || 'attractions';
  // Comma-separated labels for active categories for display purposes
  const selectedCategoryLabels = activeCategories.length
    ? activeCategories.map((categoryId) => categoryConfig[categoryId].label).join(', ')
    : 'No categories selected';

  // Memoized calculation of all markers visible on the map
  const visibleMarkers = useMemo(() => {
    const selectedCategoryPlaces = activeCategories.flatMap((categoryId) => categoryResults[categoryId] || []);
    const mapPlaces = [...selectedCategoryPlaces, ...customMarkers];
    const isSelectedCategoryMarker = mapPlaces.some((place) => place.id === selectedPlace?.id);

    if (panelMode === 'place' && selectedPlace?.lat && selectedPlace?.lng && !isSelectedCategoryMarker) {
      return [selectedPlace, ...mapPlaces];
    }

    return mapPlaces;
  }, [activeCategories, categoryResults, customMarkers, panelMode, selectedPlace]);

  // Memoized object of visible category results excluding custom and saved categories
  const visibleCategoryResults = useMemo(() => (
    Object.fromEntries(
      activeCategories
        .filter((categoryId) => categoryId !== 'custom' && categoryId !== 'saved')
        .map((categoryId) => [categoryId, categoryResults[categoryId] || []])
    )
  ), [activeCategories, categoryResults]);

  // Memoized array of category result groups for panel display
  const categoryResultGroups = useMemo(
    () => activeCategories.map((categoryId) => ({
      categoryId,
      places: categoryId === 'custom' ? customMarkers : visibleCategoryResults[categoryId] || [],
    })),
    [activeCategories, customMarkers, visibleCategoryResults]
  );
  // Total count of category results
  const categoryResultCount = categoryResultGroups.reduce(
    (total, group) => total + group.places.length,
    0
  );
  // Active tile layer configuration based on selected map type
  const activeTileLayer = mapTileLayers[mapType];
  // Selected currency from context
  const selectedCurrency = currency?.selectedCurrency || 'USD';
  // List of supported currency codes from context
  const supportedCurrencyCodes = useMemo(() => currency?.currencies?.map((option) => option.code) || [], [currency?.currencies]);
  // Destructured selected place properties for cleaner code below
  const selectedPlaceId = selectedPlace?.id;
  const selectedPlaceFoursquareId = selectedPlace?.foursquarePlaceId;
  const selectedPlaceGoogleId = selectedPlace?.placeId;
  const selectedPlaceDataId = selectedPlace?.dataId;
  const selectedPlaceName = selectedPlace?.name;
  const selectedPlaceCategoryId = selectedPlace?.categoryId;
  const selectedPlaceAddress = selectedPlace?.address || selectedPlace?.displayName;
  const selectedPlaceLat = selectedPlace?.lat;
  const selectedPlaceLng = selectedPlace?.lng;
  const selectedPlaceIsCustom = selectedPlace?.custom;
  const selectedPlaceHasRichDetails = hasRichPlaceDetails(selectedPlace);
  // Lookup object for quickly checking if a place is in favorites
  const favoriteLookup = useMemo(() => buildFavoriteLookup(favorites), [favorites]);
  // Creates a favorite payload for the selected place if applicable
  const selectedPlaceFavoritePayload = useMemo(() => {
    if (panelMode !== 'place' || !selectedPlace?.name) return null;

    const favoriteType = selectedPlace.categoryId === 'custom' ? 'location' : selectedPlace.categoryId;
    return buildPlaceFavoritePayload({
      item: {
        ...selectedPlace,
        coordinates: {
          latitude: selectedPlace.lat,
          longitude: selectedPlace.lng,
        },
      },
      type: favoriteType,
      originalPriceText: getOriginalPriceText(selectedPlace),
      visitedSource: 'map',
    });
  }, [panelMode, selectedPlace]);
  // Key for the selected place in the favorite lookup
  const selectedPlaceFavoriteKey = selectedPlaceFavoritePayload ? getFavoriteKey(selectedPlaceFavoritePayload) : '';
  // Favorite record for the selected place if it exists
  const selectedPlaceFavoriteRecord = selectedPlaceFavoriteKey ? favoriteLookup[selectedPlaceFavoriteKey] : null;

  // Effect to fetch favorites from the API on component mount
  useEffect(() => {
    let isActive = true;

    getFavorites()
      .then((response) => {
        if (isActive) setFavorites(response.data?.data?.favorites || []);
      })
      .catch(() => {
        if (isActive && !selectedFavorite?._id) setFavorites([]);
      });

    return () => {
      isActive = false;
    };
  }, [selectedFavorite?._id]);

  // Effect to resolve a selected favorite's location if coordinates are missing
  useEffect(() => {
    if (!selectedFavorite || hasMapCoordinates(initialFavoritePlace)) return undefined;

    const favoritePlace = initialFavoritePlace;

    const controller = new AbortController();
    const resolveFavoriteLocation = async () => {
      try {
        const searchText = selectedFavorite.location?.address || selectedFavorite.title;
        const places = await searchOpenStreetMapPlaces(searchText, { limit: 1, signal: controller.signal });
        const resolvedPlace = places[0];

        if (resolvedPlace) {
          setSelectedPlace(formatCategoryPlace({
            ...resolvedPlace,
            name: selectedFavorite.title || resolvedPlace.name,
            summary: selectedFavorite.description || resolvedPlace.summary,
            rating: selectedFavorite.rating || resolvedPlace.rating,
            price: selectedFavorite.priceLevel || resolvedPlace.price,
            favoriteOrigin: true,
            zoom: 17,
          }, favoritePlace.categoryId));
          return;
        }

        setMessage('This saved favourite does not have enough location information to show on the map.');
        setStatus('error');
      } catch (error) {
        if (!isCanceledRequest(error)) {
          setMessage('Unable to locate this saved favourite on the map right now.');
          setStatus('error');
        }
      }
    };

    resolveFavoriteLocation();
    return () => controller.abort();
  }, [initialFavoritePlace, selectedFavorite]);

  // Callback for handling viewport changes from the map component
  const handleViewportChange = useCallback((viewport) => {
    setMapCenter(viewport.center);
    setMapBounds(viewport.bounds);
  }, [setMapBounds, setMapCenter]);

  // Effect for debounced search suggestions based on query input
  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      return undefined;
    }

    const controller = new AbortController();
    const timerId = window.setTimeout(async () => {
      try {
        const places = await searchOpenStreetMapPlaces(trimmedQuery, {
          limit: 5,
          signal: controller.signal,
        });
        setSuggestions(places);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSuggestions([]);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timerId);
      controller.abort();
    };
  }, [query]);

  // Effect to watch the user's geolocation with watchPosition API
  useEffect(() => {
    if (!navigator.geolocation) {
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          isFallback: false,
        });
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Effect to fetch category results when active categories or map viewport changes
  useEffect(() => {
    const searchableCategories = activeCategories.filter((categoryId) => (
      categoryId !== 'saved' && categoryId !== 'custom'
    ));

    if (!searchableCategories.length) {
      return undefined;
    }

    const controller = new AbortController();
    const timerId = window.setTimeout(async () => {
      setStatus('loading');
      setMessage('Loading places with live map details...');

      try {
        const results = await Promise.allSettled(
          searchableCategories.map(async (categoryId) => {
            const resultLimit = categoryId === 'attractions' || categoryId === 'shopping' ? 60 : 30;
            let places = [];
            let providerMessage;

            try {
              const mapPlaces = await searchMapCategoryPlaces(categoryId, mapCenter, {
                destination: mapDestination,
                limit: resultLimit,
                signal: controller.signal,
              });
              places = mapPlaces.available ? mapPlaces.items || [] : [];
              providerMessage = mapPlaces.message || '';
            } catch (error) {
              if (isCanceledRequest(error)) {
                throw error;
              }

              providerMessage = error.message || '';
            }

            if (!places.length) {
              try {
                places = await searchOpenStreetMapCategoryPlaces(categoryId, mapCenter, {
                  bounds: mapBounds,
                  limit: resultLimit,
                  signal: controller.signal,
                });
              } catch (error) {
                if (isCanceledRequest(error)) {
                  throw error;
                }

                places = [];
              }
            }

            return [categoryId, places.map((place) => formatCategoryPlace(place, categoryId)), providerMessage];
          })
        );

        if (controller.signal.aborted) {
          return;
        }

        const completedResults = results.filter((result) => result.status === 'fulfilled');
        const canceledResult = results.find((result) => result.status === 'rejected' && isCanceledRequest(result.reason));

        if (canceledResult) {
          return;
        }

        setCategoryResults((currentResults) => {
          const nextResults = {};
          const resultEntries = Object.fromEntries(completedResults.map((result) => result.value));

          activeCategories.forEach((categoryId) => {
            if (categoryId === 'custom' || categoryId === 'saved') {
              return;
            }

            const refreshedPlaces = resultEntries[categoryId];
            const existingPlaces = currentResults[categoryId] || [];

            nextResults[categoryId] = refreshedPlaces?.length
              ? refreshedPlaces.map((place) => {
                  const existingPlace = existingPlaces.find((candidate) => candidate.id === place.id);
                  return existingPlace ? mergePreservingRichPlace(existingPlace, place) : place;
                })
              : existingPlaces;
          });

          return nextResults;
        });

        const loadedPlaceCount = completedResults.reduce((total, result) => total + result.value[1].length, 0);

        if (loadedPlaceCount) {
          setStatus('success');
          setMessage('');
        } else if (completedResults.length) {
          setStatus('success');
          setMessage('');
        } else {
          setStatus('empty');
          const providerMessage = completedResults.map((result) => result.value[2]).find(Boolean);
          setMessage(providerMessage || 'Map markers are temporarily unavailable. Try again shortly.');
        }
      } catch (error) {
        if (!isCanceledRequest(error)) {
          setStatus('error');
          setMessage('Map markers are temporarily unavailable. Existing markers are kept when possible.');
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timerId);
      controller.abort();
    };
  }, [activeCategories, mapBounds, mapCenter, mapDestination]);

  // Effect to persist custom markers to localStorage whenever they change
  useEffect(() => {
    saveUserMarkers(customMarkers);
  }, [customMarkers]);

  // Effect to handle currency conversion for price display on visible markers
  useEffect(() => {
    const convertibleItems = visibleMarkers.filter((item) => {
      const detail = item.priceDetail;
      return (
        detail?.currency &&
        detail.amount !== null &&
        !detail.isTier &&
        detail.currency !== selectedCurrency &&
        supportedCurrencyCodes.includes(detail.currency) &&
        supportedCurrencyCodes.includes(selectedCurrency)
      );
    });

    if (!convertibleItems.length) {
      return undefined;
    }

    const missingItems = convertibleItems.filter((item) => !priceConversions[getPriceConversionKey(item, selectedCurrency)]);

    if (!missingItems.length) {
      return undefined;
    }

    let isActive = true;

    Promise.all(
      missingItems.map(async (item) => {
        const detail = item.priceDetail;
        const key = getPriceConversionKey(item, selectedCurrency);

        try {
          const response = await convertCurrency({
            amount: detail.amount,
            from: detail.currency,
            to: selectedCurrency,
          });
          const conversion = response.data.data.conversion;
          const convertedMaxAmount =
            detail.maxAmount !== null && conversion.rate
              ? Number((detail.maxAmount * conversion.rate).toFixed(2))
              : null;

          return {
            key,
            value: {
              amount: conversion.convertedAmount,
              maxAmount: convertedMaxAmount,
              currency: selectedCurrency,
            },
          };
        } catch {
          return {
            key,
            value: null,
          };
        }
      })
    ).then((results) => {
      if (!isActive) return;
      setPriceConversions((currentConversions) => ({
        ...currentConversions,
        ...Object.fromEntries(results.map((result) => [result.key, result.value])),
      }));
    });

    return () => {
      isActive = false;
    };
  }, [priceConversions, selectedCurrency, supportedCurrencyCodes, visibleMarkers]);

  // Effect to fetch rich place details when a place is selected
  useEffect(() => {
    if (panelMode !== 'place' || !selectedPlaceName || selectedPlaceIsCustom) {
      return undefined;
    }

    const detailsKey = getPlaceRequestKey(selectedPlaceId, selectedPlaceLat, selectedPlaceLng);

    if (loadedPlaceDetailsRef.current.has(detailsKey) && selectedPlaceHasRichDetails) {
      return undefined;
    }

    const controller = new AbortController();
    const detailsRequest = {
      id: selectedPlaceId,
      foursquarePlaceId: selectedPlaceFoursquareId,
      placeId: selectedPlaceGoogleId,
      dataId: selectedPlaceDataId,
      name: selectedPlaceName,
      categoryId: selectedPlaceCategoryId,
      address: selectedPlaceAddress,
      lat: selectedPlaceLat,
      lng: selectedPlaceLng,
    };

    const loadPlaceDetails = async () => {
      setPlaceDetailStatus('loading');

      try {
        const details = await getMapPlaceDetails(detailsRequest, { signal: controller.signal });

        if (!controller.signal.aborted && details.available && details.item) {
          const formattedDetails = formatCategoryPlace(
            details.item,
            selectedPlaceCategoryId || detailsRequest.categoryId
          );
          if (hasRichPlaceDetails(formattedDetails)) {
            loadedPlaceDetailsRef.current.add(detailsKey);
          }
          setSelectedPlace((currentPlace) => (
            currentPlace?.id === detailsRequest.id
              ? {
                  ...currentPlace,
                  ...formattedDetails,
                  id: currentPlace.id,
                  panelMode: 'place',
                  zoom: currentPlace.zoom,
                }
              : currentPlace
          ));
          setCategoryResults((currentResults) => ({
            ...currentResults,
            [detailsRequest.categoryId]: (currentResults[detailsRequest.categoryId] || []).map((place) => (
              place.id === detailsRequest.id
                ? mergePreservingRichPlace(place, formattedDetails)
                : place
            )),
          }));
        }
        setPlaceDetailStatus(details.item?.detailSource === 'serpapi' ? 'success' : 'error');
      } catch (error) {
        if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
          setPlaceDetailStatus('error');
        }
      }
    };

    loadPlaceDetails();

    return () => controller.abort();
  }, [
    panelMode,
    selectedPlaceAddress,
    selectedPlaceCategoryId,
    selectedPlaceDataId,
    selectedPlaceFoursquareId,
    selectedPlaceGoogleId,
    selectedPlaceId,
    selectedPlaceIsCustom,
    selectedPlaceLat,
    selectedPlaceLng,
    selectedPlaceName,
    selectedPlaceHasRichDetails,
  ]);

  // Effect to fetch weather data for the selected place
  useEffect(() => {
    if (panelMode !== 'place' || !selectedPlaceName || !selectedPlaceLat || !selectedPlaceLng) {
      return undefined;
    }

    const weatherKey = `${getPlaceRequestKey(selectedPlaceId, selectedPlaceLat, selectedPlaceLng)}:${getDateKey()}`;
    const cachedWeather = placeWeatherCacheRef.current.get(weatherKey);

    if (cachedWeather) {
      window.queueMicrotask(() => {
        setPlaceWeather(cachedWeather);
        setPlaceWeatherStatus(cachedWeather.available ? 'success' : 'error');
      });
      return undefined;
    }

    const controller = new AbortController();
    const weatherRequest = {
      id: selectedPlaceId,
      destination: selectedPlaceName,
      date: getDateKey(),
      latitude: selectedPlaceLat,
      longitude: selectedPlaceLng,
      locationLabel: selectedPlaceName,
    };

    const loadPlaceWeather = async () => {
      setPlaceWeatherStatus('loading');

      try {
        const weather = await getMapWeather(
          weatherRequest,
          { signal: controller.signal }
        );

        if (!controller.signal.aborted) {
          placeWeatherCacheRef.current.set(weatherKey, weather);
          setPlaceWeather(weather);
          setPlaceWeatherStatus(weather.available ? 'success' : 'error');
        }
      } catch (error) {
        if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
          const fallbackWeather = {
            available: false,
            message:
              error.response?.status === 429
                ? 'Weather is paused for a moment because map data requests are busy. Try this place again shortly.'
                : error.response?.data?.message || error.message || 'Weather temporarily unavailable',
          };

          placeWeatherCacheRef.current.set(weatherKey, fallbackWeather);
          setPlaceWeather(fallbackWeather);
          setPlaceWeatherStatus('error');
        }
      }
    };

    loadPlaceWeather();

    return () => controller.abort();
  }, [
    panelMode,
    selectedPlaceId,
    selectedPlaceLat,
    selectedPlaceLng,
    selectedPlaceName,
  ]);

  // Handler for executing a search with the current query
  const handleSearch = async (event) => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setStatus('error');
      setMessage('Enter at least 2 characters to search.');
      return;
    }

    setStatus('loading');
    setMessage('Searching OpenStreetMap...');

    try {
      const places = await searchOpenStreetMapPlaces(trimmedQuery, { limit: 1 });

      if (!places.length) {
        setStatus('empty');
        setMessage('No matching places found.');
        return;
      }

      const place = places[0];
      const nextCategory = inferCategoryFromSearch(trimmedQuery, place);

      setSelectedPlace({
        ...formatCategoryPlace(place, nextCategory),
        address: place.displayName,
        categoryId: nextCategory,
        zoom: isCountryResult(place) ? 6 : 13,
        panelMode: 'place',
      });
      setMapCenter([place.lat, place.lng]);
      setMapDestination(place.name);
      setStatus('success');
      setMessage('');
      setSuggestions([]);
      setIsSuggestionOpen(false);
      setIsPanelOpen(true);
      setPlaceWeather(null);
      setPlaceWeatherStatus('idle');
      setPlaceDetailStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Unable to search this location.');
    }
  };

  // Handler for toggling a category filter on or off
  const handleSelectCategory = (categoryId) => {
    setActiveCategories((currentCategories) => {
      if (currentCategories.includes(categoryId)) {
        return currentCategories.filter((currentCategory) => currentCategory !== categoryId);
      }

      return [...currentCategories, categoryId];
    });
    setSelectedPlace((currentPlace) => ({
      ...categoryPanelPlace,
      lat: currentPlace?.lat || mapCenter[0],
      lng: currentPlace?.lng || mapCenter[1],
      panelMode: 'category',
    }));
    setIsPanelOpen(true);
    setStatus('idle');
    setMessage('');
    setPlaceWeather(null);
    setPlaceWeatherStatus('idle');
    setPlaceDetailStatus('idle');
  };

  // Handler for selecting a marker from the map or results list
  const handleSelectMarker = (marker) => {
    setSelectedPlace((currentPlace) => ({
      ...(
        currentPlace?.id === marker.id
          ? mergePreservingRichPlace(currentPlace, marker)
          : marker
      ),
      panelMode: 'place',
      zoom: 14,
    }));
    setMapCenter([marker.lat, marker.lng]);
    setQuery(marker.name);
    setStatus('success');
    setMessage('');
    setIsSuggestionOpen(false);
    setIsPanelOpen(true);
    setPlaceWeather(null);
    setPlaceWeatherStatus('idle');
    setPlaceDetailStatus('idle');
  };

  // Closing a favourite-origin detail returns only that navigation path to the normal default map view.
  const handleCloseDestinationPanel = () => {
    if (selectedPlace?.favoriteOrigin) {
      setIsFavoriteMarkerLabelVisible(false);
      setSelectedPlace(categoryPanelPlace);
      setActiveCategories([]);
      setQuery('Penang');
      setMapDestination('Penang');
      setStatus('idle');
      setMessage('');
      setFavoriteMapResetCount((currentCount) => currentCount + 1);
    }

    setIsPanelOpen(false);
  };

  // Map favourites use the shared favourites API and remain separate from local custom marker storage.
  const handleFavoriteToggle = async (place) => {
    const favoriteType = place.categoryId === 'custom' ? 'location' : place.categoryId;
    const payload = buildPlaceFavoritePayload({
      item: {
        ...place,
        coordinates: {
          latitude: place.lat,
          longitude: place.lng,
        },
      },
      type: favoriteType,
      originalPriceText: getOriginalPriceText(place),
      visitedSource: 'map',
    });
    const favoriteKey = getFavoriteKey(payload);
    const existingFavorite = favoriteLookup[favoriteKey];

    if (!favoriteKey || savingFavoriteKey) return;

    setSavingFavoriteKey(favoriteKey);
    setMessage('');
    try {
      if (existingFavorite?._id) {
        await removeFavorite(existingFavorite._id);
        setFavorites((currentFavorites) => currentFavorites.filter((favorite) => favorite._id !== existingFavorite._id));
        setStatus('success');
        setMessage(`${place.name} was removed from favourites.`);
        return;
      }

      const response = await addFavorite(payload);
      const savedFavorite = response.data?.data?.favorite;
      if (savedFavorite) {
        setFavorites((currentFavorites) => [
          savedFavorite,
          ...currentFavorites.filter((favorite) => favorite._id !== savedFavorite._id),
        ]);
      }
      setStatus('success');
      setMessage(`${place.name} was saved to favourites.`);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Unable to update this favourite right now.');
    } finally {
      setSavingFavoriteKey('');
    }
  };

  const calculateRoute = async (points = routePoints) => {
    if (points.length < 2) {
      setStatus('error');
      setMessage('Add at least two route points.');
      return;
    }

    setRouteStatus('loading');
    setStatus('loading');
    setMessage('Comparing route options...');

    try {
      const routeEntries = await Promise.all(
        routeModeOptions.map(async (mode) => {
          try {
            const routeDetails = await getRouteBetweenPlaces(points, null, { mode: mode.id });

            return [mode.id, { ...routeDetails, points }];
          } catch {
            return [mode.id, null];
          }
        })
      );
      const nextRouteResults = Object.fromEntries(routeEntries.filter(([, modeRoute]) => modeRoute));
      const preferredRoute = nextRouteResults[routeMode] || nextRouteResults.car || Object.values(nextRouteResults)[0] || null;

      setRouteResults(nextRouteResults);
      setRoute(preferredRoute);
      setRouteStatus('success');
      setStatus('success');
      setMessage('');
    } catch (error) {
      setRoute(null);
      setRouteResults({});
      setRouteStatus('error');
      setStatus('error');
      setMessage(error.message || 'Unable to calculate route.');
    }
  };

    // Handler for adding a place as a stop in the route planner
  // Accepts optional configuration to calculate from the user's current location
  const handleAddRoutePoint = (place, options = {}) => {
    // Validates that the place has valid coordinates before adding to route
    if (!place?.lat || !place?.lng) {
      setStatus('error');
      setMessage('Select a valid place before adding it to the route.');
      return;
    }

    // Creates a standardized route point object from the place data
    const routePoint = {
      id: place.id,
      name: place.name,
      lat: place.lat,
      lng: place.lng,
    };
    // Builds the next route points array, optionally prepending the user's location
    const nextPoints = options.calculateFromUserLocation
      ? [
        {
          id: userLocation.id,
          name: userLocation.isFallback ? 'Default location' : 'My location',
          lat: userLocation.lat,
          lng: userLocation.lng,
        },
        routePoint,
      ]
      : [...routePoints, routePoint];

    // Updates the route points state and clears any existing route results
    setRoutePoints(nextPoints);
    setRoute(null);
    setRouteResults({});

    // Automatically calculates the route if starting from user location
    if (options.calculateFromUserLocation) {
      calculateRoute(nextPoints);
    }
  };

  // Handler that triggers route calculation with the current route points
  const handleCalculateRoute = () => {
    calculateRoute(routePoints);
  };

  // Clears all route data, points, and resets the route status
  const handleClearRoute = () => {
    setRoute(null);
    setRouteResults({});
    setRoutePoints([]);
    setRouteStatus('idle');
  };

  // Removes a specific route point by index and clears related route data
  const handleRemoveRoutePoint = (pointIndex) => {
    setRoutePoints((points) => points.filter((_, index) => index !== pointIndex));
    setRoute(null);
    setRouteResults({});
    setRouteStatus('idle');
    setMessage('');
  };

  // Switches the active route mode and updates the displayed route
  const handleRouteModeChange = (nextMode) => {
    setRouteMode(nextMode);
    setRoute(routeResults[nextMode] || route);
  };
  
  // Switches to an alternative route within the current mode
  const handleRouteAlternativeChange = (alternative) => {
    const modeRoute = routeResults[routeMode];

    setRoute({
      ...alternative,
      alternatives: modeRoute?.alternatives || [],
      estimated: modeRoute?.estimated,
      message: modeRoute?.message,
      mode: routeMode,
      points: modeRoute?.points || routePoints,
      provider: modeRoute?.provider,
    });
  };

  // Adds a custom marker at the clicked map coordinates
  const handleAddCustomMarker = (latlng) => {
    const markerNumber = customMarkers.length + 1;
    const nextMarker = {
      id: `custom-marker-${Date.now()}`,
      name: `My marker ${markerNumber}`,
      address: `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`,
      hours: 'Custom marker',
      rating: 'Custom',
      reviews: 'Personal place',
      summary: 'A custom place added to the travel map.',
      lat: latlng.lat,
      lng: latlng.lng,
      categoryId: 'custom',
      custom: true,
      panelMode: 'place',
      zoom: 14,
    };

    // Adds the new marker to the custom markers list and selects it
    setCustomMarkers((markers) => [...markers, nextMarker]);
    setSelectedPlace(nextMarker);
    setMapCenter([nextMarker.lat, nextMarker.lng]);
    setQuery(nextMarker.name);
    setMessage('');
    setStatus('success');
    setIsAddingMarker(false);
    setIsPanelOpen(true);
    setPlaceWeather(null);
    setPlaceWeatherStatus('idle');
    setPlaceDetailStatus('idle');
  };

  // Removes a custom marker and cleans up any associated route data
  const handleRemoveCustomMarker = (markerId) => {
    setCustomMarkers((markers) => markers.filter((marker) => marker.id !== markerId));
    setRoute((currentRoute) => (
      currentRoute?.points?.some((point) => point.id === markerId) ? null : currentRoute
    ));
    setRouteResults((currentResults) => (
      Object.values(currentResults).some((modeRoute) => modeRoute?.points?.some((point) => point.id === markerId))
        ? {}
        : currentResults
    ));
    setRoutePoints((points) => points.filter((point) => point.id !== markerId));
    setSelectedPlace((currentPlace) => (
      currentPlace?.id === markerId
        ? categoryPanelPlace
        : currentPlace
    ));
  };

  // Renames a custom marker and updates all references including route points
  const handleRenameCustomMarker = (markerId, nextName) => {
    const trimmedName = nextName.trim();

    if (!trimmedName) {
      return;
    }

    setCustomMarkers((markers) => markers.map((marker) => (
      marker.id === markerId ? { ...marker, name: trimmedName } : marker
    )));
    setRoutePoints((points) => points.map((point) => (
      point.id === markerId ? { ...point, name: trimmedName } : point
    )));
    setSelectedPlace((currentPlace) => (
      currentPlace?.id === markerId
        ? { ...currentPlace, name: trimmedName }
        : currentPlace
    ));
  };

  // Handles selection of a suggestion from the search autocomplete dropdown
  const handleSelectSuggestion = (place) => {
    const nextCategory = inferCategoryFromSearch(query, place);

    setSelectedPlace({
      ...formatCategoryPlace(place, nextCategory),
      address: place.displayName,
      categoryId: nextCategory,
      zoom: isCountryResult(place) ? 6 : 13,
      panelMode: 'place',
    });
    setMapCenter([place.lat, place.lng]);
    setMapDestination(place.name);
    setQuery(place.name);
    setSuggestions([]);
    setIsSuggestionOpen(false);
    setStatus('success');
    setMessage('');
    setIsPanelOpen(true);
    setPlaceWeather(null);
    setPlaceWeatherStatus('idle');
    setPlaceDetailStatus('idle');
  };

  // Memoized function that formats converted price text for display
  // Returns an empty string if no conversion is needed or available
  const getConvertedPriceText = useCallback(
    (item) => {
      const detail = item.priceDetail;

      if (!detail?.currency || detail.amount === null || detail.isTier) {
        return '';
      }

      if (detail.currency === selectedCurrency) {
        return '';
      }

      const convertedPrice = priceConversions[getPriceConversionKey(item, selectedCurrency)];

      if (!convertedPrice) {
        return '';
      }

      const convertedAmount = formatMoney(convertedPrice.amount, convertedPrice.currency);
      const convertedMaxAmount =
        convertedPrice.maxAmount !== null ? ` - ${formatMoney(convertedPrice.maxAmount, convertedPrice.currency)}` : '';

      return `Approx. ${convertedAmount}${convertedMaxAmount}`;
    },
    [priceConversions, selectedCurrency]
  );

  // Main render function for the MapPage component
  return (
    <section className="map-page map-discovery-page" aria-labelledby="map-page-title">
      {/* Top overlay containing search bar and category filters */}
      <div className="map-overlay-top">
        {/* Search form with autocomplete suggestions */}
        <form className="map-search-card" onSubmit={handleSearch}>
          <label htmlFor="map-search-input" className="sr-only">Search destination</label>
          <Search size={17} aria-hidden="true" />
          <input
            id="map-search-input"
            name="destination"
            type="text"
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              if (nextQuery.trim().length < 2) {
                setSuggestions([]);
              }
              setIsSuggestionOpen(true);
            }}
            onFocus={() => setIsSuggestionOpen(true)}
            placeholder="Search country, city, place, or restaurant"
            autoComplete="off"
          />
          {/* Clear button for the search input */}
          {query ? (
            <button
              className="map-search-clear"
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setIsSuggestionOpen(false);
              }}
              aria-label="Clear search"
            >
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
          {/* Search suggestions dropdown */}
          {isSuggestionOpen && suggestions.length ? (
            <div className="map-search-suggestions" role="listbox" aria-label="Search results">
              {suggestions.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  role="option"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelectSuggestion(place)}
                >
                  <MapPin size={15} aria-hidden="true" />
                  <span>
                    <strong>{place.name}</strong>
                    <small>{place.displayName}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </form>

        {/* Horizontal strip of category filter buttons */}
        <div className="map-filter-strip" aria-label="Map filters">
          {filterOrder.map((categoryId) => {
            const category = categoryConfig[categoryId];
            const FilterIcon = category.icon;

            return (
              <button
                className={activeCategories.includes(categoryId) ? 'is-active' : ''}
                key={categoryId}
                type="button"
                onClick={() => handleSelectCategory(categoryId)}
                style={{ '--category-color': category.color }}
              >
                <FilterIcon size={17} aria-hidden="true" />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating status message for loading, errors, and informational states */}
      {message ? (
        <p className={`map-floating-status map-status-${status}`} role={status === 'error' ? 'alert' : 'status'}>
          {message}
        </p>
      ) : null}

      {/* Hint displayed when marker placement mode is active */}
      {isAddingMarker ? (
        <p className="map-add-marker-hint" role="status">
          Click anywhere on the map to place your marker.
        </p>
      ) : null}

      {/* Main map container with Leaflet MapContainer component */}
      <div className="map-canvas" aria-label="Interactive travel map">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom
          zoomControl={false}
          className="leaflet-map"
        >
          {/* Base tile layer for the map */}
          <TileLayer
            attribution={activeTileLayer.attribution}
            url={activeTileLayer.url}
          />
          {/* Component that handles map focus animation to selected place */}
          <MapFocus place={selectedPlace} />
          {/* Component that resets the map view when a favorite is selected */}
          <FavoriteMapReset resetCount={favoriteMapResetCount} />
          {/* Component that handles click events for adding custom markers */}
          <MapClickHandler isAddingMarker={isAddingMarker} onAddMarker={handleAddCustomMarker} />
          {/* Component that tracks viewport changes */}
          <MapViewportTracker onViewportChange={handleViewportChange} />
          {/* Tool controls for zoom, recenter, marker placement, and layer selection */}
          <MapToolControls
            isAddingMarker={isAddingMarker}
            isLayerMenuOpen={isLayerMenuOpen}
            mapType={mapType}
            panelOpen={isPanelOpen}
            onSelectMapType={(nextType) => {
              setMapType(nextType);
              setIsLayerMenuOpen(false);
            }}
            onToggleAddMarker={() => setIsAddingMarker((currentValue) => !currentValue)}
            onToggleLayerMenu={() => setIsLayerMenuOpen((currentValue) => !currentValue)}
          />
          {/* User location marker with tooltip */}
          {userLocation ? (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={createUserLocationIcon()}
              zIndexOffset={1000}
            >
              <Tooltip direction="top" offset={[0, -12]}>
                You are here
              </Tooltip>
            </Marker>
          ) : null}
          {/* Route polylines showing main route and alternatives */}
          {route?.coordinates?.length ? (
            <>
              {(route.alternatives || [])
                .filter((alternative) => alternative.id !== route.id)
                .map((alternative) => (
                  <Polyline
                    key={alternative.id}
                    positions={alternative.coordinates}
                    pathOptions={{ color: '#64748b', dashArray: '8 8', opacity: 0.45, weight: 4 }}
                  />
                ))}
              <Polyline
                positions={route.coordinates}
                pathOptions={{ color: '#2563eb', opacity: 0.9, weight: 5 }}
              />
            </>
          ) : null}
          {/* Renders all visible markers on the map */}
          {visibleMarkers.map((pin) => (
            <Marker
              key={pin.id}
              position={[pin.lat, pin.lng]}
              icon={createMapIcon(pin, pin.categoryId || activeCategories[0])}
              eventHandlers={{
                click: (event) => {
                  if (event.originalEvent) {
                    L.DomEvent.stopPropagation(event.originalEvent);
                  }
                  handleSelectMarker(pin);
                },
              }}
            >
              {/* Popup showing basic place information and remove button for custom markers */}
              <Popup closeButton={false}>
                <strong>{pin.name}</strong>
                <span>{pin.address}</span>
                {pin.custom ? (
                  <button
                    className="map-popup-remove"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemoveCustomMarker(pin.id);
                    }}
                  >
                    Remove marker
                  </button>
                ) : null}
              </Popup>
              {/* Permanent tooltip for favorite origin markers */}
              {pin.favoriteOrigin && isFavoriteMarkerLabelVisible ? (
                <Tooltip
                  className="map-favorite-origin-label"
                  direction="top"
                  offset={[0, -54]}
                  opacity={1}
                  permanent
                  interactive
                >
                  <span>
                    <strong>HERE!</strong>
                    <small>{pin.name}</small>
                  </span>
                </Tooltip>
              ) : null}
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Button to reopen the panel when closed */}
      {!isPanelOpen ? (
        <button className="map-panel-open-button" type="button" onClick={() => setIsPanelOpen(true)}>
          Open map panel
        </button>
      ) : null}

      {/* Side panel showing search results or place details */}
      {isPanelOpen ? (
      <aside className="map-destination-panel" aria-label="Map results">
        <div className="map-panel-header">
          <button type="button" aria-label="Close destination panel" onClick={handleCloseDestinationPanel}>
            <X size={22} aria-hidden="true" />
          </button>
          <h2 id="map-page-title">
            {panelMode === 'category' ? 'Map results' : selectedPlace?.name || 'Selected place'}
            <ChevronRight size={18} aria-hidden="true" />
          </h2>
          <p>
            {panelMode === 'category' ? selectedCategoryLabels : categoryConfig[selectedCategory]?.label}
            <span>|</span>
            {panelMode === 'category'
              ? `${categoryResultCount} places found`
              : 'Place details'}
          </p>
        </div>

        {/* Category view showing all results grouped by category */}
        {panelMode === 'category' ? (
          <>
            <div className="map-panel-section">
              <h3>Places on the map</h3>
              <p>Nearby places use Foursquare and OpenStreetMap coordinates, enriched with SerpApi Google Maps details.</p>
            </div>

            <div className="map-city-list">
              {/* Empty state when no categories are selected */}
              {!activeCategories.length ? (
                <div className="map-empty-selection">
                  Select a category to show places and markers on the map.
                </div>
              ) : null}

              {/* Loading state when results are not yet available */}
              {activeCategories.length && !categoryResultCount && status !== 'loading' ? (
                <div className="map-empty-selection">
                  Markers are still loading or temporarily unavailable. Move the map slightly or try again shortly.
                </div>
              ) : null}

              {/* Renders each category group with its results */}
              {categoryResultGroups.map((group) => {
                const category = categoryConfig[group.categoryId];
                const GroupIcon = category.icon;

                return (
                  <section className="map-category-result-group" key={group.categoryId}>
                    <h4 style={{ '--group-color': category.color }}>
                      <GroupIcon size={15} aria-hidden="true" />
                      {category.label}
                    </h4>

                    {/* Individual place cards within each category group */}
                    {group.places.map((place) => {
                      const PlaceIcon = categoryConfig[place.categoryId].icon;
                      const hasImage = Boolean(place.imageUrl);
                      const openStatus = getOpenStatus(place.openState || place.hours);
                      const convertedPriceText = getConvertedPriceText(place);

                      return (
                        <button
                          className={selectedPlace?.id === place.id ? 'is-active' : ''}
                          key={place.id}
                          type="button"
                          onClick={() => handleSelectMarker(place)}
                        >
                          {/* Place image or icon placeholder */}
                          {hasImage ? (
                            <span className="map-city-image-wrap">
                              <img src={place.imageUrl} alt="" loading="lazy" />
                            </span>
                          ) : (
                            <span
                              className="map-place-rank"
                              style={{ '--rank-color': categoryConfig[place.categoryId].color }}
                            >
                              <PlaceIcon size={22} aria-hidden="true" />
                            </span>
                          )}
                          {/* Place details including name, rating, hours, price, and address */}
                          <span className="map-city-content">
                            <span className="map-city-title">{place.name}</span>
                            <span className="map-city-rating">
                              <StarRating rating={place.rating} size={12} />
                              <small>
                                {place.rating && place.rating !== 'N/A' ? `${Number(place.rating).toFixed(1)}` : 'No rating'}
                                {Number(place.reviews) ? ` | ${Number(place.reviews).toLocaleString()} reviews` : ''}
                              </small>
                            </span>
                            <span className="map-city-meta map-city-hours">
                              <Clock3 size={12} aria-hidden="true" />
                              <small>{place.openState || place.hours || 'Hours unavailable'}</small>
                              <em className={`map-open-badge is-${openStatus.tone}`}>{openStatus.label}</em>
                            </span>
                            <span className="map-city-meta map-city-price">
                              <DollarSign size={12} aria-hidden="true" />
                              <small>{getOriginalPriceText(place)}</small>
                              {convertedPriceText ? <em>{convertedPriceText}</em> : null}
                            </span>
                            <span className="map-city-tag">{place.address}</span>
                          </span>
                        </button>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          </>
        ) : (
          /* Place details view showing comprehensive information about a single place */
          <PlaceDetails
            place={selectedPlace}
            categoryId={selectedCategory}
            detailStatus={placeDetailStatus}
            getConvertedPriceText={getConvertedPriceText}
            isFavorite={Boolean(selectedPlaceFavoriteRecord?._id)}
            isSavingFavorite={savingFavoriteKey === selectedPlaceFavoriteKey}
            route={route}
            routeMode={routeMode}
            routePoints={routePoints}
            routeResults={routeResults}
            routeStatus={routeStatus}
            weather={placeWeather}
            weatherStatus={placeWeatherStatus}
            onAddRoutePoint={handleAddRoutePoint}
            onCalculateRoute={handleCalculateRoute}
            onClearRoute={handleClearRoute}
            onFavoriteToggle={handleFavoriteToggle}
            onRenameCustomMarker={handleRenameCustomMarker}
            onRemove={handleRemoveCustomMarker}
            onRemoveRoutePoint={handleRemoveRoutePoint}
            onRouteAlternativeChange={handleRouteAlternativeChange}
            onRouteModeChange={handleRouteModeChange}
          />
        )}
      </aside>
      ) : null}
    </section>
  );
}

export default MapPage;
