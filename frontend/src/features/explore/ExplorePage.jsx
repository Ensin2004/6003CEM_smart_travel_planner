/**
 * Explore module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import {
  Building2,
  Compass,
  MapPinned,
  Utensils,
} from 'lucide-react';
import { Country, State } from 'country-state-city';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { convertCurrency } from '../../api/currencyApi';
import {
  searchAttractions,
  searchFlight,
  searchHotels,
  searchRestaurants,
  searchTrainStationTimetable,
  searchWeather,
} from '../../api/exploreApi';
import { getFavorites } from '../../api/favoriteApi';
import { getReverseGeocodeLocation } from '../../api/mapApi';
import { getCategories } from '../../api/categoryApi';
import CurrencyContext from '../../context/currencyContext';
import useNotifications from '../../hooks/useNotifications';
import { emptyCategoryOptions, groupCategoryOptions } from './explore.constants';
import { formatMoney, getDateKey, getErrorMessage, getPriceConversionKey } from './explore.helpers';
import { buildWeatherRankingRequestKey, rankPlacesForWeather } from '../../utils/weatherPlaceRanking';
import AttractionsSubmenu from './submenus/Attractions';
import RestaurantSubmenu from './submenus/Restaurant';
import HotelsSubmenu from './submenus/Hotels';
import TransportationSubmenu from './submenus/Transportation';
import ExploreAiPanel from './submenus/ExploreAiPanel';
import './ExplorePage.css';

/**
 * Available view options for the explore page
 * Each option defines an ID, display label, and associated icon
 */
const viewOptions = [
  { id: 'attractions', label: 'Attractions', icon: MapPinned },
  { id: 'food', label: 'Restaurants / Food', icon: Utensils },
  { id: 'hotels', label: 'Hotels / Rooms', icon: Building2 },
  { id: 'transport', label: 'Transportation', icon: Compass },
];

/**
 * Generates a unique favorite key for a hotel item.
 * 
 * @param {Object} hotel - The hotel object
 * @returns {string} A unique key string for favorite lookup
 */
const getHotelFavoriteKey = (hotel = {}) =>
  String(hotel.dataId || hotel.placeId || hotel.id || hotel.name || '')
    .trim()
    .toLowerCase();

/**
 * Generates a unique favorite key for a restaurant item.
 * 
 * @param {Object} restaurant - The restaurant object
 * @returns {string} A unique key string for favorite lookup
 */
const getRestaurantFavoriteKey = (restaurant = {}) =>
  String(restaurant.dataId || restaurant.placeId || restaurant.id || restaurant.name || '')
    .trim()
    .toLowerCase();

/**
 * Generates a unique favorite key for an attraction item.
 * 
 * @param {Object} attraction - The attraction object
 * @returns {string} A unique key string for favorite lookup
 */
const getAttractionFavoriteKey = (attraction = {}) =>
  String(attraction.dataId || attraction.placeId || attraction.id || attraction.name || '')
    .trim()
    .toLowerCase();

/**
 * ExplorePage renders the main screen and handles nearby interactions.
 * Manages state for all explore views including attractions, hotels, restaurants, and transportation.
 * 
 * @returns {JSX.Element} The rendered explore page
 */
