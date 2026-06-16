/**
 * Favorites page separates individually saved places from saved trip collections.
 * Existing favorite records remain the source of truth for removal and map navigation.
 */
import {
  ArrowDownUp,
  Building2,
  CalendarDays,
  Heart,
  LoaderCircle,
  MapPin,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFavorites, removeFavorite } from '../../api/favoriteApi';
import { getTripItinerary } from '../../api/itineraryApi';
import { getTrips } from '../../api/tripApi';
import FavoriteCard from './components/FavoriteCard';
import FavoriteDeleteDialog from './components/FavoriteDeleteDialog';
import './FavoritesPage.css';

/**
 * Valid place types for individual saved locations
 */
const placeTypes = ['attraction', 'hotel', 'restaurant', 'location'];

/**
 * Checks if a favorite item is a trip-type favorite.
 * Trip favorites have type 'location' and source 'trips' with externalId starting with 'trip-'.
 * 
 * @param {Object} favorite - The favorite item to check
 * @returns {boolean} True if the favorite is a trip favorite
 */
const isTripFavorite = (favorite) => (
  favorite.type === 'location'
  && favorite.source === 'trips'
  && String(favorite.externalId || '').startsWith('trip-')
);

/**
 * Extracts the trip ID from a trip favorite's externalId.
 * Removes the 'trip-' prefix to get the actual trip identifier.
 * 
 * @param {Object} favorite - The trip favorite item
 * @returns {string} The extracted trip ID
 */
const getTripIdFromFavorite = (favorite) => String(favorite.externalId || '').replace(/^trip-/, '');

/**
 * Formats a date range into a human-readable string.
 * 
 * @param {string} startDate - The start date
 * @param {string} endDate - The end date
 * @returns {string} Formatted date range or fallback text
 */
const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Dates not set';
  return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
};

/**
 * Extracts a numeric price value from a price level string.
 * Handles currency symbols and commas in the price string.
 * 
 * @param {string} value - The price level string
 * @returns {number} The extracted numeric price or Infinity if not found
 */
const getNumericPrice = (value) => {
  const match = String(value || '').replace(/,/g, '').match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
};

/**
 * Converts an itinerary item to a favorite-compatible format.
 * Maps properties to match the FavoriteCard component expectations.
 * 
 * @param {Object} item - The itinerary item
 * @returns {Object} The converted favorite-like object
 */
const itineraryItemToFavorite = (item) => ({
  _id: item._id,
  type: item.type === 'custom' ? 'location' : item.type,
  title: item.title,
  description: item.description,
  location: item.location,
  rating: item.rating,
  priceLevel: item.priceEstimate?.amount
    ? `${item.priceEstimate.currency || 'MYR'} ${Number(item.priceEstimate.amount).toLocaleString()}`
    : undefined,
  externalId: item.externalId,
  source: item.source,
});

/**
 * FavoritesPage component displays saved places and trips.
 * Allows filtering, sorting, searching, and removing favorites.
 * 
 * @returns {JSX.Element} The rendered favorites page
 */
