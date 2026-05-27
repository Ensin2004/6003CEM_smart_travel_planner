import {
  ArrowLeftRight,
  Building2,
  CalendarDays,
  CloudSun,
  X,
  Compass,
  DollarSign,
  Droplets,
  LoaderCircle,
  MapPinned,
  Plane,
  Search,
  Sparkles,
  Star,
  TrainFront,
  Utensils,
  Wind,
} from 'lucide-react';
import { Country, State } from 'country-state-city';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { convertCurrency } from '../../api/currencyApi';
import { getAiRecommendations, searchAttractions, searchFlight, searchHotels, searchRestaurants, searchWeather } from '../../api/exploreApi';
import PlaceCard from '../../components/place/PlaceCard';
import CurrencyContext from '../../context/currencyContext';
import { foodCategoryOptions, roomTypeOptions } from './explore.constants';
import './ExplorePage.css';

const viewOptions = [
  { id: 'discover', label: 'AI Discovery', icon: Sparkles },
  { id: 'attractions', label: 'Attractions', icon: MapPinned },
  { id: 'food', label: 'Restaurants / Food', icon: Utensils },
  { id: 'hotels', label: 'Hotels / Rooms', icon: Building2 },
  { id: 'transport', label: 'Transportation', icon: Compass },
];

const transportationTabs = [
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'trains', label: 'Trains', icon: TrainFront },
];

const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data?.error || error.message || 'Unable to search right now.';

const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const getMaxWeatherDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 214);
  return getDateKey(date);
};

const formatWeatherDate = (date) =>
  new Intl.DateTimeFormat('en', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));

const formatTemperature = (value) => (Number.isFinite(Number(value)) ? `${Math.round(Number(value))} C` : '--');

const formatMoney = (amount, currencyCode) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);

const getPriceConversionKey = (item, targetCurrency) =>
  `${item.id}:${item.priceDetail?.display || item.price || 'price'}:${targetCurrency}`;