function ExplorePage() {
  // Navigation and routing hooks
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currency = useContext(CurrencyContext);
  const { subscribeToCategories } = useNotifications();
  
  // Extract current view and destination from URL parameters
  const activeView = searchParams.get('view') || 'attractions';
  const destination = searchParams.get('q') || '';
  
  // Restore state from location if available (navigation from detail pages)
  const restoredAttractionState = location.state?.attractionResults ? location.state : null;
  const restoredHotelState = location.state?.hotelResults ? location.state : null;
  const restoredRestaurantState = location.state?.restaurantResults ? location.state : null;
  const restoredTravelDate =
    restoredAttractionState?.travelDate || restoredHotelState?.travelDate || restoredRestaurantState?.travelDate || getDateKey();
  
  // Travel date state
  const [travelDate, setTravelDate] = useState(restoredTravelDate);
  
  // Results state for each view type
  const [attractions, setAttractions] = useState(restoredAttractionState?.attractionResults || []);
  const [hotels, setHotels] = useState(restoredHotelState?.hotelResults || []);
  const [restaurants, setRestaurants] = useState(restoredRestaurantState?.restaurantResults || []);
  
  // Weather and AI state by view
  const [weatherByView, setWeatherByView] = useState({
    attractions: restoredAttractionState?.attractionWeather || null,
    food: restoredRestaurantState?.restaurantWeather || null,
    hotels: restoredHotelState?.hotelWeather || null,
  });
  const [aiByView, setAiByView] = useState({
    attractions: restoredAttractionState?.attractionAi || null,
    food: restoredRestaurantState?.restaurantAi || null,
    hotels: restoredHotelState?.hotelAi || null,
  });
  const [aiRequestKeys, setAiRequestKeys] = useState({
    attractions: '',
    food: '',
    hotels: '',
  });
  
  // Price conversion cache
  const [priceConversions, setPriceConversions] = useState({});
  
  // Filter state for each view type
  const [attractionFilters, setAttractionFilters] = useState({
    country: restoredAttractionState?.attractionFilters?.country || '',
    countryCode: restoredAttractionState?.attractionFilters?.countryCode || '',
    state: restoredAttractionState?.attractionFilters?.state || '',
    attractionCategory: restoredAttractionState?.attractionFilters?.attractionCategory || '',
  });
  const [hotelFilters, setHotelFilters] = useState({
    country: restoredHotelState?.hotelFilters?.country || '',
    countryCode: restoredHotelState?.hotelFilters?.countryCode || '',
    state: restoredHotelState?.hotelFilters?.state || '',
    roomType: restoredHotelState?.hotelFilters?.roomType || '',
  });
  const [restaurantFilters, setRestaurantFilters] = useState({
    country: restoredRestaurantState?.restaurantFilters?.country || '',
    countryCode: restoredRestaurantState?.restaurantFilters?.countryCode || '',
    state: restoredRestaurantState?.restaurantFilters?.state || '',
    foodCategory: restoredRestaurantState?.restaurantFilters?.foodCategory || '',
  });
  
  // Search criteria state for each view type
  const [attractionSearchCriteria, setAttractionSearchCriteria] = useState(restoredAttractionState?.attractionSearchCriteria || null);
  const [hotelSearchCriteria, setHotelSearchCriteria] = useState(restoredHotelState?.hotelSearchCriteria || null);
  const [restaurantSearchCriteria, setRestaurantSearchCriteria] = useState(restoredRestaurantState?.restaurantSearchCriteria || null);
  
  // Favorite keys and records
  const [favoriteAttractionKeys, setFavoriteAttractionKeys] = useState(restoredAttractionState?.favoriteAttractionKeys || []);
  const [favoriteHotelKeys, setFavoriteHotelKeys] = useState(restoredHotelState?.favoriteHotelKeys || []);
  const [favoriteRestaurantKeys, setFavoriteRestaurantKeys] = useState(restoredRestaurantState?.favoriteRestaurantKeys || []);
  const [favoriteAttractionRecords, setFavoriteAttractionRecords] = useState({});
  const [favoriteHotelRecords, setFavoriteHotelRecords] = useState({});
  const [favoriteRestaurantRecords, setFavoriteRestaurantRecords] = useState({});
  
  // Transportation-specific state
  const restoredTrainState = location.state?.trainResults ? location.state : null;
  const [activeTransportTab, setActiveTransportTab] = useState(restoredTrainState ? 'trains' : 'flights');
  const [flightSearch, setFlightSearch] = useState({
    airlineName: '',
    fromCountryCode: '',
    fromCountryName: '',
    toCountryCode: '',
    toCountryName: '',
    departureDate: '',
  });
  const [flightResults, setFlightResults] = useState(null);
  const [trainSearch, setTrainSearch] = useState({
    stationQuery: restoredTrainState?.trainSearch?.stationQuery || '',
    destinationQuery: restoredTrainState?.trainSearch?.destinationQuery || '',
    operatorName: restoredTrainState?.trainSearch?.operatorName || '',
    departureDate: restoredTrainState?.trainSearch?.departureDate || '',
  });
  const [trainResults, setTrainResults] = useState(restoredTrainState?.trainResults || null);
  
  // Pagination state for infinite scrolling
  const [nextAttractionStart, setNextAttractionStart] = useState(restoredAttractionState?.nextAttractionStart || 0);
  const [nextHotelStart, setNextHotelStart] = useState(restoredHotelState?.nextHotelStart || 0);
  const [nextRestaurantStart, setNextRestaurantStart] = useState(restoredRestaurantState?.nextRestaurantStart || 0);
  const [hasMoreAttractions, setHasMoreAttractions] = useState(restoredAttractionState?.hasMoreAttractions || false);
  const [hasMoreHotels, setHasMoreHotels] = useState(restoredHotelState?.hasMoreHotels || false);
  const [hasMoreRestaurants, setHasMoreRestaurants] = useState(restoredRestaurantState?.hasMoreRestaurants || false);
  
  // UI state for status, errors, and loading
  const [status, setStatus] = useState(
    restoredAttractionState?.attractionResults?.length
      ? `${restoredAttractionState.attractionResults.length} attraction match${restoredAttractionState.attractionResults.length === 1 ? '' : 'es'} restored.`
      : restoredHotelState?.hotelResults?.length
        ? `${restoredHotelState.hotelResults.length} hotel match${restoredHotelState.hotelResults.length === 1 ? '' : 'es'} restored.`
      : restoredRestaurantState?.restaurantResults?.length
        ? `${restoredRestaurantState.restaurantResults.length} restaurant match${restoredRestaurantState.restaurantResults.length === 1 ? '' : 'es'} restored.`
      : restoredTrainState?.trainResults?.available
        ? `${restoredTrainState.trainResults.items.length} train departure${restoredTrainState.trainResults.items.length === 1 ? '' : 's'} loaded.`
        : ''
  );
  const [statusScope, setStatusScope] = useState(
    restoredAttractionState?.attractionResults?.length
      ? 'attractions'
      : restoredHotelState?.hotelResults?.length
        ? 'hotels'
      : restoredRestaurantState?.restaurantResults?.length
        ? 'food'
        : restoredTrainState?.trainResults?.available
          ? 'transport:trains'
          : ''
  );
  const [error, setError] = useState('');
  const [errorScope, setErrorScope] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [weatherLoadingView, setWeatherLoadingView] = useState('');
  const [aiLoadingView, setAiLoadingView] = useState('');
  
  // Current location state from geolocation
  const [currentLocation, setCurrentLocation] = useState({
    label: 'current area',
    state: '',
    country: '',
    latitude: null,
    longitude: null,
    available: false,
  });
  
  // Search result summary statistics
  const [lastSearchSummary, setLastSearchSummary] = useState({
    attractions: { loaded: 0, priced: 0, rated: 0, topRated: 0 },
    food: { loaded: 0, priced: 0, rated: 0, topRated: 0 },
    hotels: { loaded: 0, priced: 0, rated: 0, topRated: 0 },
  });
  
  // Category options state
  const [categoryOptions, setCategoryOptions] = useState(emptyCategoryOptions);
  const roomTypeOptions = categoryOptions.hotel;
  const attractionCategoryOptions = categoryOptions.attraction;
  const foodCategoryOptions = categoryOptions.food;
  
  // Memoized active option and view flags
  const activeOption = useMemo(
    () => viewOptions.find((option) => option.id === activeView) || viewOptions[0],
    [activeView]
  );
  const isAttractionsView = activeOption.id === 'attractions';
  const isFoodView = activeOption.id === 'food';
  const isHotelsView = activeOption.id === 'hotels';
  const isTransportationView = activeOption.id === 'transport';
  const isFilteredSearchView = isAttractionsView || isHotelsView || isFoodView;
  const isSearchView = isAttractionsView || isFilteredSearchView;
  
  // Active data based on current view
  const activeItems = isHotelsView ? hotels : isFoodView ? restaurants : attractions;
  const activeFilters = isHotelsView ? hotelFilters : isFoodView ? restaurantFilters : attractionFilters;
  const activeWeather = weatherByView[activeOption.id];
  const activeAi = aiByView[activeOption.id];
  const isWeatherLoading = weatherLoadingView === activeOption.id;
  const isAiLoading = aiLoadingView === activeOption.id;
  
  // Currency and formatting
  const selectedCurrency = currency?.selectedCurrency || 'USD';
  const supportedCurrencyCodes = useMemo(() => currency?.currencies?.map((option) => option.code) || [], [currency?.currencies]);
  const currentSummary = lastSearchSummary[activeOption.id] || {
    loaded: activeItems.length,
    priced: 0,
    rated: 0,
    topRated: 0,
  };
  const transportScope = `transport:${activeTransportTab}`;
  
  // Country and state options
  const countryOptions = useMemo(() => Country.getAllCountries(), []);
  const currentLocationName = useMemo(() => {
    const stateCountryLabel = [currentLocation.state, currentLocation.country].filter(Boolean).join(', ');
    return stateCountryLabel || currentLocation.label || 'current area';
  }, [currentLocation.country, currentLocation.label, currentLocation.state]);
  const stateOptions = useMemo(
    () => (activeFilters.countryCode ? State.getStatesOfCountry(activeFilters.countryCode) : []),
    [activeFilters.countryCode]
  );
  
  // Selected category labels for display
  const selectedHotelRoomType = hotelSearchCriteria?.roomType ?? hotelFilters.roomType;
  const selectedRoomLabel = roomTypeOptions.find((option) => option.value === selectedHotelRoomType)?.label || 'Any';
  const selectedRestaurantFoodCategory = restaurantSearchCriteria?.foodCategory ?? restaurantFilters.foodCategory;
  const selectedFoodCategoryLabel =
    foodCategoryOptions.find((option) => option.value === selectedRestaurantFoodCategory)?.label || 'Any';
  const selectedAttractionCategory = attractionSearchCriteria?.attractionCategory ?? attractionFilters.attractionCategory;
  const selectedAttractionCategoryLabel =
    attractionCategoryOptions.find((option) => option.value === selectedAttractionCategory)?.label || 'Any';

  /**
   * Loads category options from the API and groups them by type.
   * 
   * @returns {Object} Grouped category options
   */
  const loadCategoryOptions = useCallback(async () => {
    const response = await getCategories();
    return groupCategoryOptions(response.data?.data?.categories || []);
  }, []);

  /**
   * Effect hook that loads category options on mount and subscribes to updates
   */
  useEffect(() => {
    let isActive = true;

    const refreshCategoryOptions = async ({ resetOnError = false } = {}) => {
      try {
        const nextCategoryOptions = await loadCategoryOptions();
        if (isActive) setCategoryOptions(nextCategoryOptions);
      } catch {
        if (isActive && resetOnError) setCategoryOptions(emptyCategoryOptions);
      }
    };

    refreshCategoryOptions({ resetOnError: true });
    const unsubscribe = subscribeToCategories(refreshCategoryOptions);

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [loadCategoryOptions, subscribeToCategories]);
  
  // Computed display values for search results
  const submittedSearchCriteria = isHotelsView
    ? hotelSearchCriteria
    : isFoodView
      ? restaurantSearchCriteria
      : isAttractionsView
        ? attractionSearchCriteria
        : null;
  const filteredSearchLabel = [
    submittedSearchCriteria?.destination ?? destination.trim(),
    submittedSearchCriteria?.state ?? activeFilters.state.trim(),
    submittedSearchCriteria?.country ?? activeFilters.country.trim(),
    submittedSearchCriteria?.locationLabel ? `Near ${submittedSearchCriteria.locationLabel}` : '',
    isHotelsView && selectedHotelRoomType ? selectedRoomLabel : '',
    isFoodView && selectedRestaurantFoodCategory ? selectedFoodCategoryLabel : '',
    isAttractionsView && selectedAttractionCategory ? selectedAttractionCategoryLabel : '',
  ]
    .filter(Boolean)
    .join(', ');
  const resultCount = currentSummary.loaded || activeItems.length;
  const ratedCount = currentSummary.rated || activeItems.filter((item) => item.rating).length;
  const topRatedCount = currentSummary.topRated || activeItems.filter((item) => item.rating >= 4.5).length;
  const pricedCount = currentSummary.priced || activeItems.filter((item) => item.price || item.priceDetail).length;
  const hasResults = resultCount > 0;
  const destinationLabel = isFilteredSearchView ? filteredSearchLabel || 'None' : destination.trim() || 'None';
  const aiDestination = (isFilteredSearchView ? filteredSearchLabel : destination.trim()) || destination.trim();
  
  /**
   * Memoized AI request key for caching AI recommendations
   * Changes when search results or filters change
   */
  const aiRequestKey = useMemo(() => {
    if (!isSearchView || !activeItems.length) {
      return '';
    }

    return buildWeatherRankingRequestKey({
      view: activeOption.id,
      destination: aiDestination,
      date: travelDate,
      weather: activeWeather,
      items: activeItems,
    });
  }, [activeItems, activeOption.id, activeWeather, aiDestination, isSearchView, travelDate]);
  
  /**
   * Search configuration for the current view
   */
  const searchConfig = isHotelsView
    ? {
        finderLabel: 'Hotel finder',
        searchTitle: 'Search for hotels',
        resultLabel: 'Hotel results',
        emptyTitle: 'No hotels loaded yet',
        emptyText: 'Search by hotel name, location, room type, or optionally narrow by country.',
        readyText: 'Search text or filters can begin',
        matchesLabel: 'hotel matches',
      }
    : isFoodView
      ? {
          finderLabel: 'Food finder',
          searchTitle: 'Search for food',
          resultLabel: 'Restaurant results',
          emptyTitle: 'No restaurants loaded yet',
          emptyText: 'Search by restaurant name, location, food category, or optionally narrow by country.',
          readyText: 'Search text or filters can begin',
          matchesLabel: 'restaurant matches',
        }
    : {
        finderLabel: 'Attraction finder',
        searchTitle: 'Search for attractions',
        resultLabel: 'Attraction results',
        emptyTitle: 'No attractions loaded yet',
        emptyText: 'Search by attraction name, location, category, or optionally narrow by country.',
        readyText: 'Search text or filters can begin',
        matchesLabel: 'curated matches',
      };

  /**
   * Effect hook that gets the user's current location using geolocation API
   */
  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    if (!navigator.geolocation) {
      setCurrentLocation({
        label: 'current area',
        state: '',
        country: '',
        latitude: null,
        longitude: null,
        available: false,
      });
      return () => {
        isActive = false;
        controller.abort();
      };
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const locationDetails = await getReverseGeocodeLocation(
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            { signal: controller.signal }
          );

          if (!isActive) return;
          setCurrentLocation({
            label: locationDetails.label || 'current area',
            state: locationDetails.state || '',
            country: locationDetails.country || '',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            available: Boolean(locationDetails.available),
          });
        } catch {
          if (!isActive) return;
          setCurrentLocation({
            label: 'current area',
            state: '',
            country: '',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            available: false,
          });
        }
      },
      () => {
        if (!isActive) return;
        setCurrentLocation({
          label: 'current area',
          state: '',
          country: '',
          latitude: null,
          longitude: null,
          available: false,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 10 * 60 * 1000,
      }
    );

    return () => {
      isActive = false;
      controller.abort();
    };
  }, []);

  /**
   * Effect hook that handles currency conversion for items with prices
   */
  useEffect(() => {
    const convertibleItems = activeItems.filter((item) => {
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
      return;
    }

    let isActive = true;
    const missingItems = convertibleItems.filter((item) => !priceConversions[getPriceConversionKey(item, selectedCurrency)]);

    if (!missingItems.length) {
      return;
    }

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
    )
      .then((results) => {
        if (!isActive) return;
        setPriceConversions((currentConversions) => ({
          ...currentConversions,
          ...Object.fromEntries(results.map((result) => [result.key, result.value])),
        }));
      });

    // Cleanup prevents state updates after component unmount.
    return () => {
      isActive = false;
    };
  }, [activeItems, priceConversions, selectedCurrency, supportedCurrencyCodes]);

  /**
   * Update Destination Query applies allowed changes to an existing record.
   * Updates the URL search parameter for destination query
   * 
   * @param {string} value - The new destination query value
   */
  const updateDestinationQuery = (value) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);

      if (value.trim()) {
        nextParams.set('q', value);
      } else {
        nextParams.delete('q');
      }

      return nextParams;
    });
  };

  /**
   * Update Search Summary applies allowed changes to an existing record.
   * Updates the search summary statistics for a given view
   * 
   * @param {string} viewId - The view identifier
   * @param {Array} items - The items to summarize
   */
  const updateSearchSummary = (viewId, items) => {
    setLastSearchSummary((currentSummary) => ({
      ...currentSummary,
      [viewId]: {
        loaded: items.length,
        priced: items.filter((item) => item.price || item.priceDetail).length,
        rated: items.filter((item) => item.rating).length,
        topRated: items.filter((item) => item.rating >= 4.5).length,
      },
    }));
  };
  
  /**
   * Handles filter field changes for attractions
   */
  const handleAttractionFilterChange = (field, value) => {
    setAttractionFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };
  
  /**
   * Handles filter field changes for hotels
   */
  const handleHotelFilterChange = (field, value) => {
    setHotelFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };
  
  /**
   * Handles filter field changes for restaurants
   */
  const handleRestaurantFilterChange = (field, value) => {
    setRestaurantFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };

  /**
   * Handles country selection changes for filters
   * 
   * @param {string} countryCode - The selected country code
   * @param {string} filterType - The type of filter ('hotel', 'restaurant', 'attraction')
   */
  const handleCountryChange = (countryCode, filterType = 'hotel') => {
    const selectedCountry = countryOptions.find((country) => country.isoCode === countryCode);
    const updateFilters =
      filterType === 'restaurant'
        ? setRestaurantFilters
        : filterType === 'attraction'
          ? setAttractionFilters
          : setHotelFilters;

    updateFilters((currentFilters) => ({
      ...currentFilters,
      country: selectedCountry?.name || '',
      countryCode,
      state: '',
    }));
  };

  /**
   * Handles travel date changes and clears cached weather/AI data
   * 
   * @param {string} value - The new travel date
   */
  const handleTravelDateChange = (value) => {
    setTravelDate(value);
    setWeatherByView({
      attractions: null,
      food: null,
      hotels: null,
    });
    setAiByView({
      attractions: null,
      food: null,
      hotels: null,
    });
  };

  /**
   * Builds weather destination string from search criteria
   * 
   * @param {Object} criteria - The search criteria object
   * @returns {string} The weather destination string
   */
  const getWeatherDestination = (criteria) =>
    [criteria.destination, criteria.state, criteria.country].filter(Boolean).join(', ');

  const withCurrentLocationFallback = (criteria) => {
    const hasLocationFilter = Boolean(criteria.destination || criteria.country || criteria.state);
    if (hasLocationFilter) return criteria;

    const latitude = Number(currentLocation.latitude);
    const longitude = Number(currentLocation.longitude);
    const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
    const locationLabel = currentLocationName === 'current area' ? '' : currentLocationName;

    if (!hasCoordinates && !locationLabel) return criteria;

    return {
      ...criteria,
      latitude: hasCoordinates ? latitude : undefined,
      longitude: hasCoordinates ? longitude : undefined,
      locationLabel: locationLabel || 'your current location',
    };
  };

  /**
   * Builds weather request object from search criteria and items
   * 
   * @param {Object} criteria - The search criteria
   * @param {Array} items - The search results items
   * @returns {Object} Weather request configuration
   */
  const getWeatherRequest = useCallback((criteria, items = []) => {
    const weatherDestination = getWeatherDestination(criteria);
    const locatedItem = items.find((item) => item.coordinates?.latitude && item.coordinates?.longitude);
    const coordinateLabel = locatedItem ? locatedItem.address || locatedItem.name || 'Selected search area' : '';
    const currentLatitude = Number(currentLocation.latitude);
    const currentLongitude = Number(currentLocation.longitude);
    const hasCurrentCoordinates = Number.isFinite(currentLatitude) && Number.isFinite(currentLongitude);
    const currentLocationLabel = currentLocationName === 'current area' ? '' : currentLocationName;

    return {
      destination: weatherDestination || coordinateLabel || currentLocationLabel || criteria.destination || destination.trim(),
      latitude: locatedItem?.coordinates?.latitude ?? (weatherDestination ? undefined : hasCurrentCoordinates ? currentLatitude : undefined),
      longitude: locatedItem?.coordinates?.longitude ?? (weatherDestination ? undefined : hasCurrentCoordinates ? currentLongitude : undefined),
      locationLabel: coordinateLabel || weatherDestination || currentLocationLabel,
    };
  }, [currentLocation.latitude, currentLocation.longitude, currentLocationName, destination]);

  /**
   * Fetches weather data for a specific view
   * 
   * @param {string} viewId - The view identifier
   * @param {Object} weatherRequest - The weather request configuration
   */
  const fetchDestinationWeather = useCallback(async (viewId, weatherRequest) => {
    const weatherDestination = weatherRequest?.destination;
    const hasCoordinates = Number.isFinite(Number(weatherRequest?.latitude)) && Number.isFinite(Number(weatherRequest?.longitude));

    if (!weatherDestination && !hasCoordinates) {
      setWeatherByView((currentWeather) => ({
        ...currentWeather,
        [viewId]: null,
      }));
      return;
    }

    setWeatherLoadingView(viewId);

    try {
      const response = await searchWeather({
        destination: weatherDestination,
        date: travelDate || getDateKey(),
        latitude: weatherRequest.latitude,
        longitude: weatherRequest.longitude,
        locationLabel: weatherRequest.locationLabel,
      });
      setWeatherByView((currentWeather) => ({
        ...currentWeather,
        [viewId]: response.data.data.weather,
      }));
    } catch {
      setWeatherByView((currentWeather) => ({
        ...currentWeather,
        [viewId]: {
          available: false,
          message: 'Weather temporarily unavailable. Search results are still available.',
        },
      }));
    } finally {
      setWeatherLoadingView('');
    }
  }, [travelDate]);

  /**
   * Effect hook that fetches weather when the view has results
   */
  useEffect(() => {
    if (!isSearchView || hasResults || activeWeather || isWeatherLoading) {
      return;
    }

    const hasCurrentCoordinates =
      Number.isFinite(Number(currentLocation.latitude)) && Number.isFinite(Number(currentLocation.longitude));
    const hasCurrentLocationText = Boolean(currentLocation.country || currentLocation.state || currentLocation.label !== 'current area');

    if (!hasCurrentCoordinates && !hasCurrentLocationText) {
      return;
    }

    fetchDestinationWeather(viewOptions.find((option) => option.id === activeView)?.id || 'attractions', getWeatherRequest({
      destination: '',
      country: '',
      state: '',
    }));
  }, [
    activeView,
    activeWeather,
    currentLocation.country,
    currentLocation.label,
    currentLocation.latitude,
    currentLocation.longitude,
    currentLocation.state,
    fetchDestinationWeather,
    getWeatherRequest,
    hasResults,
    isSearchView,
    isWeatherLoading,
    travelDate,
  ]);

  /**
   * Gets the current attraction search criteria
   * 
   * @returns {Object} Attraction search criteria
   */
  const getAttractionCriteria = () => ({
    ...withCurrentLocationFallback({
      destination: destination.trim(),
      country: attractionFilters.country.trim(),
      state: attractionFilters.state.trim(),
      attractionCategory: attractionFilters.attractionCategory,
    }),
  });

  /**
   * Gets the current hotel search criteria
   * 
   * @returns {Object} Hotel search criteria
   */
  const getHotelCriteria = () => ({
    ...withCurrentLocationFallback({
      destination: destination.trim(),
      country: hotelFilters.country.trim(),
      state: hotelFilters.state.trim(),
      roomType: hotelFilters.roomType,
    }),
  });

  /**
   * Gets the current restaurant search criteria
   * 
   * @returns {Object} Restaurant search criteria
   */
  const getRestaurantCriteria = () => ({
    ...withCurrentLocationFallback({
      destination: destination.trim(),
      country: restaurantFilters.country.trim(),
      state: restaurantFilters.state.trim(),
      foodCategory: restaurantFilters.foodCategory,
    }),
  });

  /**
   * Generic function to fetch filtered items for any view type
   * 
   * @param {Object} params - Fetch parameters
   * @param {Object} params.criteria - Search criteria
   * @param {number} params.start - Starting index for pagination
   * @param {boolean} params.append - Whether to append to existing results
   * @param {Function} params.search - Search API function
   * @param {string} params.responseKey - Key in response data
   * @param {Function} params.setItems - State setter for items
   * @param {Function} params.setSearchCriteria - State setter for search criteria
   * @param {Function} params.setNextStart - State setter for next start index
   * @param {Function} params.setHasMore - State setter for has more flag
   * @param {string} params.noun - Singular noun for display
   * @param {string} params.viewId - View identifier
   */
  const fetchFilteredItems = async ({
    criteria,
    start = 0,
    append = false,
    search,
    responseKey,
    setItems,
    setSearchCriteria,
    setNextStart,
    setHasMore,
    noun,
    viewId,
  }) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsSearching(true);
    }
    setErrorScope(viewId);
    setError('');
    setStatusScope(viewId);
    setStatus('');

    try {
      const response = await search({
        ...criteria,
        start,
      });
      const nextResults = response.data.data[responseKey];
      const nextItems = nextResults.items || [];

      setItems((currentItems) => {
        const mergedItems = append ? [...currentItems, ...nextItems] : nextItems;
        updateSearchSummary(viewId, mergedItems);
        return mergedItems;
      });
      setSearchCriteria(criteria);
      setNextStart(nextResults.nextStart || start + nextItems.length);
      setHasMore(Boolean(nextResults.hasMore && nextItems.length));
      if (nextResults.available) {
        setStatus(
          `${append ? 'Loaded' : 'Found'} ${nextItems.length} ${noun}${nextItems.length === 1 ? '' : 's'} for ${
            nextResults.query || destinationLabel
          }.`
        );
      } else {
        setError(nextResults.message || `${noun[0].toUpperCase()}${noun.slice(1)} search is unavailable.`);
      }
      if (!append) {
        fetchDestinationWeather(viewId, getWeatherRequest(criteria, nextItems));
      }
    } catch (requestError) {
      setErrorScope(viewId);
      setError(getErrorMessage(requestError));
      if (!append) {
        setItems([]);
        setHasMore(false);
      }
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  /**
   * Fetches attractions with the given criteria
   */
  const fetchAttractions = async ({ criteria, start = 0, append = false }) =>
    fetchFilteredItems({
      criteria,
      start,
      append,
      search: searchAttractions,
      responseKey: 'attractions',
      setItems: setAttractions,
      setSearchCriteria: setAttractionSearchCriteria,
      setNextStart: setNextAttractionStart,
      setHasMore: setHasMoreAttractions,
      noun: 'attraction',
      viewId: 'attractions',
    });

  /**
   * Handles attraction search form submission
   */
  const handleAttractionsSearch = async (event) => {
    event.preventDefault();
    await fetchAttractions({ criteria: getAttractionCriteria() });
  };

  /**
   * Fetches hotels with the given criteria
   */
  const fetchHotels = async ({ criteria, start = 0, append = false }) =>
    fetchFilteredItems({
      criteria,
      start,
      append,
      search: searchHotels,
      responseKey: 'hotels',
      setItems: setHotels,
      setSearchCriteria: setHotelSearchCriteria,
      setNextStart: setNextHotelStart,
      setHasMore: setHasMoreHotels,
      noun: 'hotel',
      viewId: 'hotels',
    });

  /**
   * Handles hotel search form submission
   */
  const handleHotelsSearch = async (event) => {
    event.preventDefault();
    await fetchHotels({ criteria: getHotelCriteria() });
  };

  /**
   * Fetches restaurants with the given criteria
   */
  const fetchRestaurants = async ({ criteria, start = 0, append = false }) =>
    fetchFilteredItems({
      criteria,
      start,
      append,
      search: searchRestaurants,
      responseKey: 'restaurants',
      setItems: setRestaurants,
      setSearchCriteria: setRestaurantSearchCriteria,
      setNextStart: setNextRestaurantStart,
      setHasMore: setHasMoreRestaurants,
      noun: 'restaurant',
      viewId: 'food',
    });

  /**
   * Handles restaurant search form submission
   */
  const handleRestaurantsSearch = async (event) => {
    event.preventDefault();
    await fetchRestaurants({ criteria: getRestaurantCriteria() });
  };

  /**
   * Handles loading more hotels (infinite scroll)
   */
  const handleLoadMoreHotels = () => {
    if (!hotelSearchCriteria) return;
    fetchHotels({ criteria: hotelSearchCriteria, start: nextHotelStart, append: true });
  };

  /**
   * Handles loading more attractions (infinite scroll)
   */
  const handleLoadMoreAttractions = () => {
    if (!attractionSearchCriteria) return;
    fetchAttractions({ criteria: attractionSearchCriteria, start: nextAttractionStart, append: true });
  };

  /**
   * Handles loading more restaurants (infinite scroll)
   */
  const handleLoadMoreRestaurants = () => {
    if (!restaurantSearchCriteria) return;
    fetchRestaurants({ criteria: restaurantSearchCriteria, start: nextRestaurantStart, append: true });
  };

  // Search handler delegation based on current view
  const handleSearch = isHotelsView ? handleHotelsSearch : isFoodView ? handleRestaurantsSearch : handleAttractionsSearch;
  const hasMoreFilteredItems = isHotelsView ? hasMoreHotels : isFoodView ? hasMoreRestaurants : hasMoreAttractions;
  const handleLoadMoreFilteredItems = isHotelsView
    ? handleLoadMoreHotels
    : isFoodView
      ? handleLoadMoreRestaurants
      : handleLoadMoreAttractions;

  /**
   * Handles flight search field changes
   */
  const handleFlightSearchChange = (field, value) => {
    setFlightSearch((currentSearch) => ({
      ...currentSearch,
      [field]: value,
    }));
  };

  /**
   * Handles flight country selection changes
   */
  const handleFlightCountryChange = (fieldPrefix, countryCode) => {
    const selectedCountry = countryOptions.find((country) => country.isoCode === countryCode);

    setFlightSearch((currentSearch) => ({
      ...currentSearch,
      [`${fieldPrefix}CountryCode`]: countryCode,
      [`${fieldPrefix}CountryName`]: selectedCountry?.name || '',
    }));
  };

  /**
   * Clears a flight country selection
   */
  const clearFlightCountry = (fieldPrefix) => {
    setFlightSearch((currentSearch) => ({
      ...currentSearch,
      [`${fieldPrefix}CountryCode`]: '',
      [`${fieldPrefix}CountryName`]: '',
    }));
  };

  /**
   * Clears a flight search field
   */
  const clearFlightSearchField = (field) => {
    setFlightSearch((currentSearch) => ({
      ...currentSearch,
      [field]: '',
    }));
  };

  /**
   * Handles flight search form submission
   */
  const handleFlightSearch = async (event) => {
    event.preventDefault();

    if (!flightSearch.fromCountryCode && !flightSearch.toCountryCode) {
      setErrorScope('transport:flights');
      setError('Select at least one country before searching flights.');
      return;
    }

    setIsSearching(true);
    setErrorScope('transport:flights');
    setError('');
    setStatusScope('transport:flights');
    setStatus('');

    try {
      const response = await searchFlight(flightSearch);
      const nextFlights = response.data.data.flights;
      setFlightResults(nextFlights);
      if (nextFlights.available) {
        setStatus(`${nextFlights.items.length} flight result${nextFlights.items.length === 1 ? '' : 's'} loaded.`);
      } else {
        setError(nextFlights.message || 'Flight search is unavailable.');
      }
    } catch (requestError) {
      setErrorScope('transport:flights');
      setError(getErrorMessage(requestError));
      setFlightResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Clears a train search field
   */
  const clearTrainSearchField = (field) => {
    setTrainSearch((currentSearch) => ({
      ...currentSearch,
      [field]: '',
    }));
  };

  /**
   * Handles train search field changes
   */
  const handleTrainSearchChange = (field, value) => {
    setTrainSearch((currentSearch) => ({
      ...currentSearch,
      [field]: value,
    }));
  };

  /**
   * Handles train station search form submission
   */
  const handleTrainStationSearch = async (event) => {
    event.preventDefault();

    setIsSearching(true);
    setErrorScope('transport:trains');
    setError('');
    setStatusScope('transport:trains');
    setStatus('');

    try {
      const response = await searchTrainStationTimetable({
        stationQuery: trainSearch.stationQuery.trim(),
        departureDate: trainSearch.departureDate,
        arrivalDate: '',
        operatorName: trainSearch.operatorName,
      });
      const nextTrains = response.data.data.trains;
      const operatorQuery = trainSearch.operatorName.trim().toLowerCase();
      const destinationQuery = trainSearch.destinationQuery.trim().toLowerCase();
      const nextItems = (nextTrains.items || []).filter((train) => {
        const matchesOperator = operatorQuery
          ? [train.operatorName, train.operator].filter(Boolean).some((name) => name.toLowerCase().includes(operatorQuery))
          : true;
        const matchesDestination = destinationQuery ? (train.destinationName || '').toLowerCase().includes(destinationQuery) : true;

        return matchesOperator && matchesDestination;
      });
      const filteredTrains = operatorQuery || destinationQuery
        ? {
            ...nextTrains,
            available: nextItems.length > 0,
            message:
              nextItems.length > 0
                ? nextTrains.message
                : `No trains found for ${[trainSearch.operatorName.trim(), trainSearch.destinationQuery.trim()].filter(Boolean).join(' to ')}.`,
            departures: nextItems,
            items: nextItems,
          }
        : nextTrains;
      setTrainResults(filteredTrains);
      if (filteredTrains.available) {
        setStatus(`${filteredTrains.items.length} train departure${filteredTrains.items.length === 1 ? '' : 's'} loaded.`);
      } else {
        setError(filteredTrains.message || 'Train search is unavailable.');
      }
    } catch (requestError) {
      setErrorScope('transport:trains');
      setError(getErrorMessage(requestError));
      setTrainResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Handles selecting a train to view its timetable
   */
  const handleTrainSelect = async (train) => {
    const trainUid = train.trainUid || train.train_uid || '';
    const serviceIdentifier =
      train.serviceIdentifier ||
      train.service_identifier ||
      train.serviceTimetableId ||
      (trainUid ? `train_uid:${trainUid}` : '');
    const params = new URLSearchParams({
      serviceDate: train.serviceDate || train.service_date || trainResults?.date || '',
      destinationName: train.destinationName || '',
      originName: train.originName || trainResults?.stationName || '',
      operatorName: train.operatorName || '',
      stationName: trainResults?.stationName || '',
      stationCode: trainResults?.stationCode || '',
    });

    if (serviceIdentifier) params.set('serviceIdentifier', serviceIdentifier);
    if (trainUid) params.set('trainUid', trainUid);
    if (train.actualRid || train.actual_rid) params.set('actualRid', train.actualRid || train.actual_rid);

    navigate(`/transportation/trains/service-timetable?${params.toString()}`, {
      state: {
        trainSearch,
        trainResults,
      },
    });
  };

  /**
   * Gets country name from country code
   */
  const getCountryName = (countryCode) =>
    countryOptions.find((country) => country.isoCode === countryCode)?.name || countryCode || '';

  /**
   * Gets airport location label for display
   */
  const getAirportLocationLabel = (airport = {}) => {
    const countryName = getCountryName(airport.countryCode);
    const airportName = airport.name && !airport.name.includes('unavailable') ? airport.name : '';
    return airport.city || countryName || airportName || 'Location unavailable';
  };

  /**
   * Gets airport detail label for display
   */
  const getAirportDetailLabel = (airport = {}) => {
    const airportCode = airport.iata || airport.icao || '';
    const airportName = airport.name && !airport.name.includes('unavailable') ? airport.name : '';
    const detail = airportName && airportCode ? `${airportName} (${airportCode})` : airportName || airportCode;
    return detail || 'Airport details unavailable';
  };

  /**
   * Gets flight code label for display
   */
  const getFlightCodeLabel = (flight = {}) => {
    const flightCode = flight.flightIata || (flight.airline?.iata && flight.flightNumber ? `${flight.airline.iata}${flight.flightNumber}` : '');
    return flightCode || (flight.type === 'live' ? 'Live flight' : 'Schedule');
  };

  /**
   * Formats flight time for display
   */
  const formatFlightTime = (value) => {
    if (!value) return '--:--';
    const time = value.match(/\b\d{2}:\d{2}\b/)?.[0];
    return time || value;
  };

  /**
   * Formats flight duration in minutes to human-readable string
   */
  const formatFlightDuration = (minutes) => {
    const totalMinutes = Number(minutes);

    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
      return 'Duration unavailable';
    }

    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (!hours) {
      return `${remainingMinutes} min`;
    }

    return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
  };

  /**
   * Gets the flight search title for display
   */
  const getFlightSearchTitle = () =>
    [flightSearch.fromCountryName, flightSearch.toCountryName].filter(Boolean).join(' to ') ||
    flightSearch.airlineName ||
    'Flight matches';

  /**
   * Gets converted price text for an item
   */
  const getConvertedPriceText = (item) => {
    const conversion = priceConversions[getPriceConversionKey(item, selectedCurrency)];

    if (!conversion) {
      return '';
    }

    const convertedAmount = formatMoney(conversion.amount, conversion.currency);
    const convertedMaxAmount =
      conversion.maxAmount !== null ? formatMoney(conversion.maxAmount, conversion.currency) : '';

    return convertedMaxAmount ? `${convertedAmount} - ${convertedMaxAmount}` : convertedAmount;
  };

  /**
   * Gets original price text for an item
   */
  const getOriginalPriceText = (item) => item.priceDetail?.display || item.price || 'Price unavailable';
  
  // Transportation-specific computed values
  const transportItems = activeTransportTab === 'flights' ? flightResults?.items || [] : trainResults?.items || [];
  const transportResultCount = transportItems.length;
  const transportAiSummary = transportResultCount
    ? `${activeTransportTab === 'flights' ? 'Flight' : 'Train'} options are ready for review. Compare timing, route details, and estimated prices before adding transport to the trip.`
    : `Search ${activeTransportTab === 'flights' ? 'flights' : 'trains'} to get AI-style transport recommendations.`;
  const aiPanelItems = isTransportationView ? transportItems : activeItems;
  const aiPanelResultCount = isTransportationView ? transportResultCount : resultCount;
  const aiPanelSummary = isTransportationView ? transportAiSummary : '';
  const aiPanelCanRefresh = isTransportationView ? false : hasResults;

  /**
   * Handles generating AI recommendations for the current view
   */
  const handleGenerateAiRecommendations = useCallback(async ({ manual = false } = {}) => {
    if (!activeItems.length) {
      setAiByView((currentAi) => ({
        ...currentAi,
        [activeOption.id]: {
          available: false,
          message: 'Search results are needed before AI recommendations can be generated.',
        },
      }));
      return;
    }

    if (!manual && aiRequestKeys[activeOption.id] === aiRequestKey) {
      return;
    }

    setAiRequestKeys((currentKeys) => ({
      ...currentKeys,
      [activeOption.id]: aiRequestKey,
    }));
    setAiLoadingView(activeOption.id);

    try {
      const ranking = await rankPlacesForWeather({
        items: activeItems,
        weather: activeWeather,
        trip: {
          destination: aiDestination,
        },
        day: {
          location: aiDestination,
          date: travelDate,
        },
        category: activeOption.id,
      });
      if (ranking.available) {
        const rankedItems = ranking.items;
        if (activeOption.id === 'attractions') {
          setAttractions(rankedItems);
        } else if (activeOption.id === 'food') {
          setRestaurants(rankedItems);
        } else if (activeOption.id === 'hotels') {
          setHotels(rankedItems);
        }
        updateSearchSummary(activeOption.id, rankedItems);
      }
      setAiByView((currentAi) => ({
        ...currentAi,
        [activeOption.id]: ranking,
      }));
    } catch (requestError) {
      setAiByView((currentAi) => ({
        ...currentAi,
        [activeOption.id]: {
          available: false,
          message: getErrorMessage(requestError),
        },
      }));
    } finally {
      setAiLoadingView('');
    }
  }, [activeItems, activeOption.id, activeWeather, aiDestination, aiRequestKey, aiRequestKeys, travelDate]);

  /**
   * Effect hook that triggers AI recommendations when search results change
   */
  useEffect(() => {
    if (!isSearchView || !hasResults || isSearching || isLoadingMore || isWeatherLoading || isAiLoading || !aiRequestKey) {
      return;
    }

    if (aiRequestKeys[activeOption.id] === aiRequestKey) {
      return;
    }

    handleGenerateAiRecommendations({ manual: false });
  }, [
    activeOption.id,
    aiRequestKey,
    aiRequestKeys,
    handleGenerateAiRecommendations,
    hasResults,
    isAiLoading,
    isLoadingMore,
    isSearchView,
    isSearching,
    isWeatherLoading,
  ]);

  /**
   * Updates the active filter field based on current view
   */
  const updateActiveFilterField = isHotelsView
    ? handleHotelFilterChange
    : isFoodView
      ? handleRestaurantFilterChange
      : handleAttractionFilterChange;

  /**
   * Effect hook that loads user favorites on component mount
   */
  useEffect(() => {
    let isActive = true;

    getFavorites()
      .then((response) => {
        if (!isActive) return;
        const favorites = response.data?.data?.favorites || [];
        const attractionRecords = {};
        const hotelRecords = {};
        const restaurantRecords = {};

        favorites.forEach((favorite) => {
          if (favorite.type === 'attraction') {
            const key = getAttractionFavoriteKey({ dataId: favorite.externalId, name: favorite.title });
            if (key) attractionRecords[key] = favorite;
          }
          if (favorite.type === 'hotel') {
            const key = getHotelFavoriteKey({ dataId: favorite.externalId, name: favorite.title });
            if (key) hotelRecords[key] = favorite;
          }
          if (favorite.type === 'restaurant') {
            const key = getRestaurantFavoriteKey({ dataId: favorite.externalId, name: favorite.title });
            if (key) restaurantRecords[key] = favorite;
          }
        });

        setFavoriteAttractionRecords(attractionRecords);
        setFavoriteHotelRecords(hotelRecords);
        setFavoriteRestaurantRecords(restaurantRecords);
        setFavoriteAttractionKeys(Object.keys(attractionRecords));
        setFavoriteHotelKeys(Object.keys(hotelRecords));
        setFavoriteRestaurantKeys(Object.keys(restaurantRecords));
      })
      .catch(() => {
        if (!isActive) return;
        setFavoriteAttractionRecords({});
        setFavoriteHotelRecords({});
        setFavoriteRestaurantRecords({});
      });

    return () => {
      isActive = false;
    };
  }, []);

  /**
   * Handles attraction favorite changes
   */
  const handleAttractionFavoriteChange = (attraction, result = {}) => {
    const favoriteKey = getAttractionFavoriteKey(attraction);
    if (!favoriteKey) return;

    if (result.action === 'removed') {
      setFavoriteAttractionKeys((currentKeys) => currentKeys.filter((key) => key !== favoriteKey));
      setFavoriteAttractionRecords((currentRecords) => {
        const nextRecords = { ...currentRecords };
        delete nextRecords[favoriteKey];
        return nextRecords;
      });
      return;
    }

    setFavoriteAttractionKeys((currentKeys) => (currentKeys.includes(favoriteKey) ? currentKeys : [...currentKeys, favoriteKey]));
    if (result.favorite) {
      setFavoriteAttractionRecords((currentRecords) => ({ ...currentRecords, [favoriteKey]: result.favorite }));
    }
  };

  /**
   * Handles hotel favorite changes
   */
  const handleHotelFavoriteChange = (hotel, result = {}) => {
    const favoriteKey = getHotelFavoriteKey(hotel);
    if (!favoriteKey) return;

    if (result.action === 'removed') {
      setFavoriteHotelKeys((currentKeys) => currentKeys.filter((key) => key !== favoriteKey));
      setFavoriteHotelRecords((currentRecords) => {
        const nextRecords = { ...currentRecords };
        delete nextRecords[favoriteKey];
        return nextRecords;
      });
      return;
    }

    setFavoriteHotelKeys((currentKeys) => (currentKeys.includes(favoriteKey) ? currentKeys : [...currentKeys, favoriteKey]));
    if (result.favorite) {
      setFavoriteHotelRecords((currentRecords) => ({ ...currentRecords, [favoriteKey]: result.favorite }));
    }
  };

  /**
   * Handles restaurant favorite changes
   */
  const handleRestaurantFavoriteChange = (restaurant, result = {}) => {
    const favoriteKey = getRestaurantFavoriteKey(restaurant);
    if (!favoriteKey) return;

    if (result.action === 'removed') {
      setFavoriteRestaurantKeys((currentKeys) => currentKeys.filter((key) => key !== favoriteKey));
      setFavoriteRestaurantRecords((currentRecords) => {
        const nextRecords = { ...currentRecords };
        delete nextRecords[favoriteKey];
        return nextRecords;
      });
      return;
    }

    setFavoriteRestaurantKeys((currentKeys) => (currentKeys.includes(favoriteKey) ? currentKeys : [...currentKeys, favoriteKey]));
    if (result.favorite) {
      setFavoriteRestaurantRecords((currentRecords) => ({ ...currentRecords, [favoriteKey]: result.favorite }));
    }
  };

  // Detail page return state for each view type
  const attractionDetailReturnState = {
    attractionResults: attractions,
    attractionFilters,
    attractionSearchCriteria,
    favoriteAttractionKeys,
    attractionWeather: weatherByView.attractions,
    attractionAi: aiByView.attractions,
    travelDate,
    hasMoreAttractions,
    nextAttractionStart,
    returnSearch: searchParams.toString(),
  };
  const hotelDetailReturnState = {
    hotelResults: hotels,
    hotelFilters,
    hotelSearchCriteria,
    favoriteHotelKeys,
    hotelWeather: weatherByView.hotels,
    hotelAi: aiByView.hotels,
    travelDate,
    hasMoreHotels,
    nextHotelStart,
    returnSearch: searchParams.toString(),
  };
  const restaurantDetailReturnState = {
    restaurantResults: restaurants,
    restaurantFilters,
    restaurantSearchCriteria,
    favoriteRestaurantKeys,
    restaurantWeather: weatherByView.food,
    restaurantAi: aiByView.food,
    travelDate,
    hasMoreRestaurants,
    nextRestaurantStart,
    returnSearch: searchParams.toString(),
  };
  const activeDetailReturnState = isHotelsView
    ? hotelDetailReturnState
    : isFoodView
      ? restaurantDetailReturnState
      : isAttractionsView
        ? attractionDetailReturnState
        : null;

  /**
   * Props for the search submenu components
   */
  const searchSubmenuProps = {
    activeAi,
    activeFilters,
    activeItems,
    activeOption,
    activeWeather,
    countryOptions,
    categoryOptions,
    destination,
    destinationLabel,
    error: errorScope === activeOption.id ? error : '',
    getConvertedPriceText,
    getOriginalPriceText,
    handleCountryChange,
    handleLoadMoreFilteredItems,
    handleSearch,
    handleTravelDateChange,
    hasMoreFilteredItems,
    hasResults,
    isItemFavorite: (item) =>
      isHotelsView
        ? favoriteHotelKeys.includes(getHotelFavoriteKey(item))
        : isFoodView
          ? favoriteRestaurantKeys.includes(getRestaurantFavoriteKey(item))
          : isAttractionsView
            ? favoriteAttractionKeys.includes(getAttractionFavoriteKey(item))
            : false,
    getFavoriteRecord: (item) =>
      isHotelsView
        ? favoriteHotelRecords[getHotelFavoriteKey(item)]
        : isFoodView
          ? favoriteRestaurantRecords[getRestaurantFavoriteKey(item)]
          : isAttractionsView
            ? favoriteAttractionRecords[getAttractionFavoriteKey(item)]
            : null,
    detailReturnState: activeDetailReturnState,
    onAttractionFavoriteChange: handleAttractionFavoriteChange,
    onHotelFavoriteChange: handleHotelFavoriteChange,
    onRestaurantFavoriteChange: handleRestaurantFavoriteChange,
    isAiLoading,
    isAttractionsView,
    isFilteredSearchView,
    isFoodView,
    isHotelsView,
    isLoadingMore,
    isSearching,
    isWeatherLoading,
    pricedCount,
    ratedCount,
    resultCount,
    searchConfig,
    selectedAttractionCategory,
    selectedAttractionCategoryLabel,
    selectedFoodCategoryLabel,
    selectedCurrency,
    selectedRoomLabel,
    selectedFoodCategory: selectedRestaurantFoodCategory,
    selectedRoomType: selectedHotelRoomType,
    stateOptions,
    status: statusScope === activeOption.id ? status : '',
    topRatedCount,
    travelDate,
    updateDestinationQuery,
    updateFilterField: updateActiveFilterField,
  };

  /**
   * Renders the appropriate submenu based on the current view
   * 
   * @returns {JSX.Element} The rendered submenu component
   */
  const renderSubmenu = () => {
    if (isTransportationView) {
      return (
        <TransportationSubmenu
          activeTransportTab={activeTransportTab}
          clearFlightCountry={clearFlightCountry}
          clearFlightSearchField={clearFlightSearchField}
          countryOptions={countryOptions}
          error={errorScope === transportScope ? error : ''}
          flightResults={flightResults}
          flightSearch={flightSearch}
          formatFlightDuration={formatFlightDuration}
          formatFlightTime={formatFlightTime}
          getAirportDetailLabel={getAirportDetailLabel}
          getAirportLocationLabel={getAirportLocationLabel}
          getFlightCodeLabel={getFlightCodeLabel}
          getFlightSearchTitle={getFlightSearchTitle}
          handleFlightCountryChange={handleFlightCountryChange}
          handleFlightSearch={handleFlightSearch}
          handleFlightSearchChange={handleFlightSearchChange}
          handleTrainSearchChange={handleTrainSearchChange}
          handleTrainSelect={handleTrainSelect}
          handleTrainStationSearch={handleTrainStationSearch}
          isSearching={isSearching}
          setActiveTransportTab={setActiveTransportTab}
          status={statusScope === transportScope ? status : ''}
          trainResults={trainResults}
          trainSearch={trainSearch}
          clearTrainSearchField={clearTrainSearchField}
        />
      );
    }

    if (isAttractionsView) {
      return <AttractionsSubmenu {...searchSubmenuProps} />;
    }

    if (isFoodView) {
      return <RestaurantSubmenu {...searchSubmenuProps} />;
    }

    if (isHotelsView) {
      return <HotelsSubmenu {...searchSubmenuProps} />;
    }

    return <AttractionsSubmenu {...searchSubmenuProps} />;
  };

  return (
    <section className="explore-page">
      <div className="explore-shell">
        <div className="explore-main-column">
          {/* Hero section */}
          <div className="explore-hero">
            <div>
              <span className="explore-eyebrow">
                <MapPinned size={15} aria-hidden="true" />
                Explore
              </span>
              <h2>{activeOption.label}</h2>
              <p> Browse real-time availability and transit durations from live transport data to ensure a seamless connection for the rest of your trip.</p>
            </div>
            {/* Search view panel */}
            {isSearchView && (
              <div className="explore-hero-panel" aria-label={`${activeOption.label} search summary`}>
                <div>
                  <span>Current search</span>
                  <strong>{destinationLabel}</strong>
                </div>
                <small>{resultCount ? `${resultCount} result${resultCount === 1 ? '' : 's'} loaded` : 'Search to discover places'}</small>
                <div className="explore-hero-meter" aria-hidden="true">
                  <span style={{ width: hasResults ? '100%' : '38%' }} />
                </div>
              </div>
            )}
            {/* Transportation view panel */}
            {isTransportationView && (
              <div className="explore-hero-panel" aria-label="Transportation search summary">
                <div>
                  <span>Current search</span>
                  <strong>{activeTransportTab === 'flights' ? getFlightSearchTitle() : trainResults?.stationName || 'Transportation'}</strong>
                </div>
                <small>{transportResultCount ? `${transportResultCount} result${transportResultCount === 1 ? '' : 's'} loaded` : 'Ready to find routes'}</small>
                <div className="explore-hero-meter" aria-hidden="true">
                  <span style={{ width: transportResultCount ? '100%' : '38%' }} />
                </div>
              </div>
            )}
          </div>

          {/* Render the appropriate submenu */}
          {renderSubmenu()}
        </div>
        {/* AI panel sidebar */}
        <ExploreAiPanel
          activeAi={isTransportationView ? null : activeAi}
          activeOption={activeOption}
          canRefresh={aiPanelCanRefresh}
          currentLocationName={currentLocationName}
          destinationLabel={isTransportationView ? activeTransportTab : destinationLabel}
          isLoading={isTransportationView ? false : isAiLoading}
          items={aiPanelItems}
          onRefresh={() => handleGenerateAiRecommendations({ manual: true })}
          resultCount={aiPanelResultCount}
          summary={aiPanelSummary}
        />
      </div>
    </section>
  );
}

export default ExplorePage;
