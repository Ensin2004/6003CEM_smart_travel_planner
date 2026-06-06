/**
 * Map module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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
import './MapPage.css';

const defaultCenter = [5.4141, 100.3288];
const defaultZoom = 11;

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

const filterOrder = ['hotels', 'airports', 'train', 'food', 'attractions', 'shopping', 'custom', 'saved'];
const userMarkersStorageKey = 'smartTravelPlanner.map.userMarkers';
const fallbackUserLocation = {
  id: 'user-location',
  name: 'My location',
  lat: defaultCenter[0],
  lng: defaultCenter[1],
  isFallback: true,
};

const routeModeOptions = [
  { id: 'car', label: 'Car' },
  { id: 'walking', label: 'Walking' },
  { id: 'bike', label: 'Bike' },
  { id: 'train', label: 'Train' },
  { id: 'plane', label: 'Plane' },
];

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

const categoryPanelPlace = {
  id: 'category-panel',
  name: 'Map results',
  lat: defaultCenter[0],
  lng: defaultCenter[1],
  zoom: defaultZoom,
  panelMode: 'category',
};
const getPlaceAddress = (place) => place.address || place.displayName || 'Location details unavailable';
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
// Format Category Place converts raw values into readable display text.
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
const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);
// Format Temperature converts raw values into readable display text.
const formatTemperature = (value) => (Number.isFinite(Number(value)) ? `${Math.round(Number(value))} C` : '--');
// Format Money converts raw values into readable display text.
const formatMoney = (amount, currencyCode) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);
const getPriceConversionKey = (item, targetCurrency) =>
  `${item.id}:${item.priceDetail?.display || item.price || 'price'}:${targetCurrency}`;
const getOriginalPriceText = (item) => item.priceDetail?.display || item.price || 'Price unavailable';
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
const getRouteModeNote = (route) => {
  if (!route) return 'Not calculated';
  if (route.mode === 'train' || route.mode === 'plane') {
    return 'Estimated only, confirm availability';
  }
  return route.estimated ? 'Estimated route' : 'Mapped route';
};
const isCanceledRequest = (error) => error.name === 'AbortError' || error.name === 'CanceledError';
const getPlaceRequestKey = (placeId, lat, lng) =>
  `${placeId || 'place'}:${Number(lat).toFixed(4)}:${Number(lng).toFixed(4)}`;
// Format Distance converts raw values into readable display text.
const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) {
    return 'Distance unavailable';
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
};
// Format Duration converts raw values into readable display text.
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
const loadUserMarkers = () => {
  try {
    const savedMarkers = JSON.parse(localStorage.getItem(userMarkersStorageKey) || '[]');
    return Array.isArray(savedMarkers) ? savedMarkers : [];
  } catch {
    return [];
  }
};
// Save User Markers applies allowed changes to an existing record.
const saveUserMarkers = (markers) => {
  localStorage.setItem(userMarkersStorageKey, JSON.stringify(markers));
};
const isCountryResult = (place) => (
  place?.category === 'boundary' ||
  ['country', 'state', 'province', 'administrative'].includes(place?.type)
);
const inferCategoryFromSearch = (query, place) => {
  const text = `${query} ${place?.category || ''} ${place?.type || ''}`.toLowerCase();

  if (text.includes('hotel') || text.includes('resort')) return 'hotels';
  if (text.includes('airport') || text.includes('aerodrome')) return 'airports';
  if (text.includes('train') || text.includes('railway') || text.includes('station')) return 'train';
  if (text.includes('restaurant') || text.includes('food') || text.includes('cafe')) return 'food';
  if (text.includes('mall') || text.includes('shop') || text.includes('market')) return 'shopping';

  return 'attractions';
};

// Create Map Icon builds a new record from validated input.
const createMapIcon = (pin, categoryId) => {
  const category = categoryConfig[categoryId] || categoryConfig.attractions;
  const PinIcon = category.icon;
  const iconMarkup = renderToStaticMarkup(<PinIcon size={17} strokeWidth={2.4} />);

  return L.divIcon({
    className: '',
    html: `
      <span class="travel-map-pin" style="--pin-color: ${category.color}">
        <span class="travel-map-pin-icon">${iconMarkup}</span>
      </span>
    `,
    iconSize: [42, 50],
    iconAnchor: [21, 48],
    popupAnchor: [0, -44],
  });
};

const createUserLocationIcon = () => (
  L.divIcon({
    className: '',
    html: '<span class="travel-user-location-pin"></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
);

function MapFocus({ place }) {
  const map = useMap();
  useEffect(() => {
    if (place?.panelMode !== 'category' && place?.lat && place?.lng) {
      map.flyTo([place.lat, place.lng], place.zoom || 12, { duration: 0.75 });
    }
  }, [map, place]);

  return null;
}

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
  onAddRoutePoint,
  onClearRoute,
  onCalculateRoute,
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
  const category = categoryConfig[categoryId] || categoryConfig.attractions;
  const CategoryIcon = category.icon;
  const details = formatCategoryPlace(place || {}, categoryId);
  const openStatus = getOpenStatus(details.openState || details.hours);
  const convertedPriceText = getConvertedPriceText(details);
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
      {details.imageUrl ? (
        <img className="map-detail-image" src={details.imageUrl} alt="" loading="lazy" />
      ) : (
        <div className="map-detail-image map-detail-image-empty">
          <Image size={28} aria-hidden="true" />
        </div>
      )}

      <div className="map-detail-category" style={{ '--detail-color': category.color }}>
        <CategoryIcon size={17} aria-hidden="true" />
        {category.label}
      </div>

      {detailStatus === 'loading' ? (
        <p className="map-detail-loading">
          <LoaderCircle size={15} aria-hidden="true" />
          Loading richer place details...
        </p>
      ) : null}
      {details.enrichmentMessage ? (
        <p className="map-detail-provider-warning" role="status">{details.enrichmentMessage}</p>
      ) : null}

      <div className="map-detail-rating">
        <StarRating rating={details.rating} size={17} />
        <strong>{details.rating && details.rating !== 'N/A' ? `${Number(details.rating).toFixed(1)} stars` : 'No rating'}</strong>
        <span className="map-detail-review-count">
          {Number(details.reviews) ? `${Number(details.reviews).toLocaleString()} reviews` : details.reviews}
        </span>
      </div>

      <p>{details.summary}</p>

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

function MapPage() {
  const currency = useContext(CurrencyContext);
  const loadedPlaceDetailsRef = useRef(new Set());
  const placeWeatherCacheRef = useRef(new Map());
  const [query, setQuery] = useState('Penang');
  const [mapDestination, setMapDestination] = useState('Penang');
  const [activeCategories, setActiveCategories] = useState([]);
  const [categoryResults, setCategoryResults] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [customMarkers, setCustomMarkers] = useState(() => loadUserMarkers());
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [mapType, setMapType] = useState('default');
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapBounds, setMapBounds] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(categoryPanelPlace);
  const [userLocation, setUserLocation] = useState(fallbackUserLocation);
  const [route, setRoute] = useState(null);
  const [routeMode, setRouteMode] = useState('car');
  const [routePoints, setRoutePoints] = useState([]);
  const [routeResults, setRouteResults] = useState({});
  const [routeStatus, setRouteStatus] = useState('idle');
  const [priceConversions, setPriceConversions] = useState({});
  const [placeDetailStatus, setPlaceDetailStatus] = useState('idle');
  const [placeWeather, setPlaceWeather] = useState(null);
  const [placeWeatherStatus, setPlaceWeatherStatus] = useState('idle');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const panelMode = selectedPlace?.panelMode || 'category';
  const selectedCategory = selectedPlace?.categoryId || activeCategories[0] || 'attractions';
  const selectedCategoryLabels = activeCategories.length
    ? activeCategories.map((categoryId) => categoryConfig[categoryId].label).join(', ')
    : 'No categories selected';

  const visibleMarkers = useMemo(() => {
    const selectedCategoryPlaces = activeCategories.flatMap((categoryId) => categoryResults[categoryId] || []);
    const mapPlaces = [...selectedCategoryPlaces, ...customMarkers];
    const isSelectedCategoryMarker = mapPlaces.some((place) => place.id === selectedPlace?.id);

    if (panelMode === 'place' && selectedPlace?.lat && selectedPlace?.lng && !isSelectedCategoryMarker) {
      return [selectedPlace, ...mapPlaces];
    }

    return mapPlaces;
  }, [activeCategories, categoryResults, customMarkers, panelMode, selectedPlace]);

  const visibleCategoryResults = useMemo(() => (
    Object.fromEntries(
      activeCategories
        .filter((categoryId) => categoryId !== 'custom' && categoryId !== 'saved')
        .map((categoryId) => [categoryId, categoryResults[categoryId] || []])
    )
  ), [activeCategories, categoryResults]);

  const categoryResultGroups = useMemo(
    () => activeCategories.map((categoryId) => ({
      categoryId,
      places: categoryId === 'custom' ? customMarkers : visibleCategoryResults[categoryId] || [],
    })),
    [activeCategories, customMarkers, visibleCategoryResults]
  );
  const categoryResultCount = categoryResultGroups.reduce(
    (total, group) => total + group.places.length,
    0
  );
  const activeTileLayer = mapTileLayers[mapType];
  const selectedCurrency = currency?.selectedCurrency || 'USD';
  const supportedCurrencyCodes = useMemo(() => currency?.currencies?.map((option) => option.code) || [], [currency?.currencies]);
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

  const handleViewportChange = useCallback((viewport) => {
    setMapCenter(viewport.center);
    setMapBounds(viewport.bounds);
  }, []);

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

  useEffect(() => {
    saveUserMarkers(customMarkers);
  }, [customMarkers]);

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

  const handleAddRoutePoint = (place, options = {}) => {
    if (!place?.lat || !place?.lng) {
      setStatus('error');
      setMessage('Select a valid place before adding it to the route.');
      return;
    }

    const routePoint = {
      id: place.id,
      name: place.name,
      lat: place.lat,
      lng: place.lng,
    };
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

    setRoutePoints(nextPoints);
    setRoute(null);
    setRouteResults({});

    if (options.calculateFromUserLocation) {
      calculateRoute(nextPoints);
    }
  };

  const handleCalculateRoute = () => {
    calculateRoute(routePoints);
  };

  const handleClearRoute = () => {
    setRoute(null);
    setRouteResults({});
    setRoutePoints([]);
    setRouteStatus('idle');
  };

  const handleRemoveRoutePoint = (pointIndex) => {
    setRoutePoints((points) => points.filter((_, index) => index !== pointIndex));
    setRoute(null);
    setRouteResults({});
    setRouteStatus('idle');
    setMessage('');
  };

  const handleRouteModeChange = (nextMode) => {
    setRouteMode(nextMode);
    setRoute(routeResults[nextMode] || route);
  };
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

  return (
    <section className="map-page map-discovery-page" aria-labelledby="map-page-title">
      <div className="map-overlay-top">
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

      {message ? (
        <p className={`map-floating-status map-status-${status}`} role={status === 'error' ? 'alert' : 'status'}>
          {message}
        </p>
      ) : null}

      {isAddingMarker ? (
        <p className="map-add-marker-hint" role="status">
          Click anywhere on the map to place your marker.
        </p>
      ) : null}

      <div className="map-canvas" aria-label="Interactive travel map">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom
          zoomControl={false}
          className="leaflet-map"
        >
          <TileLayer
            attribution={activeTileLayer.attribution}
            url={activeTileLayer.url}
          />
          <MapFocus place={selectedPlace} />
          <MapClickHandler isAddingMarker={isAddingMarker} onAddMarker={handleAddCustomMarker} />
          <MapViewportTracker onViewportChange={handleViewportChange} />
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
            </Marker>
          ))}
        </MapContainer>
      </div>

      {!isPanelOpen ? (
        <button className="map-panel-open-button" type="button" onClick={() => setIsPanelOpen(true)}>
          Open map panel
        </button>
      ) : null}

      {isPanelOpen ? (
      <aside className="map-destination-panel" aria-label="Map results">
        <div className="map-panel-header">
          <button type="button" aria-label="Close destination panel" onClick={() => setIsPanelOpen(false)}>
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

        {panelMode === 'category' ? (
          <>
            <div className="map-panel-section">
              <h3>Places on the map</h3>
              <p>Nearby places use Foursquare and OpenStreetMap coordinates, enriched with SerpApi Google Maps details.</p>
            </div>

            <div className="map-city-list">
              {!activeCategories.length ? (
                <div className="map-empty-selection">
                  Select a category to show places and markers on the map.
                </div>
              ) : null}

              {activeCategories.length && !categoryResultCount && status !== 'loading' ? (
                <div className="map-empty-selection">
                  Markers are still loading or temporarily unavailable. Move the map slightly or try again shortly.
                </div>
              ) : null}

              {categoryResultGroups.map((group) => {
                const category = categoryConfig[group.categoryId];
                const GroupIcon = category.icon;

                return (
                  <section className="map-category-result-group" key={group.categoryId}>
                    <h4 style={{ '--group-color': category.color }}>
                      <GroupIcon size={15} aria-hidden="true" />
                      {category.label}
                    </h4>

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
          <PlaceDetails
            place={selectedPlace}
            categoryId={selectedCategory}
            detailStatus={placeDetailStatus}
            getConvertedPriceText={getConvertedPriceText}
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
