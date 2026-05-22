import {
  Building2,
  Compass,
  ExternalLink,
  Image,
  LoaderCircle,
  MapPin,
  MapPinned,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  Utensils,
} from 'lucide-react';
import { Country, State } from 'country-state-city';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchAttractions, searchHotels, searchRestaurants } from '../../api/exploreApi';
import { foodCategoryOptions, roomTypeOptions } from './explore.constants';
import './ExplorePage.css';

const viewOptions = [
  { id: 'discover', label: 'AI Discovery', icon: Sparkles },
  { id: 'attractions', label: 'Attractions', icon: MapPinned },
  { id: 'food', label: 'Restaurants / Food', icon: Utensils },
  { id: 'hotels', label: 'Hotels / Rooms', icon: Building2 },
  { id: 'transport', label: 'Transportation', icon: Compass },
];

const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data?.error || error.message || 'Unable to search right now.';

function ExplorePage() {
  const [searchParams] = useSearchParams();
  const activeView = searchParams.get('view') || 'discover';
  const [destination, setDestination] = useState('');
  const [attractions, setAttractions] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [hotelFilters, setHotelFilters] = useState({
    country: '',
    countryCode: '',
    state: '',
    roomType: '',
  });
  const [restaurantFilters, setRestaurantFilters] = useState({
    country: '',
    countryCode: '',
    state: '',
    foodCategory: '',
  });
  const [hotelSearchCriteria, setHotelSearchCriteria] = useState(null);
  const [restaurantSearchCriteria, setRestaurantSearchCriteria] = useState(null);
  const [nextHotelStart, setNextHotelStart] = useState(0);
  const [nextRestaurantStart, setNextRestaurantStart] = useState(0);
  const [hasMoreHotels, setHasMoreHotels] = useState(false);
  const [hasMoreRestaurants, setHasMoreRestaurants] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const activeOption = useMemo(
    () => viewOptions.find((option) => option.id === activeView) || viewOptions[0],
    [activeView]
  );
  const ActiveIcon = activeOption.icon;
  const isAttractionsView = activeOption.id === 'attractions';
  const isFoodView = activeOption.id === 'food';
  const isHotelsView = activeOption.id === 'hotels';
  const isFilteredSearchView = isHotelsView || isFoodView;
  const isSearchView = isAttractionsView || isFilteredSearchView;
  const activeItems = isHotelsView ? hotels : isFoodView ? restaurants : attractions;
  const activeFilters = isFoodView ? restaurantFilters : hotelFilters;
  const countryOptions = useMemo(() => Country.getAllCountries(), []);
  const stateOptions = useMemo(
    () => (activeFilters.countryCode ? State.getStatesOfCountry(activeFilters.countryCode) : []),
    [activeFilters.countryCode]
  );
  const selectedRoomLabel = roomTypeOptions.find((option) => option.value === hotelFilters.roomType)?.label || 'Any room';
  const selectedFoodCategoryLabel =
    foodCategoryOptions.find((option) => option.value === restaurantFilters.foodCategory)?.label || 'Any food';
  const filteredSearchLabel = [
    destination.trim(),
    activeFilters.state.trim(),
    activeFilters.country.trim(),
    isHotelsView && hotelFilters.roomType ? selectedRoomLabel : '',
    isFoodView && restaurantFilters.foodCategory ? selectedFoodCategoryLabel : '',
  ]
    .filter(Boolean)
    .join(', ');
  const resultCount = activeItems.length;
  const ratedCount = activeItems.filter((item) => item.rating).length;
  const topRatedCount = activeItems.filter((item) => item.rating >= 4.5).length;
  const pricedCount = activeItems.filter((item) => item.price).length;
  const hasResults = resultCount > 0;
  const destinationLabel = isFilteredSearchView ? filteredSearchLabel || 'None' : destination.trim() || 'None';
  const searchConfig = isHotelsView
    ? {
        finderLabel: 'Hotel finder',
        searchTitle: 'Search for hotels',
        resultLabel: 'Hotel results',
        emptyTitle: 'No hotels loaded yet',
        emptyText: 'Search by hotel name, country, or location, or use the filters to discover matching hotel cards.',
        readyText: 'Search text or filters can begin',
        matchesLabel: 'hotel matches',
      }
    : isFoodView
      ? {
          finderLabel: 'Food finder',
          searchTitle: 'Search for food',
          resultLabel: 'Restaurant results',
          emptyTitle: 'No restaurants loaded yet',
          emptyText: 'Search by restaurant name, country, or location, or use the food category filter to discover matching restaurant cards.',
          readyText: 'Search text or filters can begin',
          matchesLabel: 'restaurant matches',
        }
    : {
        finderLabel: 'Attraction finder',
        searchTitle: 'Search by destination',
        resultLabel: 'Attraction results',
        emptyTitle: 'No attractions loaded yet',
        emptyText: 'Search a destination to see attraction cards with photos, ratings, reviews, and addresses.',
        readyText: 'Search a city to begin',
        matchesLabel: 'curated matches',
      };

  const handleAttractionsSearch = async (event) => {
    event.preventDefault();

    if (!destination.trim()) {
      setError('Enter a destination first.');
      return;
    }

    setIsSearching(true);
    setError('');
    setStatus('');

    try {
      const response = await searchAttractions(destination.trim());
      const nextAttractions = response.data.data.attractions;
      setAttractions(nextAttractions.items || []);
      setStatus(
        nextAttractions.available
          ? `Found ${nextAttractions.items?.length || 0} attraction${nextAttractions.items?.length === 1 ? '' : 's'} for ${destination.trim()}.`
          : nextAttractions.message
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setAttractions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleHotelFilterChange = (field, value) => {
    setHotelFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };

  const handleRestaurantFilterChange = (field, value) => {
    setRestaurantFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };

  const handleCountryChange = (countryCode, filterType = 'hotel') => {
    const selectedCountry = countryOptions.find((country) => country.isoCode === countryCode);
    const updateFilters = filterType === 'restaurant' ? setRestaurantFilters : setHotelFilters;

    updateFilters((currentFilters) => ({
      ...currentFilters,
      country: selectedCountry?.name || '',
      countryCode,
      state: '',
    }));
  };

  const getHotelCriteria = () => ({
    destination: destination.trim(),
    country: hotelFilters.country.trim(),
    state: hotelFilters.state.trim(),
    roomType: hotelFilters.roomType,
  });

  const hasHotelCriteria = (criteria) => Boolean(criteria.destination || criteria.country || criteria.state || criteria.roomType);

  const getRestaurantCriteria = () => ({
    destination: destination.trim(),
    country: restaurantFilters.country.trim(),
    state: restaurantFilters.state.trim(),
    foodCategory: restaurantFilters.foodCategory,
  });

  const hasRestaurantCriteria = (criteria) =>
    Boolean(criteria.destination || criteria.country || criteria.state || criteria.foodCategory);

  const fetchHotels = async ({ criteria, start = 0, append = false }) => {
    if (!hasHotelCriteria(criteria)) {
      setError('Enter a hotel name, country, location, or room type first.');
      return;
    }

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsSearching(true);
    }
    setError('');
    setStatus('');

    try {
      const response = await searchHotels({
        ...criteria,
        start,
      });
      const nextHotels = response.data.data.hotels;
      const nextItems = nextHotels.items || [];

      setHotels((currentHotels) => (append ? [...currentHotels, ...nextItems] : nextItems));
      setHotelSearchCriteria(criteria);
      setNextHotelStart(nextHotels.nextStart || start + nextItems.length);
      setHasMoreHotels(Boolean(nextHotels.hasMore && nextItems.length));
      setStatus(
        nextHotels.available
          ? `${append ? 'Loaded' : 'Found'} ${nextItems.length} hotel${nextItems.length === 1 ? '' : 's'} for ${nextHotels.query || destinationLabel}.`
          : nextHotels.message
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      if (!append) {
        setHotels([]);
        setHasMoreHotels(false);
      }
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  const handleHotelsSearch = async (event) => {
    event.preventDefault();
    await fetchHotels({ criteria: getHotelCriteria() });
  };

  const fetchRestaurants = async ({ criteria, start = 0, append = false }) => {
    if (!hasRestaurantCriteria(criteria)) {
      setError('Enter a restaurant name, country, location, or food category first.');
      return;
    }

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsSearching(true);
    }
    setError('');
    setStatus('');

    try {
      const response = await searchRestaurants({
        ...criteria,
        start,
      });
      const nextRestaurants = response.data.data.restaurants;
      const nextItems = nextRestaurants.items || [];

      setRestaurants((currentRestaurants) => (append ? [...currentRestaurants, ...nextItems] : nextItems));
      setRestaurantSearchCriteria(criteria);
      setNextRestaurantStart(nextRestaurants.nextStart || start + nextItems.length);
      setHasMoreRestaurants(Boolean(nextRestaurants.hasMore && nextItems.length));
      setStatus(
        nextRestaurants.available
          ? `${append ? 'Loaded' : 'Found'} ${nextItems.length} restaurant${nextItems.length === 1 ? '' : 's'} for ${
              nextRestaurants.query || destinationLabel
            }.`
          : nextRestaurants.message
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      if (!append) {
        setRestaurants([]);
        setHasMoreRestaurants(false);
      }
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  const handleRestaurantsSearch = async (event) => {
    event.preventDefault();
    await fetchRestaurants({ criteria: getRestaurantCriteria() });
  };

  const handleLoadMoreHotels = () => {
    if (!hotelSearchCriteria) return;
    fetchHotels({ criteria: hotelSearchCriteria, start: nextHotelStart, append: true });
  };

  const handleLoadMoreRestaurants = () => {
    if (!restaurantSearchCriteria) return;
    fetchRestaurants({ criteria: restaurantSearchCriteria, start: nextRestaurantStart, append: true });
  };

  const handleSearch = isHotelsView ? handleHotelsSearch : isFoodView ? handleRestaurantsSearch : handleAttractionsSearch;
  const hasMoreFilteredItems = isHotelsView ? hasMoreHotels : hasMoreRestaurants;
  const handleLoadMoreFilteredItems = isHotelsView ? handleLoadMoreHotels : handleLoadMoreRestaurants;

  return (
    <section className="explore-page">
      <div className="explore-hero">
        <div>
          <span className="explore-eyebrow">
            <MapPinned size={15} aria-hidden="true" />
            Explore
          </span>
          <h2>{activeOption.label}</h2>
          <p>Find popular stops, ratings, reviews, and addresses from live destination data before adding places into the rest of your trip plan.</p>
        </div>
        {isSearchView && (
          <div className="explore-hero-panel" aria-label={`${activeOption.label} search summary`}>
            <div>
              <span>Current search</span>
              <strong>{destinationLabel}</strong>
            </div>
            <small>{resultCount ? `${resultCount} result${resultCount === 1 ? '' : 's'} loaded` : 'Ready to discover places'}</small>
            <div className="explore-hero-meter" aria-hidden="true">
              <span style={{ width: hasResults ? '100%' : '38%' }} />
            </div>
          </div>
        )}
      </div>

      {isSearchView && (
        <div className="explore-insights" aria-label={`${activeOption.label} result summary`}>
          <article>
            <Search size={18} aria-hidden="true" />
            <div>
              <strong>{resultCount || '--'}</strong>
              <span>{isHotelsView ? 'Hotels loaded' : isFoodView ? 'Restaurants loaded' : 'Places loaded'}</span>
            </div>
          </article>
          <article>
            <Star size={18} aria-hidden="true" />
            <div>
              <strong>{ratedCount || '--'}</strong>
              <span>Rated places</span>
            </div>
          </article>
          <article>
            {isHotelsView ? (
              <Building2 size={18} aria-hidden="true" />
            ) : isFoodView ? (
              <Utensils size={18} aria-hidden="true" />
            ) : (
              <Sparkles size={18} aria-hidden="true" />
            )}
            <div>
              <strong>{isFilteredSearchView ? pricedCount || '--' : topRatedCount || '--'}</strong>
              <span>{isFilteredSearchView ? 'With prices' : 'Highly rated'}</span>
            </div>
          </article>
        </div>
      )}

      {isSearchView ? (
        <div className="explore-workspace">
          <form className={isFilteredSearchView ? 'explore-search explore-search-hotels' : 'explore-search'} onSubmit={handleSearch}>
            <div className="explore-search-copy">
              <span>{searchConfig.finderLabel}</span>
              <strong>{searchConfig.searchTitle}</strong>
            </div>
            <label>
              <span className="sr-only">Destination</span>
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder={isHotelsView ? 'Hotel, country or location' : isFoodView ? 'Restaurant, country or location' : 'Tokyo, Paris, Kuala Lumpur'}
              />
            </label>
            {isFilteredSearchView && (
              <div className="explore-filter-row" aria-label={isHotelsView ? 'Hotel filters' : 'Restaurant filters'}>
                <label className="explore-filter-field">
                  <span className="sr-only">Country</span>
                  <select
                    value={activeFilters.countryCode}
                    onChange={(event) => handleCountryChange(event.target.value, isFoodView ? 'restaurant' : 'hotel')}
                  >
                    <option value="">Country</option>
                    {countryOptions.map((country) => (
                      <option key={country.isoCode} value={country.isoCode}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="explore-filter-field">
                  <span className="sr-only">Location or state</span>
                  <select
                    value={activeFilters.state}
                    onChange={(event) =>
                      isFoodView
                        ? handleRestaurantFilterChange('state', event.target.value)
                        : handleHotelFilterChange('state', event.target.value)
                    }
                    disabled={!activeFilters.countryCode}
                  >
                    <option value="">State</option>
                      {stateOptions.map((state) => (
                        <option key={state.isoCode} value={state.name}>
                          {state.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="explore-filter-field">
                  <span className="sr-only">{isFoodView ? 'Food category' : 'Room type'}</span>
                  <select
                    value={isFoodView ? restaurantFilters.foodCategory : hotelFilters.roomType}
                    onChange={(event) =>
                      isFoodView
                        ? handleRestaurantFilterChange('foodCategory', event.target.value)
                        : handleHotelFilterChange('roomType', event.target.value)
                    }
                  >
                    {(isFoodView ? foodCategoryOptions : roomTypeOptions).map((option) => (
                      <option key={option.value || (isFoodView ? 'any-food' : 'any-room')} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <button className="primary-action" type="submit" disabled={isSearching}>
              {isSearching ? <LoaderCircle className="explore-spin" size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {error && <p className="form-error explore-status">{error}</p>}
          {status && <p className="form-success explore-status">{status}</p>}

          <section className="explore-results-shell">
            <div className="explore-results-heading">
              <div>
                <span>{searchConfig.resultLabel}</span>
                <h3>{hasResults ? `${isHotelsView ? 'Rooms' : isFoodView ? 'Food' : 'Places'} for ${destinationLabel}` : 'Ready when you are'}</h3>
              </div>
              <small>{hasResults ? `${resultCount} ${searchConfig.matchesLabel}` : searchConfig.readyText}</small>
            </div>

            <div className="explore-results">
              {activeItems.length === 0 ? (
                <div className="explore-empty">
                  {isHotelsView ? (
                    <Building2 size={34} aria-hidden="true" />
                  ) : isFoodView ? (
                    <Utensils size={34} aria-hidden="true" />
                  ) : (
                    <MapPinned size={34} aria-hidden="true" />
                  )}
                  <h3>{searchConfig.emptyTitle}</h3>
                  <p>{searchConfig.emptyText}</p>
                </div>
            ) : (
              activeItems.map((item, index) => (
                <article className="explore-attraction" key={`${item.id}-${index}`}>
                  <div className="explore-attraction-media">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" loading="lazy" />
                    ) : (
                      <div className="explore-attraction-image">
                        <Image size={28} aria-hidden="true" />
                      </div>
                    )}
                    <span className="explore-card-rank">#{index + 1}</span>
                  </div>
                  <div className="explore-attraction-body">
                    <div className="explore-attraction-title">
                      <span className="explore-category">
                        {isHotelsView && hotelFilters.roomType
                          ? selectedRoomLabel
                          : isFoodView && restaurantFilters.foodCategory
                            ? selectedFoodCategoryLabel
                            : item.category}
                      </span>
                      <h3>{item.name}</h3>
                    </div>
                    <div className="explore-card-meta">
                      <span>
                        <Star size={14} aria-hidden="true" />
                        {item.rating ? item.rating : 'No rating'}
                      </span>
                      <span>
                        <MessageCircle size={14} aria-hidden="true" />
                        {item.reviewCount ? item.reviewCount.toLocaleString() : 'No'} reviews
                      </span>
                      {isFilteredSearchView && item.price && (
                        <span>
                          {isHotelsView ? <Building2 size={14} aria-hidden="true" /> : <Utensils size={14} aria-hidden="true" />}
                          {item.price}
                        </span>
                      )}
                    </div>
                    {item.address && (
                      <p className="explore-address">
                        <MapPin size={15} aria-hidden="true" />
                        {item.address}
                      </p>
                    )}
                    {item.url && (
                      <a className="explore-card-link" href={item.url} target="_blank" rel="noreferrer">
                        {isHotelsView ? 'View hotel' : isFoodView ? 'View restaurant' : 'View place'}
                        <ExternalLink size={14} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </article>
              ))
              )}
            </div>
            {isFilteredSearchView && hasMoreFilteredItems && (
              <button className="explore-view-more" type="button" onClick={handleLoadMoreFilteredItems} disabled={isLoadingMore}>
                {isLoadingMore ? <LoaderCircle className="explore-spin" size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
                {isLoadingMore ? 'Loading...' : 'View more'}
              </button>
            )}
          </section>
        </div>
      ) : (
        <div className="explore-empty explore-placeholder">
          <ActiveIcon size={34} aria-hidden="true" />
          <h3>{activeOption.label} is ready for integration</h3>
          <p>Use the Attractions tab to test the SerpApi Google Maps connection first.</p>
        </div>
      )}
    </section>
  );
}

export default ExplorePage;
