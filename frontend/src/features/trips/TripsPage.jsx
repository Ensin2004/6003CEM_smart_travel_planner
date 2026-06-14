/**
 * Trip planning screen for manual and AI-assisted trip creation.
 * This file keeps the form state, country/state loading, trip search, and
 * trip form side effects together because those controls update the same draft trip.
 */
import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  Heart,
  Info,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  MoreVertical,
  Plane,
  Plus,
  Search,
  Star,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { addFavorite, getFavorites, removeFavorite } from '../../api/favoriteApi';
import { getTripItinerary } from '../../api/itineraryApi';
import { createTrip, deleteTrip, getTrips } from '../../api/tripApi';
import CompareButton from '../../components/compare/CompareButton';
import TripMapPreview from '../../components/trips/TripMapPreview';
import CurrencyContext from '../../context/currencyContext';
import { buildTripFavoritePayload } from '../../utils/favoriteUtils';
import './TripsPage.css';

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const defaultPreviewPlaces = [
  { city: 'Penang', country: 'Malaysia' },
  { city: 'Singapore', country: 'Singapore' },
];
const tripFilters = ['All Trips', 'Active', 'Upcoming', 'Past', 'Drafts', 'Favorites'];

// Date helpers keep exact-date and flexible-date planning consistent before the payload is built.

// Flexible trip planning starts from upcoming months instead of exact departure dates.
const getMonthOptions = () => Array.from({ length: 12 }, (_, index) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + index);

  return {
    value: date.toISOString().slice(0, 7),
    label: date.toLocaleDateString(undefined, { month: 'long' }),
    year: date.getFullYear(),
  };
});

// The flexible range uses the first day of the selected month and expands by the selected day count.
const getFlexibleDateRange = (monthValue, days) => {
  const [year, month] = String(monthValue || today.slice(0, 7)).split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(start);
  end.setDate(start.getDate() + Math.max(1, Number(days) || 1) - 1);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

// New segments inherit the current trip date range so multi-city planning starts with useful defaults.
const createEmptySegment = (order = 1, startDate = today, endDate = tomorrow) => ({
  city: '',
  country: '',
  countryCode: '',
  startDate,
  endDate,
  order,
});

// API and display helpers keep response parsing and date labels outside the component body.
const normalizeTripList = (response) => response.data?.data?.trips || [];

const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Dates not set';
  return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
};

const getDurationDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(1, Math.ceil(diff / 86400000) + 1);
};
const getTripStatus = (trip, itineraryDays = []) => {
  if (!trip.destinationSegments?.length && trip.destination === 'Not added yet' && !getItineraryDestinationPlaces(itineraryDays).length) return 'Draft';

  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const todayDate = new Date(today);

  if (end < todayDate) return 'Past';
  if (start > todayDate) return 'Upcoming';
  return 'Active';
};
const getTripProgress = (trip, itineraryDays = []) => {
  const status = getTripStatus(trip, itineraryDays);
  if (status === 'Draft') return { label: '0% planned', percent: 0 };
  if (status === 'Past') return { label: 'Completed', percent: 100 };
  if (status === 'Upcoming') return { label: '20% planned', percent: 20 };
  return { label: '60% planned', percent: 60 };
};

const getSegmentDestinationName = (segment = {}) => (segment.city || segment.country || '').trim();
const getItineraryDestinationPlaces = (days = []) => {
  const places = days
    .filter((day) => day.location?.name || day.location?.country)
    .map((day) => ({
      city: day.location?.name,
      country: day.location?.country,
      address: [day.location?.name, day.location?.country].filter(Boolean).join(', '),
      lat: day.location?.coordinates?.latitude,
      lng: day.location?.coordinates?.longitude,
    }));

  return [...new Map(places.map((place) => [[place.city, place.country].filter(Boolean).join('|'), place])).values()];
};
const getTripDestinationLabel = (trip, itineraryDays = []) => {
  const itineraryPlaces = getItineraryDestinationPlaces(itineraryDays);
  if (itineraryPlaces.length) {
    return itineraryPlaces.map((place) => [place.city, place.country].filter(Boolean).join(', ')).join(' • ');
  }

  return [trip.destination, trip.country].filter(Boolean).join(', ') || 'Not decided';
};