function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currency = useContext(CurrencyContext);
  const activeView = searchParams.get('view') || 'discover';
  const destination = searchParams.get('q') || '';
  const [travelDate, setTravelDate] = useState(getDateKey());
  const [attractions, setAttractions] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [weatherByView, setWeatherByView] = useState({
    attractions: null,
    food: null,
    hotels: null,
  });
  const [aiByView, setAiByView] = useState({
    attractions: null,
    food: null,
    hotels: null,
  });
  const [aiRequestKeys, setAiRequestKeys] = useState({
    attractions: '',
    food: '',
    hotels: '',
  });
  const [priceConversions, setPriceConversions] = useState({});
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
  const [activeTransportTab, setActiveTransportTab] = useState('flights');
  const [flightSearch, setFlightSearch] = useState({
    airlineName: '',
    fromCountryCode: '',
    fromCountryName: '',
    toCountryCode: '',
    toCountryName: '',
    departureDate: '',
  });
  const [flightResults, setFlightResults] = useState(null);
  const [nextHotelStart, setNextHotelStart] = useState(0);
  const [nextRestaurantStart, setNextRestaurantStart] = useState(0);
  const [hasMoreHotels, setHasMoreHotels] = useState(false);
  const [hasMoreRestaurants, setHasMoreRestaurants] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [weatherLoadingView, setWeatherLoadingView] = useState('');
  const [aiLoadingView, setAiLoadingView] = useState('');
  const [carouselIndexes, setCarouselIndexes] = useState({});
  const [lastSearchSummary, setLastSearchSummary] = useState({
    attractions: { loaded: 0, priced: 0, rated: 0, topRated: 0 },
    food: { loaded: 0, priced: 0, rated: 0, topRated: 0 },
    hotels: { loaded: 0, priced: 0, rated: 0, topRated: 0 },
  });

  const activeOption = useMemo(
    () => viewOptions.find((option) => option.id === activeView) || viewOptions[0],
    [activeView]
  );
  const ActiveIcon = activeOption.icon;
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

    return () => {
      isActive = false;
    };
  }, [activeItems, priceConversions, selectedCurrency, supportedCurrencyCodes]);

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
      setError('Enter a destination first.');
      return;
    }

    setIsSearching(true);
    setError('');
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
      await fetchDestinationWeather('attractions', getWeatherRequest({ destination: destination.trim() }, nextItems));
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
      setError(emptyMessage);
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
        await fetchDestinationWeather(viewId, getWeatherRequest(criteria, nextItems));
      }
    } catch (requestError) {
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
      setError('Enter an airline name or select at least one country.');
      return;
    }

    setIsSearching(true);
    setError('');
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
      setError(getErrorMessage(requestError));
      setFlightResults(null);
    } finally {
      setIsSearching(false);
    }
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

  const getCarouselIndex = (itemId, imageCount) => Math.min(carouselIndexes[itemId] || 0, Math.max(imageCount - 1, 0));

  const moveCarousel = (itemId, imageCount, direction) => {
    setCarouselIndexes((currentIndexes) => {
      const currentIndex = currentIndexes[itemId] || 0;
      const nextIndex = (currentIndex + direction + imageCount) % imageCount;

      return {
        ...currentIndexes,
        [itemId]: nextIndex,
      };
    });
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

      {isTransportationView ? (
        <div className="explore-workspace">
          <div className="explore-transport-toolbar">
            <div className="travel-guide-tabs explore-transport-tabs" role="tablist" aria-label="Transportation type">
              {transportationTabs.map((tab) => {
                const TabIcon = tab.icon;

                return (
                  <button
                    className={activeTransportTab === tab.id ? 'active' : ''}
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTransportTab === tab.id}
                    onClick={() => setActiveTransportTab(tab.id)}
                  >
                    <TabIcon size={15} aria-hidden="true" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {activeTransportTab === 'flights' && (
              <form className="explore-flight-search-panel" onSubmit={handleFlightSearch}>
                <label className="explore-flight-route-box">
                  <span>
                    From
                    <button
                      type="button"
                      aria-label="Clear from country"
                      onClick={(event) => {
                        event.preventDefault();
                        clearFlightCountry('from');
                      }}
                      disabled={!flightSearch.fromCountryCode}
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </span>
                  <select value={flightSearch.fromCountryCode} onChange={(event) => handleFlightCountryChange('from', event.target.value)}>
                    <option value="">Any origin</option>
                    {countryOptions.map((country) => (
                      <option key={country.isoCode} value={country.isoCode}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <small>Optional</small>
                </label>
                <div className="explore-flight-swap" aria-hidden="true">
                  <ArrowLeftRight size={19} />
                </div>
                <label className="explore-flight-route-box">
                  <span>
                    To
                    <button
                      type="button"
                      aria-label="Clear to country"
                      onClick={(event) => {
                        event.preventDefault();
                        clearFlightCountry('to');
                      }}
                      disabled={!flightSearch.toCountryCode}
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </span>
                  <select value={flightSearch.toCountryCode} onChange={(event) => handleFlightCountryChange('to', event.target.value)}>
                    <option value="">Any destination</option>
                    {countryOptions.map((country) => (
                      <option key={country.isoCode} value={country.isoCode}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <small>Optional</small>
                </label>
                <label className="explore-flight-route-box">
                  <span>
                    Departure
                    <button
                      type="button"
                      aria-label="Clear departure date"
                      onClick={(event) => {
                        event.preventDefault();
                        clearFlightSearchField('departureDate');
                      }}
                      disabled={!flightSearch.departureDate}
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </span>
                  <input
                    type="date"
                    value={flightSearch.departureDate}
                    min={getDateKey()}
                    onChange={(event) => handleFlightSearchChange('departureDate', event.target.value)}
                  />
                  <small>{flightSearch.departureDate ? 'Selected date' : 'Optional'}</small>
                </label>
                <label className="explore-flight-route-box">
                  <span>
                    Airline
                    <button
                      type="button"
                      aria-label="Clear airline"
                      onClick={(event) => {
                        event.preventDefault();
                        clearFlightSearchField('airlineName');
                      }}
                      disabled={!flightSearch.airlineName}
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </span>
                  <input
                    type="text"
                    value={flightSearch.airlineName}
                    onChange={(event) => handleFlightSearchChange('airlineName', event.target.value)}
                    placeholder="Any airline"
                  />
                  <small>Optional</small>
                </label>
                <button className="explore-flight-search-button" type="submit" disabled={isSearching}>
                  {isSearching ? <LoaderCircle className="explore-spin" size={20} aria-hidden="true" /> : <Search size={20} aria-hidden="true" />}
                  {isSearching ? 'Searching' : 'Search'}
                </button>
              </form>
            )}
          </div>

          {activeTransportTab === 'flights' ? (
            <>
              {error && <p className="form-error explore-status">{error}</p>}
              {status && <p className="form-success explore-status">{status}</p>}

              {flightResults?.available ? (
                <section className="explore-flight-results-layout">
                  <section className="explore-flight-results-board">
                    <div className="explore-flight-board-title">
                      <div>
                        <span>1. Departures</span>
                        <h3>{getFlightSearchTitle()}</h3>
                      </div>
                      <strong>{flightResults.items.length} flight{flightResults.items.length === 1 ? '' : 's'} found</strong>
                    </div>
                    <div className="explore-flight-list">
                      {flightResults.items.map((flight, index) => {
                        const departureLabel = getAirportLocationLabel(flight.departure.airport);
                        const arrivalLabel = getAirportLocationLabel(flight.arrival.airport);

                        return (
                          <article className="explore-flight-card" key={`${flight.id}-${index}`}>
                            <div className="explore-flight-airline">
                              <Plane size={30} aria-hidden="true" />
                              <div>
                                <strong>{flight.airline.name}</strong>
                                <span>{getFlightCodeLabel(flight)}</span>
                              </div>
                            </div>
                            <div className="explore-flight-time">
                              <strong>{formatFlightTime(flight.departure.scheduledTime || flight.departure.actualTime)}</strong>
                              <span>{departureLabel}</span>
                              <small>{getAirportDetailLabel(flight.departure.airport)}</small>
                            </div>
                            <div className="explore-flight-path">
                              <span>{formatFlightDuration(flight.durationMinutes)}</span>
                              <div />
                            </div>
                            <div className="explore-flight-time">
                              <strong>{formatFlightTime(flight.arrival.scheduledTime || flight.arrival.actualTime)}</strong>
                              <span>{arrivalLabel}</span>
                              <small>{getAirportDetailLabel(flight.arrival.airport)}</small>
                            </div>
                            <div className="explore-flight-action">
                              <div
                                className="explore-flight-price-badge"
                                tabIndex="0"
                                aria-label="AI estimated ticket price"
                              >
                                <DollarSign size={14} aria-hidden="true" />
                                <strong>{flight.priceEstimate?.display || 'AI estimate unavailable'}</strong>
                              </div>
                              <button type="button">View</button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                </section>
              ) : (
                <section className="explore-results-shell">
                  <div className="explore-empty explore-placeholder">
                    <Plane size={34} aria-hidden="true" />
                    <h3>{flightResults?.message || 'Search by route'}</h3>
                    <p>Enter an airline name, choose one or both countries, and optionally set a departure date.</p>
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="explore-empty explore-placeholder">
              <TrainFront size={34} aria-hidden="true" />
              <h3>Trains coming soon</h3>
              <p>Train schedules will be added to this transportation workspace later.</p>
            </div>
          )}
        </div>
      ) : isSearchView ? (
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
                onChange={(event) => updateDestinationQuery(event.target.value)}
                placeholder={isHotelsView ? 'Hotel, country or location' : isFoodView ? 'Restaurant, country or location' : 'Tokyo, Paris, Kuala Lumpur'}
              />
            </label>
            <label>
              <span className="sr-only">Travel date</span>
              <CalendarDays size={18} aria-hidden="true" />
              <input
                type="date"
                value={travelDate}
                min={getDateKey()}
                max={getMaxWeatherDate()}
                onChange={(event) => handleTravelDateChange(event.target.value)}
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

          <section className="explore-briefing" aria-label={`${activeOption.label} travel briefing`}>
            <div className="explore-stats-row" aria-label={`${activeOption.label} result summary`}>
              <article>
                <Search size={17} aria-hidden="true" />
                <div>
                  <strong>{resultCount || '--'}</strong>
                  <span>{isHotelsView ? 'Hotels loaded' : isFoodView ? 'Restaurants loaded' : 'Places loaded'}</span>
                </div>
              </article>
              <article>
                <Star size={17} aria-hidden="true" />
                <div>
                  <strong>{ratedCount || '--'}</strong>
                  <span>Rated results</span>
                </div>
              </article>
              <article>
                {isHotelsView ? (
                  <Building2 size={17} aria-hidden="true" />
                ) : isFoodView ? (
                  <Utensils size={17} aria-hidden="true" />
                ) : (
                  <Sparkles size={17} aria-hidden="true" />
                )}
                <div>
                  <strong>{isFilteredSearchView ? pricedCount || '--' : topRatedCount || '--'}</strong>
                  <span>{isFilteredSearchView ? 'With prices' : 'Highly rated'}</span>
                </div>
              </article>
            </div>

            <div className="explore-guidance-grid">
            <article className="explore-briefing-card explore-weather-summary">
              <div className="explore-briefing-title">
                <CloudSun size={17} aria-hidden="true" />
                <div>
                  <span>Destination weather</span>
                  <strong>{isWeatherLoading ? 'Checking forecast' : activeWeather?.available ? weatherLocationLabel : 'Ready after search'}</strong>
                </div>
              </div>
              {isWeatherLoading ? (
                <p className="explore-briefing-text">
                  <LoaderCircle className="explore-spin" size={15} aria-hidden="true" />
                  Checking {formatWeatherDate(travelDate || getDateKey())}
                </p>
              ) : activeWeather?.available ? (
                <>
                  <div className="explore-weather-line">
                    <strong>{formatTemperature(activeWeather.temperature?.mean)}</strong>
                    <span>{activeWeather.condition}</span>
                  </div>
                  <div className="explore-briefing-meta">
                    <span><Droplets size={14} aria-hidden="true" />{activeWeather.precipitation?.probability ?? '--'}% rain</span>
                    <span><Wind size={14} aria-hidden="true" />{activeWeather.windSpeed?.max ?? '--'} {activeWeather.windSpeed?.unit || 'km/h'}</span>
                  </div>
                  <p className="explore-briefing-text">{activeWeather.travelTip}</p>
                </>
              ) : (
                <p className="explore-briefing-text">{activeWeather?.message || 'Weather appears after a destination search.'}</p>
              )}
            </article>

            <article className="explore-briefing-card explore-briefing-ai">
              <div className="explore-briefing-title">
                <Sparkles size={17} aria-hidden="true" />
                <div>
                  <span>AI guide</span>
                  <strong>{activeAi?.available ? 'Recommended next moves' : 'Travel guidance'}</strong>
                </div>
                <button
                  className="explore-ai-action"
                  type="button"
                  onClick={() => handleGenerateAiRecommendations({ manual: true })}
                  disabled={!hasResults || isAiLoading}
                >
                  {isAiLoading ? <LoaderCircle className="explore-spin" size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
                  {isAiLoading ? 'Preparing' : activeAi?.available ? 'Refresh' : activeAi ? 'Retry' : 'Prepare'}
                </button>
              </div>
              {isAiLoading ? (
                <p className="explore-briefing-text">Reviewing ratings, prices, hours, and weather.</p>
              ) : activeAi?.available ? (
                <>
                  <p className="explore-briefing-main">{activeAi.summary}</p>
                  {activeAi.picks?.length > 0 && (
                    <details className="explore-ai-details">
                      <summary>{activeAi.picks.length} recommended pick{activeAi.picks.length === 1 ? '' : 's'}</summary>
                      <div className="explore-ai-picks">
                        {activeAi.picks.map((pick) => (
                          <article key={`${pick.itemName}-${pick.score}`}>
                            <div>
                              <strong>{pick.itemName}</strong>
                              <span>{pick.score}/100</span>
                            </div>
                            <p>{pick.reason}</p>
                            <small>{pick.bestFor}{pick.caution ? ` - ${pick.caution}` : ''}</small>
                          </article>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              ) : (
                <p className="explore-briefing-text">
                  {activeAi?.message || 'Loads after results are ready.'}
                </p>
              )}
            </article>
            </div>
          </section>

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
                <PlaceCard
                  carouselIndex={getCarouselIndex(item.id || item.name, item.imageUrls?.length || (item.imageUrl ? 1 : 0))}
                  categoryLabel={
                    isHotelsView && hotelFilters.roomType
                      ? selectedRoomLabel
                      : isFoodView && restaurantFilters.foodCategory
                        ? selectedFoodCategoryLabel
                        : item.category
                  }
                  convertedPriceText={getConvertedPriceText(item)}
                  index={index}
                  item={item}
                  key={`${item.id}-${index}`}
                  onMoveCarousel={moveCarousel}
                  originalPriceText={getOriginalPriceText(item)}
                  type={isHotelsView ? 'hotels' : isFoodView ? 'food' : 'attractions'}
                />
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

