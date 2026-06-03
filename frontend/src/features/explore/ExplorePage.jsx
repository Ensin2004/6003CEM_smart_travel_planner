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
  getAiRecommendations,
  searchAttractions,
  searchFlight,
  searchHotels,
  searchRestaurants,
  searchTrainStationTimetable,
  searchWeather,
} from '../../api/exploreApi';
import { getFavorites } from '../../api/favoriteApi';
import CurrencyContext from '../../context/currencyContext';
import { foodCategoryOptions, roomTypeOptions } from './explore.constants';
import { formatMoney, getDateKey, getErrorMessage, getPriceConversionKey } from './explore.helpers';
import AttractionsSubmenu from './submenus/Attractions';
import RestaurantSubmenu from './submenus/Restaurant';
import HotelsSubmenu from './submenus/Hotels';
import TransportationSubmenu from './submenus/Transportation';
import './ExplorePage.css';

const viewOptions = [
  { id: 'attractions', label: 'Attractions', icon: MapPinned },
  { id: 'food', label: 'Restaurants / Food', icon: Utensils },
  { id: 'hotels', label: 'Hotels / Rooms', icon: Building2 },
  { id: 'transport', label: 'Transportation', icon: Compass },
];
const getHotelFavoriteKey = (hotel = {}) =>
  String(hotel.dataId || hotel.placeId || hotel.id || hotel.name || '')
    .trim()
    .toLowerCase();
const getRestaurantFavoriteKey = (restaurant = {}) =>
  String(restaurant.dataId || restaurant.placeId || restaurant.id || restaurant.name || '')
    .trim()
    .toLowerCase();
const getAttractionFavoriteKey = (attraction = {}) =>
  String(attraction.dataId || attraction.placeId || attraction.id || attraction.name || '')
    .trim()
    .toLowerCase();