// Trip comparison items use trip-level details when place-level details are not available.
const getTripCompareItem = (trip, itineraryDays = []) => ({
  id: trip._id,
  name: trip.title || trip.destination,
  category: trip.planningMode === 'ai' ? 'AI assisted trip' : 'Manual trip',
  source: 'trips',
  price: trip.budget?.totalAmount
    ? `${trip.budget.currency || 'MYR'} ${Number(trip.budget.totalAmount).toLocaleString()}`
    : 'Budget unavailable',
  hours: formatDateRange(trip.startDate, trip.endDate),
  address: getTripDestinationLabel(trip, itineraryDays),
});

// The component owns the full create-trip workflow, from draft form state to final navigation.
function TripsPage() {
  const navigate = useNavigate();
  const currency = useContext(CurrencyContext);
  const activeCurrencyCode = currency?.activeCurrency?.code || currency?.selectedCurrency || 'MYR';

  // Screen state is grouped around the create form, trip list, country selectors, and save feedback.
  // Country and state options are kept separate because selecting a country refreshes only one dropdown.
  // View state controls whether the page shows the create form or the saved-trip directory.
  const [activeView, setActiveView] = useState('create');
  const [tripFilter, setTripFilter] = useState('All Trips');
  const [tripSort, setTripSort] = useState('recent');
  const [trips, setTrips] = useState([]);
  const [tripItineraryDays, setTripItineraryDays] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [favoriteMessage, setFavoriteMessage] = useState('');
  const [savingFavoriteTripId, setSavingFavoriteTripId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [openTripMenuId, setOpenTripMenuId] = useState('');
  const [tripToDelete, setTripToDelete] = useState(null);
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);

  // Form state mirrors the backend trip payload closely so submission needs minimal remapping.
  const [form, setForm] = useState({
    title: '',
    startDate: today,
    endDate: tomorrow,
    dateMode: 'exact',
    flexibleWindowDays: 3,
    flexibleMonth: today.slice(0, 7),
    budgetAmount: '',
    destinationSegments: [createEmptySegment()],
  });

  // Initial trip loading populates the recent trip list and search results.
  useEffect(() => {
    let isMounted = true;

    getTrips()
      .then((response) => {
        if (!isMounted) return;
        setTrips(normalizeTripList(response));
        setStatus('success');
      })
      .catch((error) => {
        if (!isMounted) return;
        setStatus('error');
        setMessage(error.response?.data?.message || 'Unable to load trips.');
      });

    // Cleanup prevents state updates after the user navigates away.
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!openTripMenuId) return undefined;

    const closeOpenTripMenu = (event) => {
      if (!event.target.closest('.trip-dashboard-card-menu')) setOpenTripMenuId('');
    };
    document.addEventListener('mousedown', closeOpenTripMenu);
    return () => document.removeEventListener('mousedown', closeOpenTripMenu);
  }, [openTripMenuId]);

  useEffect(() => {
    let isMounted = true;

    if (!trips.length) {
      Promise.resolve().then(() => {
        if (isMounted) setTripItineraryDays({});
      });
      return () => {
        isMounted = false;
      };
    }

    Promise.allSettled(trips.map(async (trip) => {
      const response = await getTripItinerary(trip._id);
      return [trip._id, response.data?.data?.days || []];
    })).then((results) => {
      if (!isMounted) return;
      setTripItineraryDays(Object.fromEntries(
        results
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value)
      ));
    });

    return () => {
      isMounted = false;
    };
  }, [trips]);

  // Trip favourites are identified by their trip external id so saved place coordinates cannot collide with trip cards.
  const tripFavorites = useMemo(
    () => favorites.filter((favorite) => (
      favorite.type === 'location'
      && favorite.source === 'trips'
      && String(favorite.externalId || '').startsWith('trip-')
    )),
    [favorites]
  );
  const tripFavoriteLookup = useMemo(
    () => Object.fromEntries(tripFavorites.map((favorite) => [favorite.externalId, favorite])),
    [tripFavorites]
  );
  const tripStatusCounts = trips.reduce((counts, trip) => {
    const statusName = getTripStatus(trip, tripItineraryDays[trip._id] || []).toLowerCase();
    return { ...counts, [statusName]: (counts[statusName] || 0) + 1 };
  }, { active: 0, upcoming: 0, past: 0, draft: 0 });
  const filteredDashboardTrips = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filteredTrips = trips.filter((trip) => {
      const itineraryDays = tripItineraryDays[trip._id] || [];
      const matchesFilter = tripFilter === 'All Trips'
        || (tripFilter === 'Favorites' && Boolean(tripFavoriteLookup[`trip-${trip._id}`]))
        || getTripStatus(trip, itineraryDays) === tripFilter.replace(/s$/, '');
      const destinationLabel = getTripDestinationLabel(trip, itineraryDays);
      const matchesSearch = !query || [trip.title, trip.destination, trip.country, destinationLabel]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    });

    return [...filteredTrips].sort((leftTrip, rightTrip) => {
      if (tripSort === 'startDate') return new Date(leftTrip.startDate) - new Date(rightTrip.startDate);
      return new Date(rightTrip.updatedAt || rightTrip.createdAt || rightTrip.startDate) - new Date(leftTrip.updatedAt || leftTrip.createdAt || leftTrip.startDate);
    });
  }, [searchQuery, tripFavoriteLookup, tripFilter, tripItineraryDays, tripSort, trips]);

  const previewSegments = form.destinationSegments.filter((segment) => getSegmentDestinationName(segment));
  const totalBudget = Number(form.budgetAmount || 0);
  // Preview values are recalculated from the draft form so the summary stays accurate while typing.
  const flexibleMonthOptions = useMemo(() => getMonthOptions(), []);
  const displayedDateRange = form.dateMode === 'flexible'
    ? getFlexibleDateRange(form.flexibleMonth, form.flexibleWindowDays)
    : { startDate: form.startDate, endDate: form.endDate };
  const durationDays = getDurationDays(displayedDateRange.startDate, displayedDateRange.endDate);

  useEffect(() => {
    let isMounted = true;

    getFavorites()
      .then((response) => {
        if (isMounted) setFavorites(response.data?.data?.favorites || []);
      })
      .catch(() => {
        if (isMounted) setFavorites([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getTripFavoriteRecord = (trip) => {
    return tripFavoriteLookup[`trip-${trip._id}`];
  };

  const handleTripFavoriteToggle = async (event, trip) => {
    event.preventDefault();
    event.stopPropagation();
    if (savingFavoriteTripId) return;

    setSavingFavoriteTripId(trip._id);
    setFavoriteMessage('');

    try {
      const existingFavorite = getTripFavoriteRecord(trip);

      if (existingFavorite?._id) {
        await removeFavorite(existingFavorite._id);
        setFavorites((currentFavorites) => currentFavorites.filter((favorite) => favorite._id !== existingFavorite._id));
        setFavoriteMessage('Trip removed from favourites.');
        return;
      }

      const response = await addFavorite(buildTripFavoritePayload(trip));
      const favorite = response.data?.data?.favorite;
      if (favorite) {
        setFavorites((currentFavorites) => {
          const withoutDuplicate = currentFavorites.filter((currentFavorite) => currentFavorite._id !== favorite._id);
          return [favorite, ...withoutDuplicate];
        });
      }
      setFavoriteMessage('Trip saved to favourites.');
    } catch (error) {
      setFavoriteMessage(error.response?.data?.message || 'Unable to update favourite right now.');
    } finally {
      setSavingFavoriteTripId('');
    }
  };

  const handleDeleteTrip = async () => {
    if (!tripToDelete?._id || isDeletingTrip) return;

    setIsDeletingTrip(true);
    setMessage('');
    setFavoriteMessage('');
    try {
      await deleteTrip(tripToDelete._id);
      setTrips((currentTrips) => currentTrips.filter((trip) => trip._id !== tripToDelete._id));
      setFavorites((currentFavorites) => currentFavorites.filter((favorite) => favorite.externalId !== `trip-${tripToDelete._id}`));
      setTripToDelete(null);
      setFavoriteMessage('Trip deleted successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to delete the trip.');
    } finally {
      setIsDeletingTrip(false);
    }
  };

  // Simple field updates clear the previous validation error so fresh input gets a clean attempt.
  const updateField = (field, value) => {
    setFormError('');
    setForm((current) => ({ ...current, [field]: value }));
  };

  // Client-side validation catches the most common form mistakes before sending an API request.
  const validateForm = () => {
    if (!form.title.trim()) return 'Trip title is required.';
    if (form.dateMode === 'exact' && new Date(form.endDate) < new Date(form.startDate)) return 'Trip end date cannot be before start date.';
    if (!Number.isFinite(totalBudget) || totalBudget < 0) return 'Budget must be a valid number.';

    return '';
  };

  // Submission builds the final trip payload and optionally creates a matching packing list.
  const handleSubmit = async (event) => {
    event.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    setIsSaving(true);
    setFormError('');

    // Flexible trips use generated dates; exact trips keep the dates selected for each segment.
    const submitDates = form.dateMode === 'flexible'
      ? getFlexibleDateRange(form.flexibleMonth, form.flexibleWindowDays)
      : { startDate: form.startDate, endDate: form.endDate };

    // Destination planning now starts after creation, so the trip uses a clear placeholder summary.
    const payload = {
      title: form.title.trim(),
      destination: 'Not added yet',
      country: '',
      startDate: submitDates.startDate,
      endDate: submitDates.endDate,
      planningMode: 'self',
      budget: {
        totalAmount: Number(form.budgetAmount || 0),
        dailyLimit: 0,
        currency: activeCurrencyCode,
      },
      destinationSegments: [],
      dateFlexibility: {
        mode: form.dateMode,
        windowDays: form.dateMode === 'flexible' ? Number(form.flexibleWindowDays) : 0,
        preferredMonth: form.dateMode === 'flexible'
          ? flexibleMonthOptions.find((month) => month.value === form.flexibleMonth)?.label || ''
          : '',
      },
      travelPreferences: {
        styles: [],
        pace: 'moderate',
        accommodation: 'comfort',
      },
      documentChecklist: {
        enabled: false,
        documentTypes: [],
      },
      notes: [],
    };

    try {
      const response = await createTrip(payload);
      const trip = response.data?.data?.trip;

      navigate(`/trips/${trip._id}`);
    } catch (error) {
      const validationMessages = error.response?.data?.errors?.map((item) => item.message).filter(Boolean);
      setFormError(validationMessages?.[0] || error.response?.data?.message || 'Unable to create trip.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="trips-page trips-page-comfort" aria-labelledby="trips-page-title">
      <header className="trips-dashboard-header">
        <div>
          <h2 id="trips-page-title">My Trips</h2>
          <p>All your trips in one place. Plan, organize, and relive your adventures.</p>
        </div>
        <div className="trips-dashboard-actions" role="tablist" aria-label="Trip menu">
          <button
            className={activeView === 'create' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeView === 'create'}
            onClick={() => setActiveView('create')}
          >
            <Plus size={16} aria-hidden="true" />
            Create Trip
          </button>
          <button
            className={activeView === 'my-trips' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeView === 'my-trips'}
            onClick={() => setActiveView('my-trips')}
          >
            <ListChecks size={16} aria-hidden="true" />
            My Trips
            <span className="trip-count-badge">{trips.length}</span>
          </button>
        </div>
      </header>

      {message && <p className="form-error trips-status" role="alert">{message}</p>}
      {favoriteMessage && <p className="form-success trips-status" role="status">{favoriteMessage}</p>}

      {activeView === 'my-trips' ? (
        <section className="trip-dashboard-panel" aria-labelledby="my-trips-title">
          <div className="trip-dashboard-toolbar">
            <div className="trip-dashboard-filters" aria-label="Trip filters">
              {tripFilters.map((filter) => (
                <button
                  className={tripFilter === filter ? 'active' : ''}
                  type="button"
                  key={filter}
                  onClick={() => setTripFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
            <label className="trip-dashboard-sort">
              <select value={tripSort} onChange={(event) => setTripSort(event.target.value)} aria-label="Sort trips">
                <option value="recent">Recently updated</option>
                <option value="startDate">Start date</option>
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </label>
          </div>

          <div className="trip-dashboard-stats" aria-label="Trip summary">
            <span>
              <i><Plane size={19} aria-hidden="true" /></i>
              <small>Total Trips</small>
              <strong>{trips.length}</strong>
              <em>All time</em>
            </span>
            <span>
              <i><CalendarDays size={19} aria-hidden="true" /></i>
              <small>Active</small>
              <strong>{tripStatusCounts.active}</strong>
              <em>Currently in progress</em>
            </span>
            <span>
              <i><Clock3 size={19} aria-hidden="true" /></i>
              <small>Upcoming</small>
              <strong>{tripStatusCounts.upcoming}</strong>
              <em>Planned trips</em>
            </span>
            <span>
              <i><CheckCircle2 size={19} aria-hidden="true" /></i>
              <small>Past</small>
              <strong>{tripStatusCounts.past}</strong>
              <em>Completed trips</em>
            </span>
            <span>
              <i><Heart size={19} aria-hidden="true" /></i>
              <small>Saved Trips</small>
              <strong>{tripFavorites.length}</strong>
              <em>Trip favourites</em>
            </span>
          </div>

          <div className="trip-dashboard-heading">
            <h3 id="my-trips-title">Your Trips</h3>
            <label className="trip-search-field trip-search-field-large">
              <Search size={16} aria-hidden="true" />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search trips" />
            </label>
          </div>

          {status === 'loading' ? (
            <p className="settings-empty"><LoaderCircle className="trip-spin" size={16} aria-hidden="true" /> Loading trips...</p>
          ) : filteredDashboardTrips.length === 0 ? (
            <div className="trip-empty-state">
              <MapPin size={30} aria-hidden="true" />
              <h3>No trips found</h3>
              <p>Create a trip or adjust the filter to see more plans.</p>
              <button type="button" onClick={() => setActiveView('create')}>Create trip</button>
            </div>
          ) : (
            <div className="trip-dashboard-grid">
              {filteredDashboardTrips.map((trip, index) => {
                const tripDays = getDurationDays(trip.startDate, trip.endDate);
                const itineraryDays = tripItineraryDays[trip._id] || [];
                const statusName = getTripStatus(trip, itineraryDays);
                const progress = getTripProgress(trip, itineraryDays);
                const destinationLabel = getTripDestinationLabel(trip, itineraryDays);
                const favoriteRecord = getTripFavoriteRecord(trip);
                const isFavoriteTrip = Boolean(favoriteRecord?._id);
                const tripTitle = trip.title || trip.destination;

                return (
                  <article className="trip-dashboard-card" key={trip._id}>
                    <div className={`trip-dashboard-card-image trip-photo-${index % 5}`}>
                      <Link className="trip-dashboard-card-image-link" to={`/trips/${trip._id}`} aria-label={`Open ${tripTitle}`} />
                      <span className={`trip-status-pill is-${statusName.toLowerCase()}`}>{statusName}</span>
                      <button
                        className={`trip-dashboard-favorite ${isFavoriteTrip ? 'active' : ''}`}
                        type="button"
                        aria-label={isFavoriteTrip ? `Remove ${tripTitle} from favourites` : `Add ${tripTitle} to favourites`}
                        disabled={savingFavoriteTripId === trip._id}
                        onClick={(event) => handleTripFavoriteToggle(event, trip)}
                      >
                        {savingFavoriteTripId === trip._id ? (
                          <LoaderCircle className="trip-spin" size={17} aria-hidden="true" />
                        ) : (
                          <Heart size={17} fill={isFavoriteTrip ? 'currentColor' : 'none'} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    <div className="trip-dashboard-card-body">
                      <div className="trip-dashboard-card-title">
                        <Link to={`/trips/${trip._id}`}>{tripTitle}</Link>
                        <div className="trip-dashboard-card-menu">
                          <button
                            type="button"
                            aria-label={`More options for ${tripTitle}`}
                            aria-expanded={openTripMenuId === trip._id}
                            onClick={() => setOpenTripMenuId((currentId) => (currentId === trip._id ? '' : trip._id))}
                          >
                            <MoreVertical size={17} aria-hidden="true" />
                          </button>
                          {openTripMenuId === trip._id ? (
                            <div role="menu">
                              <Link role="menuitem" to={`/trips/${trip._id}`}>View trip</Link>
                              <button
                                className="danger"
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenTripMenuId('');
                                  setTripToDelete(trip);
                                }}
                              >
                                <Trash2 size={15} aria-hidden="true" />
                                Delete trip
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="trip-dashboard-card-meta">
                        <span><CalendarDays size={14} aria-hidden="true" />{formatDateRange(trip.startDate, trip.endDate)}</span>
                        <span><Clock3 size={14} aria-hidden="true" />{Math.max(0, tripDays - 1)} night{tripDays - 1 === 1 ? '' : 's'} ({tripDays} day{tripDays === 1 ? '' : 's'})</span>
                        <span><MapPin size={14} aria-hidden="true" />{destinationLabel}</span>
                        <span><WalletCards size={14} aria-hidden="true" />{trip.budget?.totalAmount ? `${trip.budget.currency || 'MYR'} ${Number(trip.budget.totalAmount).toLocaleString()}` : '-'}</span>
                      </div>
                      <div className="trip-dashboard-progress" aria-label={`${progress.label} progress`}>
                        <span><em style={{ width: `${progress.percent}%` }} /></span>
                        <small>{progress.label}</small>
                      </div>
                      <CompareButton compact item={getTripCompareItem(trip, itineraryDays)} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
      <div className="trip-reference-layout">
        <form className="trip-reference-form" onSubmit={handleSubmit}>
          <div className="trip-reference-form-heading">
            <span>Create a Trip</span>
            <p>Set the basic trip details first. Places, route, packing list, and documents can be managed after creation.</p>
          </div>

          <label className="trip-reference-field trip-reference-field-full">
            <span>Trip Name</span>
            <small>Give your trip a name you'll love.</small>
            <div className="trip-reference-input">
              <CalendarDays size={16} aria-hidden="true" />
              <input
                maxLength={60}
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                placeholder="Penang & Singapore Adventure"
              />
              <em>{form.title.length}/60</em>
            </div>
          </label>

          <div className="trip-reference-date-row">
            <label className="trip-reference-field">
              <span>Start Date</span>
              <small>When does your trip start?</small>
              <div className="trip-reference-input">
                <CalendarDays size={16} aria-hidden="true" />
                <input type="date" value={form.startDate} onChange={(event) => updateField('startDate', event.target.value)} />
              </div>
            </label>
            <ArrowRight className="trip-reference-date-arrow" size={18} aria-hidden="true" />
            <label className="trip-reference-field">
              <span>End Date</span>
              <small>When does your trip end?</small>
              <div className="trip-reference-input">
                <CalendarDays size={16} aria-hidden="true" />
                <input type="date" value={form.endDate} onChange={(event) => updateField('endDate', event.target.value)} />
              </div>
            </label>
          </div>

          <div className="trip-reference-field trip-reference-field-full">
            <span>Total Duration</span>
            <div className="trip-duration-banner">
              <CalendarDays size={16} aria-hidden="true" />
              <strong>Total duration: {Math.max(0, durationDays - 1)} night{durationDays - 1 === 1 ? '' : 's'} ({durationDays} day{durationDays === 1 ? '' : 's'})</strong>
            </div>
          </div>

          <label className="trip-reference-field trip-reference-field-full">
            <span>Total Budget</span>
            <small>Set your estimated budget for the entire trip.</small>
            <div className="trip-budget-input-row">
              <select value={activeCurrencyCode} disabled aria-label="Budget currency">
                <option>{activeCurrencyCode}</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budgetAmount}
                onChange={(event) => updateField('budgetAmount', event.target.value)}
                placeholder="2500.00"
              />
            </div>
          </label>

          <p className="trip-reference-info">
            <Info size={16} aria-hidden="true" />
            You can always adjust your budget later.
          </p>

          {formError && <p className="form-error trips-status" role="alert">{formError}</p>}

          <button className="trip-reference-submit" type="submit" disabled={isSaving}>
            {isSaving ? <LoaderCircle className="trip-spin" size={18} aria-hidden="true" /> : null}
            Create Trip
            <ArrowRight size={18} aria-hidden="true" />
          </button>

          <p className="trip-reference-after">
            <LockKeyhole size={13} aria-hidden="true" />
            You can edit everything later
          </p>
        </form>

        <aside className="trip-reference-side" aria-label="Trip creation preview">
          <section className="trip-reference-preview">
            <header>
              <h3>Trip Preview</h3>
              <button type="button">
                <Eye size={15} aria-hidden="true" />
                Preview
              </button>
            </header>
            <TripMapPreview places={previewSegments.length ? previewSegments : defaultPreviewPlaces} />
            <div className="trip-reference-preview-meta">
              <span><CalendarDays size={16} aria-hidden="true" />{formatDateRange(displayedDateRange.startDate, displayedDateRange.endDate)}</span>
              <span><CalendarDays size={16} aria-hidden="true" />{Math.max(0, durationDays - 1)} night{durationDays - 1 === 1 ? '' : 's'} ({durationDays} day{durationDays === 1 ? '' : 's'})</span>
              <span><WalletCards size={16} aria-hidden="true" />Budget: <strong>{totalBudget > 0 ? (currency?.formatAmount ? currency.formatAmount(totalBudget, activeCurrencyCode) : `${activeCurrencyCode} ${totalBudget.toLocaleString()}`) : `${activeCurrencyCode} 0`}</strong></span>
              <span><MapPin size={16} aria-hidden="true" />Destinations: Not added yet</span>
            </div>
            <p className="trip-reference-next">
              <Info size={16} aria-hidden="true" />
              <strong>Next step: Add the places you'll visit and plan your route.</strong>
            </p>
          </section>

          <section className="trip-reference-benefits">
            <h3>Why create a trip?</h3>
            <div>
              <span><Star size={17} aria-hidden="true" /></span>
              <p><strong>Personalized recommendations</strong>Get ideas that match your interests, dates, and budget.</p>
            </div>
            <div>
              <span><CalendarDays size={17} aria-hidden="true" /></span>
              <p><strong>Smart itinerary planning</strong>Easily organize your days and activities.</p>
            </div>
            <div>
              <span><WalletCards size={17} aria-hidden="true" /></span>
              <p><strong>Budget made simple</strong>Track expenses and stay within your budget.</p>
            </div>
            <div>
              <span><ListChecks size={17} aria-hidden="true" /></span>
              <p><strong>Everything in one place</strong>Access your plans anytime, anywhere.</p>
            </div>
          </section>
        </aside>
      </div>
      )}

      {tripToDelete ? (
        <div className="trip-delete-dialog-backdrop" role="presentation" onMouseDown={() => !isDeletingTrip && setTripToDelete(null)}>
          <section
            className="trip-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-delete-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="trip-delete-dialog-close"
              type="button"
              aria-label="Close confirmation"
              disabled={isDeletingTrip}
              onClick={() => setTripToDelete(null)}
            >
              <X size={19} aria-hidden="true" />
            </button>
            <div className="trip-delete-dialog-icon">
              <Trash2 size={22} aria-hidden="true" />
            </div>
            <div>
              <span>Delete trip</span>
              <h3 id="trip-delete-dialog-title">Delete {tripToDelete.title || tripToDelete.destination}?</h3>
              <p>This permanently removes the trip from My Trips. This action cannot be undone.</p>
            </div>
            <div className="trip-delete-dialog-actions">
              <button type="button" disabled={isDeletingTrip} onClick={() => setTripToDelete(null)}>Cancel</button>
              <button className="danger" type="button" disabled={isDeletingTrip} onClick={handleDeleteTrip}>
                {isDeletingTrip ? <LoaderCircle className="trip-spin" size={16} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
                {isDeletingTrip ? 'Deleting...' : 'Delete trip'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default TripsPage;
