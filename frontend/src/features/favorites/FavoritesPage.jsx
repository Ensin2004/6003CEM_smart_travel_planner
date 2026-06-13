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

const placeTypes = ['attraction', 'hotel', 'restaurant', 'location'];

const isTripFavorite = (favorite) => (
  favorite.type === 'location'
  && favorite.source === 'trips'
  && String(favorite.externalId || '').startsWith('trip-')
);

const getTripIdFromFavorite = (favorite) => String(favorite.externalId || '').replace(/^trip-/, '');

const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Dates not set';
  return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
};

const getNumericPrice = (value) => {
  const match = String(value || '').replace(/,/g, '').match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
};

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

function FavoritesPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [trips, setTrips] = useState([]);
  const [tripItineraries, setTripItineraries] = useState({});
  const [activeView, setActiveView] = useState('places');
  const [selectedTripId, setSelectedTripId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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

  const tripFavorites = useMemo(() => favorites.filter(isTripFavorite), [favorites]);
  const placeFavorites = useMemo(
    () => favorites.filter((favorite) => placeTypes.includes(favorite.type) && !isTripFavorite(favorite)),
    [favorites]
  );

  const savedTrips = useMemo(() => tripFavorites.map((favorite) => {
    const tripId = getTripIdFromFavorite(favorite);
    const trip = trips.find((currentTrip) => String(currentTrip._id) === tripId);
    return trip ? { favorite, trip, tripId } : null;
  }).filter(Boolean), [tripFavorites, trips]);

  const activeTripId = savedTrips.some(({ tripId }) => tripId === selectedTripId)
    ? selectedTripId
    : savedTrips[0]?.tripId || '';

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

  const selectedSavedTrip = savedTrips.find(({ tripId }) => tripId === activeTripId);
  const selectedTripPlaces = (tripItineraries[activeTripId]?.items || []).map(itineraryItemToFavorite);

  const handleOpenOnMap = (favorite) => {
    navigate('/map', { state: { selectedFavorite: favorite } });
  };

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

      {error ? <p className="form-error favorites-status">{error}</p> : null}

      {isLoading ? (
        <div className="favorites-empty">
          <LoaderCircle className="explore-spin" size={32} aria-hidden="true" />
          <p>Loading favourites...</p>
        </div>
      ) : activeView === 'places' ? (
        <section className="favorites-panel" aria-label="Saved places">
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
        <section className="favorite-trips-layout" aria-label="Saved trips">
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
        <div className="favorites-empty">
          <Heart size={34} aria-hidden="true" />
          <h3>No saved trips yet</h3>
          <p>Use the heart button on a trip card to save it here.</p>
          <Link to="/trips">View trips</Link>
        </div>
      )}

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