// ExplorePage renders the main screen and handles nearby interactions.
function ExplorePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currency = useContext(CurrencyContext);
  const activeView = searchParams.get('view') || 'attractions';
  const destination = searchParams.get('q') || '';
  const [travelDate, setTravelDate] = useState(getDateKey());
  const restoredAttractionState = location.state?.attractionResults ? location.state : null;
  const [attractions, setAttractions] = useState(restoredAttractionState?.attractionResults || []);
  const restoredHotelState = location.state?.hotelResults ? location.state : null;
  const restoredRestaurantState = location.state?.restaurantResults ? location.state : null;
  const [hotels, setHotels] = useState(restoredHotelState?.hotelResults || []);
  const [restaurants, setRestaurants] = useState(restoredRestaurantState?.restaurantResults || []);
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
  const [priceConversions, setPriceConversions] = useState({});
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
  const [hotelSearchCriteria, setHotelSearchCriteria] = useState(restoredHotelState?.hotelSearchCriteria || null);
  const [favoriteAttractionKeys, setFavoriteAttractionKeys] = useState(restoredAttractionState?.favoriteAttractionKeys || []);
  const [favoriteHotelKeys, setFavoriteHotelKeys] = useState(restoredHotelState?.favoriteHotelKeys || []);
  const [favoriteRestaurantKeys, setFavoriteRestaurantKeys] = useState(restoredRestaurantState?.favoriteRestaurantKeys || []);
  const [favoriteAttractionRecords, setFavoriteAttractionRecords] = useState({});
  const [favoriteHotelRecords, setFavoriteHotelRecords] = useState({});
  const [favoriteRestaurantRecords, setFavoriteRestaurantRecords] = useState({});
  const [restaurantSearchCriteria, setRestaurantSearchCriteria] = useState(restoredRestaurantState?.restaurantSearchCriteria || null);
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
    operatorName: restoredTrainState?.trainSearch?.operatorName || '',
    departureDate: restoredTrainState?.trainSearch?.departureDate || '',
    arrivalDate: restoredTrainState?.trainSearch?.arrivalDate || '',
  });
  const [trainResults, setTrainResults] = useState(restoredTrainState?.trainResults || null);
  const [nextHotelStart, setNextHotelStart] = useState(restoredHotelState?.nextHotelStart || 0);
  const [nextRestaurantStart, setNextRestaurantStart] = useState(restoredRestaurantState?.nextRestaurantStart || 0);
  const [hasMoreHotels, setHasMoreHotels] = useState(restoredHotelState?.hasMoreHotels || false);
  const [hasMoreRestaurants, setHasMoreRestaurants] = useState(restoredRestaurantState?.hasMoreRestaurants || false);
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
  const [lastSearchSummary, setLastSearchSummary] = useState({
    attractions: { loaded: 0, priced: 0, rated: 0, topRated: 0 },
    food: { loaded: 0, priced: 0, rated: 0, topRated: 0 },
    hotels: { loaded: 0, priced: 0, rated: 0, topRated: 0 },
  });
  const activeOption = useMemo(
    () => viewOptions.find((option) => option.id === activeView) || viewOptions[0],
    [activeView]
  );
  const isAttractionsView = activeOption.id === 'attractions';
  const isFoodView = activeOption.id === 'food';
  const isHotelsView = activeOption.id === 'hotels';
  const isTransportationView = activeOption.id === 'transport';
  const isFilteredSearchView = isHotelsView || isFoodView;
  const isSearchView = isAttractionsView || isFilteredSearchView;
  const activeItems = isHotelsView ? hotels : isFoodView ? restaurants : attractions;
  const activeFilters = isFoodView ? restaurantFilters : hotelFilters;
  const activeWeather = weatherByView[activeOption.id];
  const activeAi = aiByView[activeOption.id];
  const isWeatherLoading = weatherLoadingView === activeOption.id;
  const isAiLoading = aiLoadingView === activeOption.id;
  const selectedCurrency = currency?.selectedCurrency || 'USD';
  const supportedCurrencyCodes = useMemo(() => currency?.currencies?.map((option) => option.code) || [], [currency?.currencies]);
  const currentSummary = lastSearchSummary[activeOption.id] || {
    loaded: activeItems.length,
    priced: 0,
    rated: 0,
    topRated: 0,
  };
  const transportScope = `transport:${activeTransportTab}`;
  const countryOptions = useMemo(() => Country.getAllCountries(), []);
  const stateOptions = useMemo(
    () => (activeFilters.countryCode ? State.getStatesOfCountry(activeFilters.countryCode) : []),
    [activeFilters.countryCode]
  );
  const selectedHotelRoomType = hotelSearchCriteria?.roomType ?? hotelFilters.roomType;
  const selectedRoomLabel = roomTypeOptions.find((option) => option.value === selectedHotelRoomType)?.label || 'Any';
  const selectedRestaurantFoodCategory = restaurantSearchCriteria?.foodCategory ?? restaurantFilters.foodCategory;
  const selectedFoodCategoryLabel =
    foodCategoryOptions.find((option) => option.value === selectedRestaurantFoodCategory)?.label || 'Any';
  const submittedSearchCriteria = isHotelsView ? hotelSearchCriteria : isFoodView ? restaurantSearchCriteria : null;
  const filteredSearchLabel = [
    submittedSearchCriteria?.destination ?? destination.trim(),
    submittedSearchCriteria?.state ?? activeFilters.state.trim(),
    submittedSearchCriteria?.country ?? activeFilters.country.trim(),
    isHotelsView && selectedHotelRoomType ? selectedRoomLabel : '',
    isFoodView && selectedRestaurantFoodCategory ? selectedFoodCategoryLabel : '',
  ]
    .filter(Boolean)
    .join(', ');
  const resultCount = currentSummary.loaded || activeItems.length;
  const ratedCount = currentSummary.rated || activeItems.filter((item) => item.rating).length;
  const topRatedCount = currentSummary.topRated || activeItems.filter((item) => item.rating >= 4.5).length;
  const pricedCount = currentSummary.priced || activeItems.filter((item) => item.price || item.priceDetail).length;
  const hasResults = resultCount > 0;
  const destinationLabel = isFilteredSearchView ? filteredSearchLabel || 'None' : destination.trim() || 'None';
  const weatherLocationLabel = activeWeather?.location?.label || activeWeather?.destination || destinationLabel;
  const aiDestination = (isFilteredSearchView ? filteredSearchLabel : destination.trim()) || destination.trim();
  const aiRequestKey = useMemo(() => {
    if (!isSearchView || !activeItems.length) {
      return '';
    }

    return JSON.stringify({
      view: activeOption.id,
      destination: aiDestination,
      date: travelDate,
      weather: activeWeather?.available ? activeWeather.condition : activeWeather?.message || '',
      items: activeItems.slice(0, 20).map((item) => ({
        id: item.id || item.name,
        rating: item.rating || '',
        price: item.priceDetail?.display || item.price || '',
        openState: item.openState || '',
      })),
    });
  }, [activeItems, activeOption.id, activeWeather, aiDestination, isSearchView, travelDate]);
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

  // Update Destination Query applies allowed changes to an existing record.
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

  // Update Search Summary applies allowed changes to an existing record.
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
  const handleAttractionsSearch = async (event) => {
    event.preventDefault();

    if (!destination.trim()) {
      setErrorScope('attractions');
      setError('Enter a destination first.');
      return;
    }

    setIsSearching(true);
    setErrorScope('attractions');
    setError('');
    setStatusScope('attractions');
    setStatus('');

    try {
      const response = await searchAttractions(destination.trim());
      const nextAttractions = response.data.data.attractions;
      const nextItems = nextAttractions.items || [];
      setAttractions(nextItems);
      updateSearchSummary('attractions', nextItems);
      setStatus(
        nextAttractions.available
          ? `Found ${nextItems.length} attraction${nextItems.length === 1 ? '' : 's'} for ${destination.trim()}.`
          : nextAttractions.message
      );
      fetchDestinationWeather('attractions', getWeatherRequest({ destination: destination.trim() }, nextItems));
    } catch (requestError) {
      setErrorScope('attractions');
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

  const getWeatherDestination = (criteria) =>
    [criteria.destination, criteria.state, criteria.country].filter(Boolean).join(', ');

  const getWeatherRequest = (criteria, items = []) => {
    const weatherDestination = getWeatherDestination(criteria);
    const locatedItem = items.find((item) => item.coordinates?.latitude && item.coordinates?.longitude);

    return {
      destination: weatherDestination || criteria.destination || destination.trim(),
      latitude: locatedItem?.coordinates?.latitude,
      longitude: locatedItem?.coordinates?.longitude,
      locationLabel: locatedItem ? locatedItem.address || locatedItem.name : weatherDestination,
    };
  };

  const fetchDestinationWeather = async (viewId, weatherRequest) => {
    const weatherDestination = weatherRequest?.destination;

    if (!weatherDestination) {
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
    } catch (requestError) {
      setWeatherByView((currentWeather) => ({
        ...currentWeather,
        [viewId]: {
          available: false,
          message: getErrorMessage(requestError),
        },
      }));
    } finally {
      setWeatherLoadingView('');
    }
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

  const fetchFilteredItems = async ({
    criteria,
    start = 0,
    append = false,
    hasCriteria,
    emptyMessage,
    search,
    responseKey,
    setItems,
    setSearchCriteria,
    setNextStart,
    setHasMore,
    noun,
    viewId,
  }) => {
    if (!hasCriteria(criteria)) {
      setErrorScope(viewId);
      setError(emptyMessage);
      return;
    }

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
      setStatus(
        nextResults.available
          ? `${append ? 'Loaded' : 'Found'} ${nextItems.length} ${noun}${nextItems.length === 1 ? '' : 's'} for ${
              nextResults.query || destinationLabel
            }.`
          : nextResults.message
      );
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

  const fetchHotels = async ({ criteria, start = 0, append = false }) =>
    fetchFilteredItems({
      criteria,
      start,
      append,
      hasCriteria: hasHotelCriteria,
      emptyMessage: 'Enter a hotel name, country, location, or room type first.',
      search: searchHotels,
      responseKey: 'hotels',
      setItems: setHotels,
      setSearchCriteria: setHotelSearchCriteria,
      setNextStart: setNextHotelStart,
      setHasMore: setHasMoreHotels,
      noun: 'hotel',
      viewId: 'hotels',
    });

  const handleHotelsSearch = async (event) => {
    event.preventDefault();
    await fetchHotels({ criteria: getHotelCriteria() });
  };

  const fetchRestaurants = async ({ criteria, start = 0, append = false }) =>
    fetchFilteredItems({
      criteria,
      start,
      append,
      hasCriteria: hasRestaurantCriteria,
      emptyMessage: 'Enter a restaurant name, country, location, or food category first.',
      search: searchRestaurants,
      responseKey: 'restaurants',
      setItems: setRestaurants,
      setSearchCriteria: setRestaurantSearchCriteria,
      setNextStart: setNextRestaurantStart,
      setHasMore: setHasMoreRestaurants,
      noun: 'restaurant',
      viewId: 'food',
    });

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

  const handleFlightSearchChange = (field, value) => {
    setFlightSearch((currentSearch) => ({
      ...currentSearch,
      [field]: value,
    }));
  };

  const handleFlightCountryChange = (fieldPrefix, countryCode) => {
    const selectedCountry = countryOptions.find((country) => country.isoCode === countryCode);

    setFlightSearch((currentSearch) => ({
      ...currentSearch,
      [`${fieldPrefix}CountryCode`]: countryCode,
      [`${fieldPrefix}CountryName`]: selectedCountry?.name || '',
    }));
  };

  const clearFlightCountry = (fieldPrefix) => {
    setFlightSearch((currentSearch) => ({
      ...currentSearch,
      [`${fieldPrefix}CountryCode`]: '',
      [`${fieldPrefix}CountryName`]: '',
    }));
  };

  const clearFlightSearchField = (field) => {
    setFlightSearch((currentSearch) => ({
      ...currentSearch,
      [field]: '',
    }));
  };

  const handleFlightSearch = async (event) => {
    event.preventDefault();

    if (!flightSearch.airlineName.trim() && !flightSearch.fromCountryCode && !flightSearch.toCountryCode) {
      setErrorScope('transport:flights');
      setError('Enter an airline name or select at least one country.');
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
      setStatus(
        nextFlights.available
          ? `${nextFlights.items.length} flight result${nextFlights.items.length === 1 ? '' : 's'} loaded.`
          : nextFlights.message
      );
    } catch (requestError) {
      setErrorScope('transport:flights');
      setError(getErrorMessage(requestError));
      setFlightResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const clearTrainSearchField = (field) => {
    setTrainSearch((currentSearch) => ({
      ...currentSearch,
      [field]: '',
    }));
  };

  const handleTrainSearchChange = (field, value) => {
    setTrainSearch((currentSearch) => ({
      ...currentSearch,
      [field]: value,
    }));
  };

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
        arrivalDate: trainSearch.arrivalDate,
        operatorName: trainSearch.operatorName,
      });
      const nextTrains = response.data.data.trains;
      const operatorQuery = trainSearch.operatorName.trim().toLowerCase();
      const nextItems = operatorQuery
        ? (nextTrains.items || []).filter((train) =>
            [train.operatorName, train.operator].filter(Boolean).some((name) => name.toLowerCase().includes(operatorQuery))
          )
        : nextTrains.items || [];
      const filteredTrains = operatorQuery
        ? {
            ...nextTrains,
            available: nextItems.length > 0,
            message: nextItems.length > 0 ? nextTrains.message : `No trains found for operator ${trainSearch.operatorName.trim()}.`,
            departures: nextItems,
            items: nextItems,
          }
        : nextTrains;
      setTrainResults(filteredTrains);
      setStatus(
        filteredTrains.available
          ? `${filteredTrains.items.length} train departure${filteredTrains.items.length === 1 ? '' : 's'} loaded.`
          : filteredTrains.message
      );
    } catch (requestError) {
      setErrorScope('transport:trains');
      setError(getErrorMessage(requestError));
      setTrainResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTrainSelect = async (train) => {
    const params = new URLSearchParams({
      serviceDate: train.serviceDate || trainResults?.date || '',
      destinationName: train.destinationName || '',
      originName: train.originName || trainResults?.stationName || '',
      operatorName: train.operatorName || '',
      stationName: trainResults?.stationName || '',
      stationCode: trainResults?.stationCode || '',
    });

    if (train.serviceIdentifier) params.set('serviceIdentifier', train.serviceIdentifier);
    if (train.trainUid) params.set('trainUid', train.trainUid);
    if (train.actualRid) params.set('actualRid', train.actualRid);

    navigate(`/transportation/trains/service-timetable?${params.toString()}`, {
      state: {
        trainSearch,
        trainResults,
      },
    });
  };

  const getCountryName = (countryCode) =>
    countryOptions.find((country) => country.isoCode === countryCode)?.name || countryCode || '';

  const getAirportLocationLabel = (airport = {}) => {
    const countryName = getCountryName(airport.countryCode);
    const airportName = airport.name && !airport.name.includes('unavailable') ? airport.name : '';
    return airport.city || countryName || airportName || 'Location unavailable';
  };

  const getAirportDetailLabel = (airport = {}) => {
    const airportCode = airport.iata || airport.icao || '';
    const airportName = airport.name && !airport.name.includes('unavailable') ? airport.name : '';
    const detail = airportName && airportCode ? `${airportName} (${airportCode})` : airportName || airportCode;
    return detail || 'Airport details unavailable';
  };

  const getFlightCodeLabel = (flight = {}) => {
    const flightCode = flight.flightIata || (flight.airline?.iata && flight.flightNumber ? `${flight.airline.iata}${flight.flightNumber}` : '');
    return flightCode || (flight.type === 'live' ? 'Live flight' : 'Schedule');
  };

  const formatFlightTime = (value) => {
    if (!value) return '--:--';
    const time = value.match(/\b\d{2}:\d{2}\b/)?.[0];
    return time || value;
  };

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

  const getFlightSearchTitle = () =>
    [flightSearch.fromCountryName, flightSearch.toCountryName].filter(Boolean).join(' to ') ||
    flightSearch.airlineName ||
    'Flight matches';

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

  const getOriginalPriceText = (item) => item.priceDetail?.display || item.price || 'Price unavailable';

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
      const response = await getAiRecommendations({
        view: activeOption.id,
        destination: aiDestination,
        date: travelDate,
        weather: activeWeather,
        items: activeItems.slice(0, 20),
      });
      setAiByView((currentAi) => ({
        ...currentAi,
        [activeOption.id]: response.data.data.recommendations,
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

  const updateActiveFilterField = isFoodView ? handleRestaurantFilterChange : handleHotelFilterChange;
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

  const attractionDetailReturnState = {
    attractionResults: attractions,
    favoriteAttractionKeys,
    attractionWeather: weatherByView.attractions,
    attractionAi: aiByView.attractions,
    returnSearch: searchParams.toString(),
  };
  const hotelDetailReturnState = {
    hotelResults: hotels,
    hotelFilters,
    hotelSearchCriteria,
    favoriteHotelKeys,
    hotelWeather: weatherByView.hotels,
    hotelAi: aiByView.hotels,
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
  const searchSubmenuProps = {
    activeAi,
    activeFilters,
    activeItems,
    activeOption,
    activeWeather,
    countryOptions,
    destination,
    destinationLabel,
    error: errorScope === activeOption.id ? error : '',
    getConvertedPriceText,
    getOriginalPriceText,
    handleCountryChange,
    handleGenerateAiRecommendations,
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
    selectedFoodCategoryLabel,
    selectedRoomLabel,
    selectedFoodCategory: selectedRestaurantFoodCategory,
    selectedRoomType: selectedHotelRoomType,
    stateOptions,
    status: statusScope === activeOption.id ? status : '',
    topRatedCount,
    travelDate,
    updateDestinationQuery,
    updateFilterField: updateActiveFilterField,
    weatherLocationLabel,
  };

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
      <div className="explore-hero">
        <div>
          <span className="explore-eyebrow">
            <MapPinned size={15} aria-hidden="true" />
            Explore
          </span>
          <h2>{activeOption.label}</h2>
          <p> Browse real-time availability and transit durations from live transport data to ensure a seamless connection for the rest of your trip.</p>
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

      {renderSubmenu()}
    </section>
  );
}

export default ExplorePage;
