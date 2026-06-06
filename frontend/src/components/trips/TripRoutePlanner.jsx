/**
 * Trip route planning controls.
 * Searches stops, compares travel modes, and exposes the selected route to the trip map.
 */
import { useMemo, useState } from 'react';
import {
  Bike,
  Car,
  Footprints,
  LoaderCircle,
  Navigation,
  Plane,
  Plus,
  Route,
  Search,
  Sparkles,
  TrainFront,
  Trash2,
} from 'lucide-react';
import { getRouteBetweenPlaces, searchOpenStreetMapPlaces } from '../../api/mapApi';
import './TripRoutePlanner.css';

const routeModes = [
  { id: 'car', label: 'Car', icon: Car },
  { id: 'walking', label: 'Walk', icon: Footprints },
  { id: 'bike', label: 'Bike', icon: Bike },
  { id: 'train', label: 'Train', icon: TrainFront },
  { id: 'plane', label: 'Plane', icon: Plane },
];

const formatDuration = (seconds) => {
  if (!Number.isFinite(Number(seconds))) return '--';
  const minutes = Math.max(1, Math.round(Number(seconds) / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} hr${hours === 1 ? '' : 's'}${remainingMinutes ? ` ${remainingMinutes} min` : ''}`;
};

const formatDistance = (meters) => {
  if (!Number.isFinite(Number(meters))) return '--';
  return Number(meters) < 1000
    ? `${Math.round(Number(meters))} m`
    : `${(Number(meters) / 1000).toFixed(1)} km`;
};

const normalizeRoutePoint = (place, index = 0) => ({
  id: place.id || `trip-route-point-${Date.now()}-${index}`,
  name: place.name || place.title || place.city || `Stop ${index + 1}`,
  address: place.address || place.displayName || place.city || '',
  lat: Number(place.lat),
  lng: Number(place.lng),
});

function TripRoutePlanner({ itineraryPlaces = [], plan, onPlanChange }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchStatus, setSearchStatus] = useState('idle');
  const selectedMode = plan.selectedMode || 'car';
  const selectedModeRoute = plan.results[selectedMode];
  const selectedRoute = selectedModeRoute?.alternatives?.find(
    (routeOption) => routeOption.id === plan.selectedRouteId
  ) || selectedModeRoute;

  const usableItineraryPlaces = useMemo(() => itineraryPlaces
    .map(normalizeRoutePoint)
    .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng)), [itineraryPlaces]);

  const updatePlan = (patch) => onPlanChange((currentPlan) => ({ ...currentPlan, ...patch }));

  const searchPlaces = async (event) => {
    event.preventDefault();
    if (query.trim().length < 2) return;

    setSearchStatus('loading');
    try {
      const places = await searchOpenStreetMapPlaces(query.trim(), { limit: 6 });
      setSuggestions(places);
      setSearchStatus('success');
    } catch (error) {
      setSuggestions([]);
      setSearchStatus('error');
      updatePlan({ message: error.message || 'Unable to search route stops.' });
    }
  };

  const addPoint = (place) => {
    const point = normalizeRoutePoint(place, plan.points.length);
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;

    updatePlan({
      points: [...plan.points.filter((currentPoint) => currentPoint.id !== point.id), point],
      results: {},
      selectedRouteId: '',
      status: 'idle',
      message: '',
    });
    setQuery('');
    setSuggestions([]);
  };

  const removePoint = (pointId) => {
    updatePlan({
      points: plan.points.filter((point) => point.id !== pointId),
      results: {},
      selectedRouteId: '',
      status: 'idle',
      message: '',
    });
  };

  const addItineraryStops = () => {
    const uniquePoints = new Map(plan.points.map((point) => [point.id, point]));
    usableItineraryPlaces.forEach((point) => uniquePoints.set(point.id, point));
    updatePlan({
      points: [...uniquePoints.values()].slice(0, 10),
      results: {},
      selectedRouteId: '',
      status: 'idle',
      message: '',
    });
  };

  const calculateRoutes = async () => {
    if (plan.points.length < 2) {
      updatePlan({ status: 'error', message: 'Add at least two stops to calculate routes.' });
      return;
    }

    updatePlan({ status: 'loading', message: 'Optimizing stop order with Dijkstra and comparing travel modes...' });
    try {
      const routeEntries = await Promise.all(routeModes.map(async (mode) => {
        const routeResult = await getRouteBetweenPlaces(plan.points, null, { mode: mode.id });
        return [mode.id, routeResult];
      }));
      const results = Object.fromEntries(routeEntries);
      const activeRoute = results[selectedMode] || results.car;

      updatePlan({
        results,
        selectedRouteId: activeRoute?.id || '',
        status: 'success',
        message: activeRoute?.message || '',
      });
    } catch (error) {
      updatePlan({
        results: {},
        selectedRouteId: '',
        status: 'error',
        message: error.message || 'Unable to calculate routes.',
      });
    }
  };

  const selectMode = (modeId) => {
    const modeRoute = plan.results[modeId];
    updatePlan({
      selectedMode: modeId,
      selectedRouteId: modeRoute?.id || '',
      message: modeRoute?.message || '',
    });
  };

  return (
    <div className="trip-route-workspace">
      <section className="trip-route-intro">
        <span><Sparkles size={15} aria-hidden="true" /> Dijkstra optimization</span>
        <h3>Build the most efficient stop order</h3>
        <p>The first and last stops stay fixed while intermediate stops are reordered for the shortest path.</p>
      </section>

      <form className="trip-route-search" onSubmit={searchPlaces}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search and add a route point"
        />
        <button type="submit" aria-label="Search route points">
          {searchStatus === 'loading'
            ? <LoaderCircle className="trip-details-spin" size={16} aria-hidden="true" />
            : <Search size={16} aria-hidden="true" />}
        </button>
      </form>

      {suggestions.length ? (
        <div className="trip-route-suggestions">
          {suggestions.map((place) => (
            <button type="button" key={place.id} onClick={() => addPoint(place)}>
              <Plus size={14} aria-hidden="true" />
              <span>
                <strong>{place.name}</strong>
                <small>{place.displayName}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {usableItineraryPlaces.length ? (
        <button className="trip-route-itinerary-button" type="button" onClick={addItineraryStops}>
          <Route size={15} aria-hidden="true" />
          Add itinerary stops
        </button>
      ) : null}

      <section className="trip-route-stops" aria-label="Route stops">
        <header>
          <strong>Route points</strong>
          <span>{plan.points.length}/10</span>
        </header>
        {plan.points.length ? plan.points.map((point, index) => (
          <div className="trip-route-stop" key={point.id}>
            <span>{index + 1}</span>
            <div>
              <strong>{point.name}</strong>
              <small>{point.address || `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`}</small>
            </div>
            <button type="button" onClick={() => removePoint(point.id)} aria-label={`Remove ${point.name}`}>
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        )) : <p>Add two or more places to start planning.</p>}
      </section>

      <button
        className="trip-route-calculate"
        type="button"
        onClick={calculateRoutes}
        disabled={plan.status === 'loading' || plan.points.length < 2}
      >
        {plan.status === 'loading'
          ? <LoaderCircle className="trip-details-spin" size={17} aria-hidden="true" />
          : <Navigation size={17} aria-hidden="true" />}
        {plan.status === 'loading' ? 'Calculating routes...' : 'Optimize and compare modes'}
      </button>

      <div className="trip-route-mode-grid" aria-label="Travel mode times">
        {routeModes.map((mode) => {
          const ModeIcon = mode.icon;
          const modeRoute = plan.results[mode.id];
          return (
            <button
              className={selectedMode === mode.id ? 'active' : ''}
              type="button"
              key={mode.id}
              onClick={() => selectMode(mode.id)}
            >
              <ModeIcon size={16} aria-hidden="true" />
              <strong>{mode.label}</strong>
              <span>{formatDuration(modeRoute?.durationSeconds)}</span>
            </button>
          );
        })}
      </div>

      {selectedModeRoute?.alternatives?.length ? (
        <section className="trip-route-alternatives">
          <header>
            <strong>{routeModes.find((mode) => mode.id === selectedMode)?.label} routes</strong>
            <span>{selectedModeRoute.alternatives.length} option{selectedModeRoute.alternatives.length === 1 ? '' : 's'}</span>
          </header>
          {selectedModeRoute.alternatives.map((routeOption) => (
            <button
              className={selectedRoute?.id === routeOption.id ? 'active' : ''}
              type="button"
              key={routeOption.id}
              onClick={() => updatePlan({ selectedRouteId: routeOption.id })}
            >
              <span>
                <strong>Route {routeOption.rank || 1}</strong>
                {routeOption.isBest ? <em>Best route</em> : null}
                {routeOption.isFastest && !routeOption.isBest ? <em>Fastest</em> : null}
                {routeOption.isShortest && !routeOption.isBest ? <em>Shortest</em> : null}
              </span>
              <small>{formatDistance(routeOption.distanceMeters)} · {formatDuration(routeOption.durationSeconds)}</small>
            </button>
          ))}
        </section>
      ) : null}

      {selectedModeRoute?.optimization ? (
        <p className="trip-route-optimization-note">
          Dijkstra optimized {selectedModeRoute.optimization.pointOrder.length} stops
          {selectedModeRoute.optimization.savedDistanceMeters > 1
            ? ` and saved about ${formatDistance(selectedModeRoute.optimization.savedDistanceMeters)}.`
            : '.'}
        </p>
      ) : null}
      {plan.message ? <p className={`trip-route-message is-${plan.status}`}>{plan.message}</p> : null}
    </div>
  );
}

export default TripRoutePlanner;