function FavoritesPage() {
  // Navigation hook for map navigation
  const navigate = useNavigate();
  
  // State for favorites data
  const [favorites, setFavorites] = useState([]);
  const [trips, setTrips] = useState([]);
  const [tripItineraries, setTripItineraries] = useState({});
  
  // UI state for views, filters, and sorting
  const [activeView, setActiveView] = useState('places');
  const [selectedTripId, setSelectedTripId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  
  // Delete dialog state
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Loading and error state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * Effect hook that loads favorites and trips on component mount.
   * Uses Promise.all to fetch both data sources in parallel.
   */
  useEffect(() => {
    let isActive = true;

    Promise.all([getFavorites(), getTrips()])
      .then(([favoritesResponse, tripsResponse]) => {
        if (!isActive) return;
        setFavorites(favoritesResponse.data?.data?.favorites || []);
        setTrips(tripsResponse.data?.data?.trips || []);
      })
      .catch(() => {
        if (isActive) setError('Unable to load favourites right now.');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  /**
   * Memoized filtered favorites for trip type
   */
  const tripFavorites = useMemo(() => favorites.filter(isTripFavorite), [favorites]);
  
  /**
   * Memoized filtered favorites for place types (excluding trip favorites)
   */
  const placeFavorites = useMemo(
    () => favorites.filter((favorite) => placeTypes.includes(favorite.type) && !isTripFavorite(favorite)),
    [favorites]
  );

  /**
   * Memoized mapping of saved trips with their favorite records
   */
  const savedTrips = useMemo(() => tripFavorites.map((favorite) => {
    const tripId = getTripIdFromFavorite(favorite);
    const trip = trips.find((currentTrip) => String(currentTrip._id) === tripId);
    return trip ? { favorite, trip, tripId } : null;
  }).filter(Boolean), [tripFavorites, trips]);

  /**
   * Determines the active trip ID for display
   * Uses the selected ID if valid, otherwise falls back to the first saved trip
   */
  const activeTripId = savedTrips.some(({ tripId }) => tripId === selectedTripId)
    ? selectedTripId
    : savedTrips[0]?.tripId || '';

  /**
   * Effect hook that loads trip itineraries for saved trips
   * Only loads itineraries that haven't been loaded yet
   */
  useEffect(() => {
    let isActive = true;
    const unloadedTrips = savedTrips.filter(({ tripId }) => !tripItineraries[tripId]);
    if (!unloadedTrips.length) return undefined;

    Promise.allSettled(unloadedTrips.map(async ({ tripId }) => {
      const response = await getTripItinerary(tripId);
      return [tripId, response.data?.data || {}];
    })).then((results) => {
      if (!isActive) return;
      setTripItineraries((current) => ({
        ...current,
        ...Object.fromEntries(
          results
            .filter((result) => result.status === 'fulfilled')
            .map((result) => result.value)
        ),
      }));
    });

    return () => {
      isActive = false;
    };
  }, [savedTrips, tripItineraries]);

  /**
   * Memoized filtered and sorted places for display
   * Applies search query, type filter, and sort order
   */
  const visiblePlaces = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const filtered = placeFavorites.filter((favorite) => {
      const matchesType = typeFilter === 'all' || favorite.type === typeFilter;
      const matchesSearch = !normalizedSearch || [
        favorite.title,
        favorite.description,
        favorite.location?.address,
      ].filter(Boolean).some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesType && matchesSearch;
    });

    return [...filtered].sort((leftFavorite, rightFavorite) => {
      if (sortBy === 'price') {
        return getNumericPrice(leftFavorite.priceLevel) - getNumericPrice(rightFavorite.priceLevel);
      }
      return Number(rightFavorite.rating || -1) - Number(leftFavorite.rating || -1);
    });
  }, [placeFavorites, searchQuery, sortBy, typeFilter]);

  /**
   * Selected trip data and its places
   */
  const selectedSavedTrip = savedTrips.find(({ tripId }) => tripId === activeTripId);
  const selectedTripPlaces = (tripItineraries[activeTripId]?.items || []).map(itineraryItemToFavorite);

  /**
   * Handles opening a favorite on the map.
   * Navigates to the map page with the selected favorite in state.
   * 
   * @param {Object} favorite - The favorite item to open on map
   */
  const handleOpenOnMap = (favorite) => {
    navigate('/map', { state: { selectedFavorite: favorite } });
  };

  /**
   * Handles confirming the removal of a favorite.
   * Calls the API to remove the favorite and updates local state.
   */
  const handleConfirmRemove = async () => {
    if (!pendingDelete?._id || isDeleting) return;
    setIsDeleting(true);
    setError('');
    try {
      await removeFavorite(pendingDelete._id);
      setFavorites((currentFavorites) => currentFavorites.filter((favorite) => favorite._id !== pendingDelete._id));
      setPendingDelete(null);
    } catch (removeError) {
      setError(removeError.response?.data?.message || 'Unable to remove this favourite right now.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="favorites-page" aria-labelledby="favorites-title">
      {/* Page header with title and view toggle */}
      <header className="favorites-header">
        <div>
          <h2 id="favorites-title">My Favourites</h2>
          <p>Keep saved places and favourite trip plans together.</p>
        </div>
        <div className="favorites-view-actions" role="group" aria-label="Favourite view">
          <button className={activeView === 'places' ? 'active' : ''} type="button" onClick={() => setActiveView('places')}>
            <MapPin size={15} aria-hidden="true" />
            Saved Places
            <span>{placeFavorites.length}</span>
          </button>
          <button className={activeView === 'trips' ? 'active' : ''} type="button" onClick={() => setActiveView('trips')}>
            <Heart size={15} aria-hidden="true" />
            Saved Trips
            <span>{savedTrips.length}</span>
          </button>
        </div>
      </header>

      {/* Error message display */}
      {error ? <p className="form-error favorites-status">{error}</p> : null}

      {/* Loading state */}
      {isLoading ? (
        <div className="favorites-empty">
          <LoaderCircle className="explore-spin" size={32} aria-hidden="true" />
          <p>Loading favourites...</p>
        </div>
      ) : activeView === 'places' ? (
        /* Places view - displays individual saved locations */
        <section className="favorites-panel" aria-label="Saved places">
          {/* Toolbar with search, filter, and sort controls */}
          <div className="favorites-toolbar">
            <label className="favorites-search">
              <Search size={16} aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search saved places"
                aria-label="Search saved places"
              />
            </label>
            <label className="favorites-select">
              <MapPin size={16} aria-hidden="true" />
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter favourite type">
                <option value="all">All types</option>
                <option value="attraction">Attractions</option>
                <option value="hotel">Hotels</option>
                <option value="restaurant">Restaurants</option>
                <option value="location">Locations</option>
              </select>
            </label>
            <label className="favorites-select">
              <ArrowDownUp size={16} aria-hidden="true" />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort saved places">
                <option value="rating">Highest rating</option>
                <option value="price">Cheapest price</option>
              </select>
            </label>
          </div>

          {/* Grid of visible places or empty state */}
          {visiblePlaces.length ? (
            <div className="favorites-grid">
              {visiblePlaces.map((favorite) => (
                <FavoriteCard
                  favorite={favorite}
                  key={favorite._id}
                  onOpen={handleOpenOnMap}
                  onRemove={setPendingDelete}
                />
              ))}
            </div>
          ) : (
            <div className="favorites-empty favorites-empty-compact">
              <Building2 size={34} aria-hidden="true" />
              <h3>{placeFavorites.length ? 'No saved places match' : 'No saved places yet'}</h3>
              <p>{placeFavorites.length ? 'Try changing the current search or filters.' : 'Save hotels, restaurants, attractions, or locations to see them here.'}</p>
              {!placeFavorites.length ? <Link to="/explore">Explore places</Link> : null}
            </div>
          )}
        </section>
      ) : savedTrips.length ? (
        /* Trips view - displays saved trips with their itineraries */
        <section className="favorite-trips-layout" aria-label="Saved trips">
          {/* Sidebar with list of saved trips */}
          <aside className="favorite-trip-list">
            <div className="favorite-trip-list-heading">
              <span>Saved trips</span>
              <strong>{savedTrips.length}</strong>
            </div>
            {savedTrips.map(({ favorite, trip, tripId }) => (
              <button
                className={activeTripId === tripId ? 'active' : ''}
                type="button"
                key={favorite._id}
                onClick={() => setSelectedTripId(tripId)}
              >
                <CalendarDays size={16} aria-hidden="true" />
                <span>
                  <strong>{trip.title || trip.destination}</strong>
                  <small>{formatDateRange(trip.startDate, trip.endDate)}</small>
                </span>
              </button>
            ))}
          </aside>

          {/* Detail view for selected trip */}
          <div className="favorite-trip-detail">
            <div className="favorite-trip-detail-heading">
              <div>
                <span>Favourite trip</span>
                <h3>{selectedSavedTrip?.trip.title || selectedSavedTrip?.trip.destination}</h3>
                <p>{formatDateRange(selectedSavedTrip?.trip.startDate, selectedSavedTrip?.trip.endDate)}</p>
              </div>
              <button type="button" onClick={() => setPendingDelete(selectedSavedTrip?.favorite)}>
                Remove trip favourite
              </button>
            </div>

            {/* Grid of trip places or empty state */}
            {selectedTripPlaces.length ? (
              <div className="favorites-grid">
                {selectedTripPlaces.map((favorite) => (
                  <FavoriteCard
                    favorite={favorite}
                    key={favorite._id}
                    onOpen={handleOpenOnMap}
                  />
                ))}
              </div>
            ) : (
              <div className="favorites-empty favorites-empty-compact">
                <MapPin size={32} aria-hidden="true" />
                <h3>No places planned yet</h3>
                <p>Places added to this trip will appear here.</p>
              </div>
            )}
          </div>
        </section>
      ) : (
        /* Empty state when no saved trips exist */
        <div className="favorites-empty">
          <Heart size={34} aria-hidden="true" />
          <h3>No saved trips yet</h3>
          <p>Use the heart button on a trip card to save it here.</p>
          <Link to="/trips">View trips</Link>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <FavoriteDeleteDialog
        favorite={pendingDelete}
        isDeleting={isDeleting}
        onCancel={() => {
          if (!isDeleting) setPendingDelete(null);
        }}
        onConfirm={handleConfirmRemove}
      />
    </section>
  );
}

export default FavoritesPage;
