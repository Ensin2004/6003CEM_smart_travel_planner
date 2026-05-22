import { useCallback, useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BedDouble,
  ChevronRight,
  Clock3,
  Heart,
  Layers,
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
import { getRouteBetweenPlaces, searchOpenStreetMapCategoryPlaces, searchOpenStreetMapPlaces } from '../../api/mapApi';
import './MapPage.css';

const defaultCenter = [5.4141, 100.3288];
const defaultZoom = 8;

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

const formatCategoryPlace = (place, categoryId) => ({
  ...place,
  categoryId,
  address: getPlaceAddress(place),
  hours: place.hours || 'Hours unavailable',
  rating: place.rating || 'N/A',
  reviews: place.reviews || 'OpenStreetMap result',
  summary: place.summary || 'Place result from OpenStreetMap.',
});

const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) {
    return 'Distance unavailable';
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
};

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

function PlaceDetails({
  categoryId,
  onAddRoutePoint,
  onClearRoute,
  onCalculateRoute,
  onRenameCustomMarker,
  onRemove,
  place,
  route,
  routeMode,
  routePoints,
  routeStatus,
  onRouteModeChange,
}) {
  const category = categoryConfig[categoryId] || categoryConfig.attractions;
  const CategoryIcon = category.icon;
  const details = formatCategoryPlace(place || {}, categoryId);

  return (
    <div className="map-place-details">
      <div className="map-detail-category" style={{ '--detail-color': category.color }}>
        <CategoryIcon size={17} aria-hidden="true" />
        {category.label}
      </div>

      <div className="map-detail-rating">
        <strong>{details.rating}</strong>
        <span className="map-detail-review-count">
          <Star size={14} fill="currentColor" aria-hidden="true" />
          {details.reviews}
        </span>
      </div>

      <p>{details.summary}</p>

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

      <div className="map-route-actions">
        <button
          type="button"
          onClick={() => onAddRoutePoint(details)}
        >
          <Navigation size={16} aria-hidden="true" />
          Add to route
        </button>
        <button
          type="button"
          onClick={onCalculateRoute}
          disabled={routeStatus === 'loading' || routePoints.length < 2}
        >
          <Navigation size={16} aria-hidden="true" />
          {routeStatus === 'loading' ? 'Calculating route...' : 'Calculate route'}
        </button>
        <button
          type="button"
          onClick={onClearRoute}
          disabled={!routePoints.length && !route}
        >
          Clear route
        </button>
      </div>

      <div className="map-route-mode-list" aria-label="Transport mode">
        {routeModeOptions.map((mode) => (
          <button
            className={routeMode === mode.id ? 'is-active' : ''}
            key={mode.id}
            type="button"
            onClick={() => onRouteModeChange(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="map-route-point-list">
        {routePoints.map((point, index) => (
          <span key={`${point.id}-${index}`}>
            {index + 1}. {point.name}
          </span>
        ))}
        {!routePoints.length ? (
          <span>Add two or more points to calculate a route.</span>
        ) : null}
      </div>

      {route ? (
        <div className="map-route-summary" role="status">
          <strong>{formatDistance(route.distanceMeters)}</strong>
          <span>
            {formatDuration(route.durationSeconds)} by {routeModeOptions.find((mode) => mode.id === route.mode)?.label || 'route'}
            {route.estimated ? ' (estimated)' : ''}
          </span>
        </div>
      ) : null}

      <div className="map-route-actions">
        <button
          type="button"
          onClick={() => onAddRoutePoint(details, { calculateFromUserLocation: true })}
          disabled={routeStatus === 'loading'}
        >
          <Navigation size={16} aria-hidden="true" />
          {routeStatus === 'loading' ? 'Calculating route...' : 'Route from my location'}
        </button>
      </div>

      <dl>
        <div>
          <dt>
            <Clock3 size={15} aria-hidden="true" />
            Business hours
          </dt>
          <dd>{details.hours}</dd>
        </div>
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
  const [query, setQuery] = useState('Penang');
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
  const [routeStatus, setRouteStatus] = useState('idle');
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
      setMessage('Loading places from OpenStreetMap...');

      try {
        const results = await Promise.all(
          searchableCategories.map(async (categoryId) => {
            const places = await searchOpenStreetMapCategoryPlaces(categoryId, mapCenter, {
              bounds: mapBounds,
              limit: categoryId === 'attractions' || categoryId === 'shopping' ? 60 : 30,
              signal: controller.signal,
            });

            return [categoryId, places.map((place) => formatCategoryPlace(place, categoryId))];
          })
        );

        if (controller.signal.aborted) {
          return;
        }

        setCategoryResults((currentResults) => {
          const nextResults = {};
          const resultEntries = Object.fromEntries(results);

          activeCategories.forEach((categoryId) => {
            if (categoryId === 'custom' || categoryId === 'saved') {
              return;
            }

            nextResults[categoryId] = resultEntries[categoryId] || currentResults[categoryId] || [];
          });

          return nextResults;
        });
        setStatus('success');
        setMessage('');
      } catch (error) {
        if (error.name !== 'AbortError') {
          setStatus('error');
          setMessage(error.message || 'Unable to load map places.');
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timerId);
      controller.abort();
    };
  }, [activeCategories, mapBounds, mapCenter]);

  useEffect(() => {
    saveUserMarkers(customMarkers);
  }, [customMarkers]);

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
      setStatus('success');
      setMessage('');
      setSuggestions([]);
      setIsSuggestionOpen(false);
      setIsPanelOpen(true);
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
  };

  const handleSelectMarker = (marker) => {
    setSelectedPlace({
      ...marker,
      panelMode: 'place',
      zoom: 14,
    });
    setMapCenter([marker.lat, marker.lng]);
    setQuery(marker.name);
    setStatus('success');
    setMessage('');
    setIsSuggestionOpen(false);
    setIsPanelOpen(true);
  };

  const calculateRoute = async (points = routePoints, mode = routeMode) => {
    if (points.length < 2) {
      setStatus('error');
      setMessage('Add at least two route points.');
      return;
    }

    setRouteStatus('loading');
    setStatus('loading');
    setMessage('Calculating route...');

    try {
      const routeDetails = await getRouteBetweenPlaces(points, null, { mode });

      setRoute({
        ...routeDetails,
        points,
      });
      setRouteStatus('success');
      setStatus('success');
      setMessage('');
    } catch (error) {
      setRoute(null);
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

    if (options.calculateFromUserLocation) {
      calculateRoute(nextPoints, routeMode);
    }
  };

  const handleCalculateRoute = () => {
    calculateRoute(routePoints, routeMode);
  };

  const handleClearRoute = () => {
    setRoute(null);
    setRoutePoints([]);
    setRouteStatus('idle');
  };

  const handleRouteModeChange = (nextMode) => {
    setRouteMode(nextMode);

    if (routePoints.length >= 2) {
      calculateRoute(routePoints, nextMode);
    }
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
  };

  const handleRemoveCustomMarker = (markerId) => {
    setCustomMarkers((markers) => markers.filter((marker) => marker.id !== markerId));
    setRoute((currentRoute) => (
      currentRoute?.points?.some((point) => point.id === markerId) ? null : currentRoute
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
    setQuery(place.name);
    setSuggestions([]);
    setIsSuggestionOpen(false);
    setStatus('success');
    setMessage('');
    setIsPanelOpen(true);
  };

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
            <Polyline
              positions={route.coordinates}
              pathOptions={{ color: '#2563eb', opacity: 0.9, weight: 5 }}
            />
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
              <p>Results are loaded from OpenStreetMap for the visible area.</p>
            </div>

            <div className="map-city-list">
              {!activeCategories.length ? (
                <div className="map-empty-selection">
                  Select a category to show places and markers on the map.
                </div>
              ) : null}

              {activeCategories.length && !categoryResultCount && status !== 'loading' ? (
                <div className="map-empty-selection">
                  No places found in this map area. Move the map or choose another category.
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

                      return (
                        <button
                          className={selectedPlace?.id === place.id ? 'is-active' : ''}
                          key={place.id}
                          type="button"
                          onClick={() => handleSelectMarker(place)}
                        >
                          <span
                            className="map-place-rank"
                            style={{ '--rank-color': categoryConfig[place.categoryId].color }}
                          >
                            <PlaceIcon size={22} aria-hidden="true" />
                          </span>
                          <span className="map-city-content">
                            <span className="map-city-title">{place.name}</span>
                            <span className="map-city-meta">
                              <MapPin size={12} aria-hidden="true" />
                              <small>{place.type || place.category || 'place'}</small>
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
            route={route}
            routeMode={routeMode}
            routePoints={routePoints}
            routeStatus={routeStatus}
            onAddRoutePoint={handleAddRoutePoint}
            onCalculateRoute={handleCalculateRoute}
            onClearRoute={handleClearRoute}
            onRenameCustomMarker={handleRenameCustomMarker}
            onRemove={handleRemoveCustomMarker}
            onRouteModeChange={handleRouteModeChange}
          />
        )}
      </aside>
      ) : null}
    </section>
  );
}

export default MapPage;
