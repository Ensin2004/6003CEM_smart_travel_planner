/**
 * Trips module.
 * Page state, event handlers, and render sections define the screen experience.
 * 
 * This component manages the complete trip details interface including itinerary
 * display, day management, place search, AI assistance, budget tracking,
 * weather integration, and map visualization.
 */
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Country, State } from 'country-state-city';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  AlertTriangle,
  BedDouble,
  Bike,
  Building2,
  CalendarDays,
  Car,
  ChevronDown,
  Clock3,
  CloudSun,
  DollarSign,
  Droplets,
  Footprints,
  Image,
  Info,
  Landmark,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Route,
  Search,
  Settings,
  Sparkles,
  Star,
  StickyNote,
  Sun,
  TrainFront,
  Trash2,
  Umbrella,
  Utensils,
  WalletCards,
  Wind,
  X,
} from 'lucide-react';
import {
  createItineraryItem,
  deleteItineraryItem,
  getTripItinerary,
  updateItineraryDay,
  updateItineraryItem,
} from '../../api/itineraryApi';
import { getTripAiRecommendations, getWeatherPlaceRanking } from '../../api/aiAssistantApi';
import { searchAttractions, searchHotels, searchRestaurants, searchWeather } from '../../api/exploreApi';
import { getTripSummary, updateTrip } from '../../api/tripApi';
import {
  getPackingLists,
  getTravelDocuments,
} from '../../api/travelToolsApi';
import {
  getGeocodeLocation,
  getMapPlaceDetails,
  getRouteBetweenPlaces,
  searchMapCategoryPlaces,
  searchOpenStreetMapCategoryPlaces,
  searchOpenStreetMapPlaces,
} from '../../api/mapApi';
import { getVisitedPlaces } from '../../api/visitedPlaceApi';
import TripMapPreview from '../../components/trips/TripMapPreview';
import { getTripMapPoint } from '../../components/trips/tripMapUtils';
import TripAiAssistantPanel from './components/TripAiAssistantPanel';
import VisitedPlaceControl from '../../components/visitedPlaces/VisitedPlaceControl';
import { buildVisitedLookup, getVisitedPlacePayload } from '../../components/visitedPlaces/visitedPlaceUtils';
import CurrencyContext from '../../context/currencyContext';
import { getPlaceImageSrc } from '../../utils/placeImageProxy';
import './TripDetailsPage.css';

/**
 * Idea categories configuration with icons and display labels
 * Defines the available place types for search and filtering
 */
const ideaCategories = [
  { id: 'attractions', label: 'Attractions', icon: Landmark },
  { id: 'food', label: 'Food', icon: Utensils },
  { id: 'hotels', label: 'Hotels', icon: BedDouble },
  { id: 'train', label: 'Transport', icon: TrainFront },
  { id: 'shopping', label: 'Shopping', icon: Lightbulb },
];

/**
 * Route modes for transportation options between places
 * Each mode includes an icon and display label
 */
const routeModes = [
  { id: 'car', label: 'Car', icon: Car },
  { id: 'walking', label: 'Walk', icon: Footprints },
  { id: 'bike', label: 'Bike', icon: Bike },
];

const routeModeSpeedsKph = {
  walking: 5,
  car: 45,
  bike: 16,
  train: 80,
  plane: 700,
};
const tripPanelMinWidth = 320;
const tripPanelMaxWidth = 560;
const formatRouteDuration = (seconds) => {
  if (!Number.isFinite(Number(seconds))) return '--';
  const minutes = Math.max(1, Math.round(Number(seconds) / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} hr${hours === 1 ? '' : 's'}${remainingMinutes ? ` ${remainingMinutes} min` : ''}`;
};

/**
 * Formats route distance from meters to human-readable string
 * Converts to kilometers for distances over 1000 meters
 */
const formatRouteDistance = (meters) => {
  if (!Number.isFinite(Number(meters))) return '--';
  return Number(meters) < 1000
    ? `${Math.round(Number(meters))} m`
    : `${(Number(meters) / 1000).toFixed(1)} km`;
};

/**
 * Maps weather guidance modes to corresponding icon components
 * Provides visual representation for different weather conditions
 */
const weatherModeIcons = {
  rainy: Umbrella,
  sunny: Sun,
  cold: Building2,
  comfortable: CloudSun,
  default: CloudSun,
};

/**
 * Set of empty location label variants for detection
 * Used to identify when a day location has not been properly set
 */
const emptyLocationLabels = new Set([
  'not added yet',
  'set a day location',
  'set day location',
  'day location',
  'current location',
]);

/**
 * Extracts editable location name from a location object
 * Returns empty string for placeholder values that should not be displayed
 */
const getEditableLocationName = (value) => {
  const locationName = String(value || '').trim();
  return emptyLocationLabels.has(locationName.toLowerCase()) ? '' : locationName;
};

/**
 * Itinerary groups configuration defining the four main categories
 * Each group includes title, description, add label, category ID, types, and icon
 */
const itineraryGroups = [
  { id: 'food', title: 'Food & dining', description: 'Restaurants, cafes, and local food', addLabel: 'Food', categoryId: 'food', types: ['restaurant'], icon: Utensils },
  { id: 'see', title: 'Attractions & activities', description: 'Places to visit and things to do', addLabel: 'Attractions', categoryId: 'attractions', types: ['attraction', 'custom'], icon: Landmark },
  { id: 'stay', title: 'Accommodation', description: 'Hotels and places to stay', addLabel: 'Stay', categoryId: 'hotels', types: ['hotel'], icon: BedDouble },
  { id: 'move', title: 'Transportation', description: 'Stations, airports, and travel connections', addLabel: 'Transportation', categoryId: 'train', types: ['transport', 'flight'], icon: TrainFront },
];

/**
 * Search terms mapping for each category
 * Used when searching for places via text-based queries
 */
const categoryTextSearchTerms = {
  food: ['restaurants', 'cafes', 'food courts'],
  attractions: ['attractions', 'things to do', 'museums', 'landmarks', 'parks'],
  hotels: ['hotels', 'places to stay', 'resorts', 'hostels', 'guest houses'],
  train: ['train stations', 'railway stations', 'bus stations', 'transport hubs', 'airports'],
  shopping: ['shopping malls', 'shopping centres', 'markets', 'local shops'],
};

const weatherIdeaProfiles = {
  rainy: {
    label: 'Rain-friendly',
    reason: 'AI-ranked for wet weather',
  },
  sunny: {
    label: 'Sunny-day',
    reason: 'AI-ranked for sunny weather',
  },
  cold: {
    label: 'Cold-weather',
    reason: 'AI-ranked for cold weather',
  },
  comfortable: {
    label: 'Comfortable-weather',
    reason: 'AI-ranked for today weather',
  },
};

/**
 * Extracts address from a place object with fallback
 * Returns a user-friendly address string
 */
const getPlaceAddress = (place) => place.address || place.displayName || 'Location details unavailable';
const toImageList = (value) => (Array.isArray(value) ? value : value ? [value] : []);
const getPlaceImageCandidates = (place = {}) => [
  place.imageUrl,
  ...toImageList(place.imageUrls),
  place.thumbnail,
  place.photoUrl,
  place.photo,
  place.location?.imageUrl,
  ...toImageList(place.location?.imageUrls),
].filter(Boolean);
const getUniquePlaces = (places = []) => {
  const uniquePlaces = new Map();

  places.forEach((place) => {
    const key = place.id || `${place.name}-${place.displayName || place.address}`;
    if (key && !uniquePlaces.has(key)) uniquePlaces.set(key, place);
  });

  return [...uniquePlaces.values()];
};

const getWeatherCandidateId = (place = {}, category = '', index = 0) =>
  String(place.id || place.placeId || place.externalId || `${category}-${place.name || place.title}-${place.address || place.displayName || index}`)
    .trim()
    .slice(0, 160);

const toWeatherCandidate = (place = {}, category = '', index = 0) => ({
  id: getWeatherCandidateId(place, category, index),
  name: String(place.name || place.title || place.displayName || 'Unnamed place').trim().slice(0, 180),
  category: String(place.categoryId || place.category || category || '').trim().slice(0, 60),
  address: String(place.address || place.displayName || '').trim().slice(0, 240),
  summary: String(place.summary || place.description || place.type || '').trim().slice(0, 320),
  rating: Number(place.rating) || undefined,
  price: String(place.price || place.priceDetail?.display || '').trim().slice(0, 80),
  hours: String(place.hours || place.hoursSummary || place.openState || '').trim().slice(0, 120),
});

const getWeatherIdeaProfile = (weatherGuidance, isEnabled) => {
  if (!isEnabled || !weatherGuidance?.available) return null;
  return weatherIdeaProfiles[weatherGuidance.mode] || weatherIdeaProfiles.comfortable;
};

const applyWeatherRanking = (places, category, profile) => {
  if (!profile) return places;

  return [...places]
    .map((place) => ({
      ...place,
      weatherScore: Number(place.rating || 0) || 0,
      weatherReason: profile.reason,
      weatherProfileLabel: profile.label,
    }))
    .sort((firstPlace, secondPlace) =>
      Number(secondPlace.weatherScore || 0) - Number(firstPlace.weatherScore || 0)
      || Number(secondPlace.rating || 0) - Number(firstPlace.rating || 0)
    );
};

/**
 * Format Idea Place converts raw values into readable display text.
 * Normalizes place data structure for consistent rendering across the application
 */
const formatIdeaPlace = (place, categoryId) => ({
  ...place,
  lat: Number(place.lat ?? place.coordinates?.latitude),
  lng: Number(place.lng ?? place.coordinates?.longitude),
  categoryId,
  address: getPlaceAddress(place),
  imageUrl: getPlaceImageCandidates(place)[0] || '',
  imageUrls: getPlaceImageCandidates(place),
  hours: place.hours || place.hoursSummary || place.openState || 'Hours unavailable',
  rating: place.rating || 'N/A',
  reviews: place.reviews || place.reviewCount || '',
  price: place.price || place.priceDetail?.display || 'Price unavailable',
  openState: place.openState || '',
  summary: place.summary || place.category || 'Place result from map data.',
  type: 'idea',
});

const unavailablePricePattern = /unavailable|unknown|not available|n\/a/i;

const getPlacePriceSuggestionText = (place = {}) => {
  const text = place.priceDetail?.display || place.price || place.priceEstimate?.suggestionText || '';
  if (!text || unavailablePricePattern.test(String(text))) return '';
  return String(text).trim().slice(0, 160);
};

const getPlacePriceSuggestionAmount = (place = {}) => {
  const directAmount = Number(place.priceDetail?.amount ?? place.priceEstimate?.amount);
  if (Number.isFinite(directAmount) && directAmount >= 0) return directAmount;

  const suggestionText = getPlacePriceSuggestionText(place);
  if (!suggestionText) return null;
  if (/\bfree\b/i.test(suggestionText)) return 0;

  const amounts = [...suggestionText.replace(/,/g, '').matchAll(/\d+(?:\.\d+)?/g)]
    .map((match) => Number(match[0]))
    .filter((amount) => Number.isFinite(amount));

  if (!amounts.length) return null;
  return Math.round(Math.min(...amounts) * 100) / 100;
};

const buildPlacePriceEstimate = (place = {}, currencyCode = 'MYR') => {
  const suggestionText = getPlacePriceSuggestionText(place);
  const suggestionAmount = getPlacePriceSuggestionAmount(place);

  return {
    amount: Number.isFinite(suggestionAmount) ? suggestionAmount : 0,
    currency: currencyCode,
    source: suggestionText ? 'api' : 'manual',
    suggestionText,
  };
};

const getEditableMoneyValue = (value) => (value ?? '') === '' ? '' : value;
const getSavedMoneyValue = (value) => Number(value) || 0;

const getPriceEstimateLabel = (priceEstimate = {}) => {
  if (priceEstimate.source === 'api') return 'Imported suggestion. Edit the amount you want to budget.';
  if (priceEstimate.source === 'ai') return 'AI suggestion. Edit the amount you want to budget.';
  return 'Used in day and trip budget totals.';
};

const approximateUsdRates = {
  USD: 1,
  MYR: 4.7,
  SGD: 1.35,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 157,
  THB: 36,
  IDR: 16200,
  VND: 25400,
};

const formatEstimatedMoney = (amount, currencyCode) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  }).format(amount);

const convertApproximateAmount = (amount, sourceCurrency = 'USD', targetCurrency = 'USD') => {
  const sourceRate = approximateUsdRates[sourceCurrency] || approximateUsdRates.USD;
  const targetRate = approximateUsdRates[targetCurrency] || approximateUsdRates.USD;
  return (Number(amount) / sourceRate) * targetRate;
};

const getEstimatedPriceRange = ({ type = '', category = '', currencyCode = 'USD' }) => {
  const normalizedType = String(type || '').toLowerCase();
  const normalizedCategory = String(category || '').toLowerCase();
  let usdRange = [];

  if (normalizedType === 'hotel') {
    if (normalizedCategory.includes('luxury') || normalizedCategory.includes('suite')) usdRange = [75, 140];
    else if (normalizedCategory.includes('budget') || normalizedCategory.includes('hostel')) usdRange = [18, 40];
    else usdRange = [35, 70];
  } else if (normalizedType === 'restaurant') {
    if (normalizedCategory.includes('fine') || normalizedCategory.includes('steak')) usdRange = [14, 35];
    else if (normalizedCategory.includes('cafe') || normalizedCategory.includes('dessert')) usdRange = [3, 8];
    else usdRange = [4, 12];
  } else if (normalizedType === 'attraction' || normalizedType === 'custom') {
    usdRange = [0, 20];
  }

  if (!usdRange.length) return '';
  const convertedRange = usdRange.map((amount) => convertApproximateAmount(amount, 'USD', currencyCode));
  return `${formatEstimatedMoney(convertedRange[0], currencyCode)} - ${formatEstimatedMoney(convertedRange[1], currencyCode)}`;
};

const getDescriptionLineValue = (description = '', label = '') => {
  const line = String(description || '')
    .split('\n')
    .find((part) => part.trim().toLowerCase().startsWith(`${label.toLowerCase()}:`));

  return line ? line.split(':').slice(1).join(':').trim() : '';
};

const getPlaceHoursText = (place = {}) =>
  place.openState
  || place.hours
  || place.hoursSummary
  || getDescriptionLineValue(place.description, 'Hours')
  || 'Hours unavailable';

const getOpeningStatusTone = (hoursText = '') => {
  const normalizedHours = String(hoursText || '').toLowerCase();
  if (normalizedHours.includes('closed')) return 'closed';
  if (normalizedHours.includes('open')) return 'open';
  return 'unknown';
};

const getPlacePriceText = (place = {}, currencyCode = 'MYR', formatter) => {
  if (place.price) return place.price;
  if (place.priceDetail?.display) return place.priceDetail.display;
  if (Number(place.priceEstimate?.amount) > 0) {
    return formatter
      ? formatter(Number(place.priceEstimate.amount), place.priceEstimate.currency || currencyCode)
      : `${place.priceEstimate.currency || currencyCode} ${place.priceEstimate.amount}`;
  }
  return 'Price unavailable';
};

const getItineraryItemFacts = (item = {}, selectedCurrency = 'USD', formatter) => {
  const sourceCurrency = item.priceEstimate?.currency || selectedCurrency;
  const amount = Number(item.priceEstimate?.amount || 0);
  const estimateCategory = [
    item.category,
    getDescriptionLineValue(item.description, 'Category'),
    item.type,
    item.title,
  ].filter(Boolean).join(' ');
  const sourceEstimate = getEstimatedPriceRange({
    type: item.type,
    category: estimateCategory,
    currencyCode: sourceCurrency,
  });
  const convertedEstimate = getEstimatedPriceRange({
    type: item.type,
    category: estimateCategory,
    currencyCode: selectedCurrency,
  });
  const convertedAmount = amount > 0
    ? convertApproximateAmount(amount, sourceCurrency, selectedCurrency)
    : 0;
  const rating = Number(item.rating || getDescriptionLineValue(item.description, 'Rating'));
  const reviews = item.reviews || item.reviewCount || getDescriptionLineValue(item.description, 'Reviews');

  return {
    convertedPrice: amount > 0
      ? formatEstimatedMoney(convertedAmount, selectedCurrency)
      : convertedEstimate || '-',
    hours: getPlaceHoursText(item),
    originalPrice: item.priceEstimate?.suggestionText
      || (amount > 0
        ? (formatter ? formatter(amount, sourceCurrency) : formatEstimatedMoney(amount, sourceCurrency))
        : sourceEstimate || '-'),
    priceTone: amount > 0 ? 'Saved estimate' : 'AI estimate',
    rating: Number.isFinite(rating) && rating > 0 ? `${rating.toFixed(1)} stars` : 'Rating unavailable',
    reviews: reviews ? `${Number(reviews) ? Number(reviews).toLocaleString() : reviews} reviews` : '',
    time: [item.startTime, item.endTime].filter(Boolean).join(' - ') || 'Flexible',
  };
};

const enrichIdeaPlacesWithDetails = async (ideas = []) => {
  const results = await Promise.allSettled(ideas.map(async (idea) => {
    try {
      const details = await getMapPlaceDetails(idea);
      if (!details?.item) return idea;

      return formatIdeaPlace({
        ...idea,
        ...details.item,
        name: details.item.name || idea.name,
        address: details.item.address || idea.address,
        summary: details.item.summary || idea.summary,
      }, idea.categoryId);
    } catch {
      return idea;
    }
  }));

  return results.map((result, index) => (result.status === 'fulfilled' ? result.value : ideas[index]));
};
const getItineraryItemLookupPlace = (item) => {
  const point = getItemPoint(item);
  return formatIdeaPlace({
    ...item,
    id: item.externalId || item._id,
    name: item.title,
    address: item.location?.address,
    lat: point.lat,
    lng: point.lng,
  }, getMapCategoryForItemType(item.type));
};
// Format Date converts raw values into readable display text.
const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : 'No date');

/**
 * Format Input Date converts raw values into readable display text.
 * Formats dates as ISO date strings for input fields
 */
const formatInputDate = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '');

/**
 * Filters itinerary items that belong to a specific day
 * Matches by comparing scheduled dates
 */
const getItemsForDay = (items, day) =>
  items.filter((item) => formatInputDate(item.scheduledDate) === formatInputDate(day.date));

/**
 * Maps category to item type for itinerary
 * Returns the appropriate type string based on category
 */
const getIdeaItemType = (category) => {
  if (category === 'food') return 'restaurant';
  if (category === 'hotels') return 'hotel';
  return 'attraction';
};

/**
 * Parses time string (HH:MM) to minutes since midnight
 * Returns null for invalid formats
 */
const parseTimeToMinutes = (time) => {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const formatMinutesAsTime = (minutes) => {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  const hour = Math.floor(safeMinutes / 60) % 24;
  const minute = safeMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const getItemStartMinutes = (item) => parseTimeToMinutes(item?.startTime);
const getItemEndMinutes = (item) => parseTimeToMinutes(item?.endTime);
const hasLockedTime = (item) => getItemStartMinutes(item) !== null;
const defaultFlexibleDayStartMinutes = 9 * 60;
const defaultFlexibleVisitMinutes = 60;

const getPointDistanceMeters = (firstPoint, secondPoint) => {
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const earthRadiusMeters = 6371000;
  const firstLat = toRadians(Number(firstPoint?.lat));
  const secondLat = toRadians(Number(secondPoint?.lat));
  const latDifference = toRadians(Number(secondPoint?.lat) - Number(firstPoint?.lat));
  const lngDifference = toRadians(Number(secondPoint?.lng) - Number(firstPoint?.lng));
  const haversineValue = Math.sin(latDifference / 2) ** 2
    + Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(lngDifference / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));
};

const getPathDistanceMeters = (points = []) => points.slice(1).reduce(
  (total, point, index) => total + getPointDistanceMeters(points[index], point),
  0
);

const getEstimatedTravelMinutes = (firstPoint, secondPoint, mode = 'car') => {
  const speedKph = routeModeSpeedsKph[mode] || routeModeSpeedsKph.car;
  const distanceMeters = getPointDistanceMeters(firstPoint, secondPoint);
  return Math.ceil(distanceMeters / ((speedKph * 1000) / 60));
};

const sortItemsBySchedule = (items = []) => [...items].sort((firstItem, secondItem) => {
  const firstStart = getItemStartMinutes(firstItem);
  const secondStart = getItemStartMinutes(secondItem);

  if (firstStart !== null || secondStart !== null) {
    return (firstStart ?? Number.POSITIVE_INFINITY) - (secondStart ?? Number.POSITIVE_INFINITY)
      || (getItemEndMinutes(firstItem) ?? Number.POSITIVE_INFINITY) - (getItemEndMinutes(secondItem) ?? Number.POSITIVE_INFINITY);
  }

  return new Date(firstItem.createdAt || 0) - new Date(secondItem.createdAt || 0);
});

const getScheduleIssues = (items = []) => {
  const timedItems = sortItemsBySchedule(items).filter((item) => getItemStartMinutes(item) !== null);
  const issues = [];

  timedItems.forEach((item, index) => {
    const start = getItemStartMinutes(item);
    const end = getItemEndMinutes(item);

    if (end !== null && end <= start) {
      issues.push({
        type: 'invalid-time',
        itemId: item._id,
        message: `${item.title}: end time should be later than start time.`,
      });
    }

    timedItems.slice(index + 1).forEach((nextItem) => {
      const nextStart = getItemStartMinutes(nextItem);
      const nextEnd = getItemEndMinutes(nextItem);
      const itemEnd = end ?? start;
      const nextEffectiveEnd = nextEnd ?? nextStart;
      const hasDuration = end !== null || nextEnd !== null;
      const overlaps = hasDuration
        ? start < nextEffectiveEnd && nextStart < itemEnd
        : start === nextStart;

      if (!overlaps) return;

      issues.push({
        type: start === nextStart ? 'duplicate-time' : 'overlap',
        itemId: nextItem._id,
        relatedItemId: item._id,
        message: start === nextStart
          ? `${item.title} and ${nextItem.title} are both scheduled at ${item.startTime}. Choose different times or mark one as flexible.`
          : `${item.title} overlaps with ${nextItem.title}. Adjust one time range.`,
      });
    });
  });

  return issues;
};

const getBestInsertionIndex = (routePoints, flexiblePoint) => {
  if (!routePoints.length) return 0;

  let bestIndex = routePoints.length;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index <= routePoints.length; index += 1) {
    const nextPoints = [
      ...routePoints.slice(0, index),
      flexiblePoint,
      ...routePoints.slice(index),
    ];
    const distance = getPathDistanceMeters(nextPoints);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
};

const getScheduleAwareRoutePoints = (points = []) => {
  const timedPoints = [...points]
    .filter(hasLockedTime)
    .sort((firstPoint, secondPoint) => getItemStartMinutes(firstPoint) - getItemStartMinutes(secondPoint));
  const flexiblePoints = points.filter((point) => !hasLockedTime(point));

  if (!timedPoints.length) {
    return {
      points,
      preserveOrder: false,
      message: 'No fixed times found, so the route was optimized for shortest travel path.',
    };
  }

  const orderedPoints = [...timedPoints];
  flexiblePoints.forEach((point) => {
    const insertAt = getBestInsertionIndex(orderedPoints, point);
    orderedPoints.splice(insertAt, 0, point);
  });

  return {
    points: orderedPoints,
    preserveOrder: true,
    message: flexiblePoints.length
      ? 'Timed places are locked in chronological order. Flexible places were inserted where they best fit the route.'
      : 'Timed places are locked in chronological order.',
  };
};

const getTravelTimeIssues = (routePoints = [], mode = 'car') => {
  const issues = [];

  routePoints.slice(1).forEach((point, index) => {
    const previous = routePoints[index];
    const previousEnd = getItemEndMinutes(previous);
    const nextStart = getItemStartMinutes(point);

    if (previousEnd === null || nextStart === null) return;

    const travelMinutes = getEstimatedTravelMinutes(previous, point, mode);
    const arrivalMinutes = previousEnd + travelMinutes;

    if (arrivalMinutes > nextStart) {
      issues.push({
        type: 'travel-conflict',
        itemId: point.itineraryItemId || point.id,
        relatedItemId: previous.itineraryItemId || previous.id,
        message: `Conflict: ${previous.title || previous.name} ends at ${previous.endTime}, but travel to ${point.title || point.name} takes about ${travelMinutes} min. Earliest realistic time: ${formatMinutesAsTime(arrivalMinutes)}.`,
      });
    }
  });

  return issues;
};

/**
 * Parses hour text with AM/PM to minutes since midnight
 * Handles various time format inputs
 */
const parseHourTextToMinutes = (value) => {
  const match = String(value || '').match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  return hour * 60 + minute;
};

/**
 * Extracts opening and closing times from hours text
 * Returns object with open and close minutes or null
 */
const getOpeningWindow = (hoursText) => {
  const text = String(hoursText || '');
  const rangeMatch = text.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i);
  const closesMatch = text.match(/closes\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i);

  if (rangeMatch) {
    return {
      open: parseHourTextToMinutes(rangeMatch[1]),
      close: parseHourTextToMinutes(rangeMatch[2]),
    };
  }

  if (closesMatch && /open/i.test(text)) {
    return {
      open: null,
      close: parseHourTextToMinutes(closesMatch[1]),
      closeOnly: true,
    };
  }

  return null;
};

const getSuggestedVisitWindow = ({
  hoursText,
  durationMinutes = defaultFlexibleVisitMinutes,
  earliestMinutes = defaultFlexibleDayStartMinutes,
  latestMinutes = null,
}) => {
  if (/closed/i.test(String(hoursText || ''))) return null;

  const openingWindow = getOpeningWindow(hoursText);
  let suggestedStart = Number(earliestMinutes) || defaultFlexibleDayStartMinutes;
  const visitDuration = Math.max(15, Number(durationMinutes) || defaultFlexibleVisitMinutes);

  if (openingWindow?.open !== null && openingWindow?.open !== undefined) {
    suggestedStart = Math.max(suggestedStart, openingWindow.open);
  }

  if (Number.isFinite(Number(latestMinutes))) {
    suggestedStart = Math.min(suggestedStart, Number(latestMinutes) - visitDuration);
  }

  if (openingWindow?.close !== null && openingWindow?.close !== undefined) {
    suggestedStart = Math.min(suggestedStart, openingWindow.close - visitDuration);
  }

  if (openingWindow?.open !== null && openingWindow?.open !== undefined) {
    suggestedStart = Math.max(suggestedStart, openingWindow.open);
  }

  suggestedStart = Math.max(0, Math.round(suggestedStart));
  const suggestedEnd = suggestedStart + visitDuration;

  if (openingWindow?.close !== null && openingWindow?.close !== undefined && suggestedEnd > openingWindow.close) {
    return null;
  }

  if (Number.isFinite(Number(latestMinutes)) && suggestedEnd > Number(latestMinutes)) {
    return null;
  }

  return {
    startTime: formatMinutesAsTime(suggestedStart),
    endTime: formatMinutesAsTime(suggestedEnd),
    startMinutes: suggestedStart,
    endMinutes: suggestedEnd,
  };
};

const annotateFlexibleRouteSchedule = (routePoints = [], mode = 'car') => {
  let timelineMinutes = defaultFlexibleDayStartMinutes;

  return routePoints.map((point, index) => {
    const start = getItemStartMinutes(point);
    const end = getItemEndMinutes(point);

    if (index > 0) {
      timelineMinutes += getEstimatedTravelMinutes(routePoints[index - 1], point, mode);
    }

    if (start !== null) {
      timelineMinutes = end ?? start + defaultFlexibleVisitMinutes;
      return { ...point, scheduleKind: 'locked' };
    }

    const nextLockedIndex = routePoints.findIndex((candidate, candidateIndex) =>
      candidateIndex > index && getItemStartMinutes(candidate) !== null
    );
    const nextLockedPoint = nextLockedIndex >= 0 ? routePoints[nextLockedIndex] : null;
    const latestMinutes = nextLockedPoint
      ? getItemStartMinutes(nextLockedPoint) - getEstimatedTravelMinutes(point, nextLockedPoint, mode)
      : null;
    const suggestedWindow = getSuggestedVisitWindow({
      hoursText: point.hours || point.summary || '',
      earliestMinutes: timelineMinutes,
      latestMinutes,
    });

    if (!suggestedWindow) {
      return { ...point, scheduleKind: 'flexible' };
    }

    timelineMinutes = suggestedWindow.endMinutes;

    return {
      ...point,
      scheduleKind: 'suggested',
      suggestedStartTime: suggestedWindow.startTime,
      suggestedEndTime: suggestedWindow.endTime,
    };
  });
};

/**
 * Generates opening hours warning message for a place
 * Checks if selected time falls within opening hours
 */
const getOpeningWarning = ({ hoursText, startTime, endTime }) => {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (start === null || end === null) return '';
  if (end <= start) return 'End time should be later than start time.';
  if (/closed/i.test(String(hoursText || ''))) return 'This place may be closed at your selected time.';

  const openingWindow = getOpeningWindow(hoursText);
  if (!openingWindow || openingWindow.close === null) {
    return hoursText ? '' : 'Opening hours unavailable. Please confirm before adding.';
  }

  if (openingWindow.closeOnly) {
    if (end > openingWindow.close) {
      const suggestedWindow = getSuggestedVisitWindow({ hoursText, durationMinutes: end - start });
      return `This place may be closed at your selected time. Listed closing time: ${formatMinutesAsTime(openingWindow.close)}.${suggestedWindow ? ` Suggested visit: ${suggestedWindow.startTime} - ${suggestedWindow.endTime}.` : ''}`;
    }

    return `Opening time is not listed. This place only says it closes at ${formatMinutesAsTime(openingWindow.close)}, so please confirm the selected time.`;
  }

  if (openingWindow.open === null) {
    return 'Opening hours unavailable. Please confirm the selected time.';
  }

  if (start < openingWindow.open || end > openingWindow.close) {
    const suggestedWindow = getSuggestedVisitWindow({ hoursText, durationMinutes: end - start });
    return `This place may be closed at your selected time. Listed opening hours: ${formatMinutesAsTime(openingWindow.open)} - ${formatMinutesAsTime(openingWindow.close)}.${suggestedWindow ? ` Suggested visit: ${suggestedWindow.startTime} - ${suggestedWindow.endTime}.` : ''}`;
  }

  return '';
};

/**
 * Generates OpenStreetMap tile URL for a given latitude and longitude
 * Used for map thumbnail previews
 */
const getOpenStreetMapTileUrl = (lat, lng, zoom = 15) => {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '';

  const tileCount = 2 ** zoom;
  const x = Math.floor(((longitude + 180) / 360) * tileCount);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((latitude * Math.PI) / 180) + 1 / Math.cos((latitude * Math.PI) / 180)) / Math.PI) / 2) * tileCount
  );

  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
};
const getTripPlaceImageSrc = (place = {}, fallbackCoordinates = null, zoom = 15) => {
  const imageUrl = getPlaceImageCandidates(place)[0];
  if (imageUrl) return getPlaceImageSrc(imageUrl);

  const latitude = Number(fallbackCoordinates?.lat ?? place.lat ?? place.coordinates?.latitude);
  const longitude = Number(fallbackCoordinates?.lng ?? place.lng ?? place.coordinates?.longitude);
  return getOpenStreetMapTileUrl(latitude, longitude, zoom);
};
const getItemPoint = (item) => ({
  lat: item.location?.coordinates?.coordinates?.[1],
  lng: item.location?.coordinates?.coordinates?.[0],
});

/**
 * Builds recommendation location string from trip and day data
 * Returns a formatted location query string
 */
const getRecommendationLocation = (trip, day) => {
  const dayLocationName = getEditableLocationName(day?.location?.name);
  if (dayLocationName) {
    return [dayLocationName, day.location.country].filter(Boolean).join(', ');
  }

  const primaryDestination = trip?.destinationSegments?.[0];
  return [
    getEditableLocationName(primaryDestination?.city || trip?.destination),
    primaryDestination?.country || trip?.country,
  ].filter(Boolean).join(', ');
};

/**
 * Builds location query string for day-based searches
 * Handles country detection and fallback to trip destination
 */
const getDayLocationQuery = (day, trip) => {
  const locationName = getEditableLocationName(day?.location?.name);
  const isCountryName = Country.getAllCountries().some((country) => country.name.toLowerCase() === locationName.toLowerCase());
  const dayLocation = isCountryName
    ? locationName
    : [locationName, day?.location?.country].filter(Boolean).join(', ');
  if (dayLocation) return dayLocation;

  return getRecommendationLocation(trip, day);
};

/**
 * Extracts center coordinates from a day location
 * Returns [latitude, longitude] array or null
 */
const getDayLocationCenter = (day) => {
  const latitude = Number(day?.location?.coordinates?.latitude);
  const longitude = Number(day?.location?.coordinates?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : null;
};

/**
 * Gets browser's current location using Geolocation API
 * Returns Promise with [latitude, longitude] or null
 */
const getBrowserCurrentLocationCenter = () => new Promise((resolve) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    resolve(null);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => resolve([position.coords.latitude, position.coords.longitude]),
    () => resolve(null),
    { enableHighAccuracy: false, maximumAge: 300000, timeout: 6500 }
  );
});

/**
 * Searches category places by text using OpenStreetMap
 * Executes multiple queries and deduplicates results
 */
const searchCategoryPlacesByText = async (category, locationQuery, options = {}) => {
  const searchTerms = options.searchTerms || categoryTextSearchTerms[category] || [category];
  const trimmedLocation = String(locationQuery || '').trim();

  if (!trimmedLocation) return [];

  const queries = searchTerms.flatMap((term) => [
    `${term} in ${trimmedLocation}`,
    `${term} near ${trimmedLocation}`,
  ]);
  const results = [];

  for (const query of queries) {
    try {
      const places = await searchOpenStreetMapPlaces(query, {
        limit: options.limitPerTerm || 4,
        signal: options.signal,
      });
      results.push(...places);
      if (getUniquePlaces(results).length >= (options.limit || 12)) break;
    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') throw error;
    }
  }

  return getUniquePlaces(results).slice(0, options.limit || 12);
};

/**
 * Maps item type to map search category
 * Returns the appropriate category ID for map searches
 */
const getMapCategoryForItemType = (type) => {
  if (type === 'restaurant') return 'food';
  if (type === 'hotel') return 'hotels';
  if (type === 'transport' || type === 'flight') return 'train';
  return 'attractions';
};

/**
 * Searches category places using provider APIs with center coordinates
 * Returns formatted place results from map services
 */
const searchProviderCategoryPlaces = async (category, center, locationQuery, options = {}) => {
  if (!center) return [];

  const result = await searchMapCategoryPlaces(category, center, {
    destination: locationQuery,
    limit: options.limit || 12,
    signal: options.signal,
  });

  return result.items || [];
};

/**
 * Searches category places using external explore APIs
 * Handles attractions, food, and hotels categories
 */
const searchExploreCategoryPlaces = async (category, locationQuery, options = {}) => {
  const destination = String(locationQuery || '').trim();

  if (!destination) return [];

  if (category === 'attractions') {
    const response = await searchAttractions(destination);
    return (response.data?.data?.attractions?.items || []).slice(0, options.limit || 12);
  }

  if (category === 'food') {
    const response = await searchRestaurants({
      destination,
      country: '',
      state: '',
      foodCategory: '',
      start: 0,
    });
    return (response.data?.data?.restaurants?.items || []).slice(0, options.limit || 12);
  }

  if (category === 'hotels') {
    const response = await searchHotels({
      destination,
      country: '',
      state: '',
      roomType: '',
      start: 0,
    });
    return (response.data?.data?.hotels?.items || []).slice(0, options.limit || 12);
  }

  return [];
};

/**
 * Calculates checklist progress from items array
 * Returns completed count and total count
 */
const getChecklistProgress = (items = [], isDone) => {
  const completed = items.filter(isDone).length;
  return { completed, total: items.length };
};

/**
 * Summarizes route stops from days array
 * Groups consecutive days with same location name
 */
const getRouteSummary = (days = []) => {
  const summary = [];

  days.forEach((day) => {
    const name = day.location?.name || 'Location not set';
    const country = day.location?.country || '';
    const previous = summary[summary.length - 1];

    if (previous && previous.name === name && previous.country === country) {
      previous.endDay = day.dayNumber;
      return;
    }

    summary.push({
      name,
      country,
      startDay: day.dayNumber,
      endDay: day.dayNumber,
    });
  });

  return summary;
};

/**
 * TripDetailsPage renders the main screen and handles nearby interactions.
 * This component orchestrates all trip management functionality including itinerary,
 * place discovery, budget tracking, weather, AI assistance, and route optimization.
 */
function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currency = useContext(CurrencyContext);
  
  // UI state for tabs, active day, and panel visibility
  const [activeTab, setActiveTab] = useState('itinerary');
  const [activeDayNumber, setActiveDayNumber] = useState('summary');
  
  // Core trip data state
  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [items, setItems] = useState([]);
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  
  // Weather state management
  const [weather, setWeather] = useState(null);
  const [weatherGuidance, setWeatherGuidance] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState('idle');
  const [showWeatherHelp, setShowWeatherHelp] = useState(true);
  
  // Place discovery and ideas state
  const [ideas, setIdeas] = useState([]);
  const [tripRoutePlan, setTripRoutePlan] = useState({
    dayNumber: null,
    points: [],
    results: {},
    selectedMode: 'car',
    selectedRouteId: '',
    status: 'idle',
    message: '',
  });
  const [ideaCategory, setIdeaCategory] = useState('attractions');
  
  // Loading and status states
  const [status, setStatus] = useState('loading');
  const [ideaStatus, setIdeaStatus] = useState('idle');
  const [ideaDetailStatus, setIdeaDetailStatus] = useState('idle');
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [selectedPlaceSource, setSelectedPlaceSource] = useState('');
  const [ideaSearch, setIdeaSearch] = useState('');
  const [addMode, setAddMode] = useState(null);
  const [ideaAddMode, setIdeaAddMode] = useState(null);
  const [message, setMessage] = useState('');
  const [panelWidth, setPanelWidth] = useState(tripPanelMaxWidth);
  const [isAddingIdea, setIsAddingIdea] = useState(false);
  const [selectedIdeaSchedule, setSelectedIdeaSchedule] = useState({ startTime: '', endTime: '' });
  const weatherRankingCacheRef = useRef(new Map());
  
  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tripSettingsForm, setTripSettingsForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
  });
  const [tripSettingsStatus, setTripSettingsStatus] = useState('idle');
  const [tripSettingsError, setTripSettingsError] = useState('');
  
  // Travel tools state
  const [packingList, setPackingList] = useState(null);
  const [travelDocument, setTravelDocument] = useState(null);
  const [toolsStatus, setToolsStatus] = useState('idle');
  const [toolsMessage, setToolsMessage] = useState('');
  
  // Location editing state
  const [locationStatus, setLocationStatus] = useState('idle');
  const [isEditingDayLocation, setIsEditingDayLocation] = useState(false);
  const [isDayMenuOpen, setIsDayMenuOpen] = useState(false);
  const [locationSearchText, setLocationSearchText] = useState('');
  const [locationSearchSuggestions, setLocationSearchSuggestions] = useState([]);
  const [editedLocationMapCenter, setEditedLocationMapCenter] = useState(null);
  
  // Day group idea previews state
  const [dayGroupIdeaPreviews, setDayGroupIdeaPreviews] = useState({});
  const [dayGroupIdeaStatus, setDayGroupIdeaStatus] = useState('idle');
  const [dayGroupIdeaSource, setDayGroupIdeaSource] = useState('');
  
  // AI assistant state
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([]);
  const [aiStatus, setAiStatus] = useState('idle');
  const [aiError, setAiError] = useState('');

  /**
   * Updates a single day in the local state without making an API call
   * Immutable update pattern for day data
   */
  const updateDayLocal = (dayNumber, patch) => {
    setDays((currentDays) =>
      currentDays.map((day) => (day.dayNumber === dayNumber ? { ...day, ...patch } : day))
    );
  };

  /**
   * Effect hook that loads trip itinerary and summary data on component mount
   * Fetches trip details, days, items, and weather information
   */
  useEffect(() => {
    let isMounted = true;

    Promise.all([getTripItinerary(id), getTripSummary(id)])
      .then(([itineraryResponse, summaryResponse]) => {
        if (!isMounted) return;
        const itinerary = itineraryResponse.data?.data || {};
        setTrip(itinerary.trip);
        setDays(itinerary.days || []);
        setItems(itinerary.items || []);
        setWeather(summaryResponse.data?.data?.weather || null);
        setWeatherGuidance(summaryResponse.data?.data?.weatherGuidance || null);
        setStatus('success');
      })
      .catch((error) => {
        if (!isMounted) return;
        setStatus('error');
        setMessage(error.response?.data?.message || 'Unable to load trip details.');
      });

    // Cleanup prevents state updates after component unmount.
    return () => {
      isMounted = false;
    };
  }, [id]);

  /**
   * Effect hook that loads visited places data
   * Fetches user's visited place history for the trip
   */
  useEffect(() => {
    let isMounted = true;

    getVisitedPlaces()
      .then((response) => {
        if (!isMounted) return;
        setVisitedPlaces(response.data?.data?.visitedPlaces || []);
      })
      .catch(() => {
        if (isMounted) setVisitedPlaces([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const itemsMissingImages = items.filter((item) => item._id && !getPlaceImageCandidates(item).length);

    if (!itemsMissingImages.length) {
      return () => {
        isActive = false;
      };
    }

    Promise.allSettled(itemsMissingImages.map(async (item) => {
      const [enrichedPlace] = await enrichIdeaPlacesWithDetails([getItineraryItemLookupPlace(item)]);
      const imageCandidates = getPlaceImageCandidates(enrichedPlace).slice(0, 10);
      if (!imageCandidates.length) return null;

      const response = await updateItineraryItem(item._id, {
        imageUrl: imageCandidates[0],
        imageUrls: imageCandidates,
      });

      return response.data?.data?.item;
    })).then((results) => {
      if (!isActive) return;
      const enrichedItems = results
        .filter((result) => result.status === 'fulfilled' && result.value)
        .map((result) => result.value);

      if (!enrichedItems.length) return;

      setItems((currentItems) =>
        currentItems.map((item) => enrichedItems.find((enrichedItem) => enrichedItem._id === item._id) || item)
      );
    });

    return () => {
      isActive = false;
    };
  }, [items]);
  useEffect(() => {
    let isMounted = true;

    Promise.all([getPackingLists(), getTravelDocuments()])
      .then(([packingResponse, documentResponse]) => {
        if (!isMounted) return;
        const packingLists = packingResponse.data?.data?.packingLists || [];
        const documents = documentResponse.data?.data?.documents || documentResponse.data?.data?.travelDocuments || [];

        setPackingList(packingLists.find((list) => list.tripId?.toString?.() === id || list.tripId === id) || null);
        setTravelDocument(documents.find((document) => document.tripId?.toString?.() === id || document.tripId === id) || null);
        setToolsStatus('success');
      })
      .catch(() => {
        if (!isMounted) return;
        setToolsStatus('error');
        setToolsMessage('Unable to load trip checklists.');
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  /**
   * Memoized active day computation
   * Returns the currently selected day or the first day if none selected
   */
  const activeDay = useMemo(
    () => days.find((day) => day.dayNumber === activeDayNumber) || days[0],
    [activeDayNumber, days]
  );

  /**
   * Effect hook that loads weather data for the active day
   * Handles geocoding and browser location as fallback
   */
  useEffect(() => {
    if (!activeDay || !trip) return undefined;

    const dayLatitude = activeDay.location?.coordinates?.latitude;
    const dayLongitude = activeDay.location?.coordinates?.longitude;
    const hasDayCoordinates = Number.isFinite(Number(dayLatitude)) && Number.isFinite(Number(dayLongitude));
    const dayLocation = [
      getEditableLocationName(activeDay.location?.name),
      activeDay.location?.country,
    ].filter(Boolean).join(', ');

    let isMounted = true;
    setWeatherStatus('loading');
    const weatherDate = activeDay.date ? new Date(activeDay.date).toISOString().slice(0, 10) : undefined;

    Promise.resolve().then(async () => {
      if (dayLocation || hasDayCoordinates) {
        let latitude = hasDayCoordinates ? Number(dayLatitude) : undefined;
        let longitude = hasDayCoordinates ? Number(dayLongitude) : undefined;

        if (!hasDayCoordinates && dayLocation) {
          const geocodedPlace = await getGeocodeLocation(dayLocation).catch(() => null);
          if (geocodedPlace?.available) {
            latitude = Number(geocodedPlace.latitude);
            longitude = Number(geocodedPlace.longitude);
          }
        }

        const response = await searchWeather({
          destination: dayLocation,
          date: weatherDate,
          latitude,
          longitude,
          locationLabel: dayLocation,
        });
        return response.data?.data?.weather || null;
      }

      const currentLocation = await getBrowserCurrentLocationCenter();
      if (!currentLocation) {
        return {
          available: false,
          message: 'Allow location access to show weather when no day location is set.',
        };
      }

      const response = await searchWeather({
        date: weatherDate,
        latitude: currentLocation[0],
        longitude: currentLocation[1],
        locationLabel: 'Current location',
      });
      return response.data?.data?.weather || null;
    })
      .then((nextWeather) => {
        if (!isMounted) return;
        setWeather(nextWeather);
        setWeatherStatus('success');
      })
      .catch(() => {
        if (!isMounted) return;
        setWeather({
          available: false,
          message: 'Weather temporarily unavailable. Please try again shortly.',
        });
        setWeatherStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, [activeDay, trip]);

  /**
   * Effect hook that handles location search autocomplete
   * Geocodes search text and updates suggestions
   */
  useEffect(() => {
    if (!isEditingDayLocation || locationSearchText.trim().length < 2) {
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      getGeocodeLocation(locationSearchText.trim(), { signal: controller.signal })
        .then((place) => {
          if (!place?.available || !activeDay?.dayNumber) {
            setLocationSearchSuggestions([]);
            return;
          }

          setLocationSearchSuggestions([place.name || locationSearchText.trim()].filter(Boolean));
          setEditedLocationMapCenter({
            dayNumber: activeDay.dayNumber,
            center: [place.latitude, place.longitude],
          });
        })
        .catch(() => {
          if (!controller.signal.aborted) setLocationSearchSuggestions([]);
        });
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeDay, isEditingDayLocation, locationSearchText]);

  // Computed values for location display and suggestions
  const activeDayLocationLabel = [
    getEditableLocationName(activeDay?.location?.name),
    activeDay?.location?.country,
  ].filter(Boolean).join(', ') || 'Set a day location';
  
  const tripCountry = useMemo(() => {
    const countryName = activeDay?.location?.country || trip?.country || trip?.destinationSegments?.[0]?.country || '';
    return Country.getAllCountries().find((countryItem) => countryItem.name.toLowerCase() === countryName.toLowerCase());
  }, [activeDay?.location?.country, trip?.country, trip?.destinationSegments]);
  
  const stateLocationSuggestions = tripCountry
    ? State.getStatesOfCountry(tripCountry.isoCode).map((stateItem) => stateItem.name)
    : [];
  const popularLocationSuggestions = [
    getEditableLocationName(activeDay?.location?.name),
    getEditableLocationName(trip?.destination),
    ...(trip?.destinationSegments || []).map((segment) => segment.city || segment.name),
    'Georgetown',
  ].filter(Boolean);
  const activeLocationSearchSuggestions = isEditingDayLocation && locationSearchText.trim().length >= 2
    ? locationSearchSuggestions
    : [];
  const locationSuggestions = [...new Set([
    ...popularLocationSuggestions,
    ...activeLocationSearchSuggestions,
    ...stateLocationSuggestions,
  ])].slice(0, 60);
  const visibleLocationSuggestions = locationSuggestions
    .filter((locationName) => !locationSearchText || locationName.toLowerCase().includes(locationSearchText.toLowerCase()))
    .slice(0, 8);

  /**
   * Memoized visible day tabs computation
   * Shows limited number of days with overflow handling
   */
  const visibleDayTabs = useMemo(() => {
    const visibleLimit = days.length > 3 ? 2 : 3;
    const firstDays = days.slice(0, visibleLimit);
    const activeVisibleDay = days.find((day) => day.dayNumber === activeDayNumber);

    if (!activeVisibleDay || firstDays.some((day) => day.dayNumber === activeVisibleDay.dayNumber)) {
      return firstDays;
    }

    return [...firstDays.slice(0, Math.max(0, visibleLimit - 1)), activeVisibleDay];
  }, [activeDayNumber, days]);
  const hasOverflowDayTabs = days.length > visibleDayTabs.length;

  // Computed values for active day items and groupings
  const activeDayItems = useMemo(() => sortItemsBySchedule(getItemsForDay(items, activeDay || {})), [activeDay, items]);
  const visitedLookup = useMemo(() => buildVisitedLookup(visitedPlaces), [visitedPlaces]);
  const groupedDayItems = useMemo(() => itineraryGroups.map((group) => ({
    ...group,
    items: sortItemsBySchedule(activeDayItems.filter((item) => group.types.includes(item.type))),
  })), [activeDayItems]);
  const activeDayScheduleIssues = useMemo(() => getScheduleIssues(activeDayItems), [activeDayItems]);

  // Budget computation values
  const plannedBudget = days.reduce((total, day) => total + Number(day.budget?.amount || 0), 0);
  const tripCurrency = trip?.budget?.currency || currency?.selectedCurrency || 'MYR';
  const activeDayBudget = Number(activeDay?.budget?.amount || 0);
  const activeDaySpend = activeDayItems.reduce((total, item) => total + Number(item.priceEstimate?.amount || 0), 0);
  const activeDaySuggestedCostCount = activeDayItems.filter((item) => ['api', 'ai'].includes(item.priceEstimate?.source)).length;
  const activeDayBudgetDelta = activeDayBudget - activeDaySpend;
  const activeDayBudgetStatus = activeDayBudget <= 0
    ? {
      tone: activeDaySpend > 0 ? 'warning' : 'neutral',
      text: activeDaySpend > 0 ? 'No budget set' : 'Ready to plan',
    }
    : activeDayBudgetDelta < 0
      ? {
        tone: 'danger',
        text: `${currency?.formatAmount ? currency.formatAmount(Math.abs(activeDayBudgetDelta), tripCurrency) : Math.abs(activeDayBudgetDelta)} over budget`,
      }
      : {
        tone: 'success',
        text: `${currency?.formatAmount ? currency.formatAmount(activeDayBudgetDelta, tripCurrency) : activeDayBudgetDelta} remaining`,
      };
  const totalBudget = Number(trip?.budget?.totalAmount || 0);
  const tripBudgetDelta = totalBudget - plannedBudget;
  const remainingBudget = Math.max(0, tripBudgetDelta);
  const isTripBudgetOverAllocated = totalBudget > 0 && tripBudgetDelta < 0;
  const plannedBudgetPercent = totalBudget ? Math.min(100, Math.round((plannedBudget / totalBudget) * 100)) : 0;
  const activeDaySpendPercent = activeDayBudget ? Math.min(100, Math.round((activeDaySpend / activeDayBudget) * 100)) : 0;

  // Computed values for UI display
  const AddModeIcon = addMode?.icon || Plus;
  const recommendationLocation = getRecommendationLocation(trip, activeDay);
  const selectedIdeaHours = selectedIdea ? getPlaceHoursText(selectedIdea) : '';
  const selectedIdeaPriceText = selectedIdea ? getPlacePriceText(selectedIdea, tripCurrency, currency?.formatAmount) : '';
  const selectedIdeaPhone = selectedIdea?.phone || selectedIdea?.phoneNumber || selectedIdea?.telephone || '';
  const selectedIdeaWebsite = selectedIdea?.website || selectedIdea?.url || selectedIdea?.link || '';
  const selectedIdeaTimeText = [selectedIdea?.startTime, selectedIdea?.endTime].filter(Boolean).join(' - ');
  const selectedIdeaImageSrc = selectedIdea ? getTripPlaceImageSrc(selectedIdea) : '';
  const hasPartialSelectedIdeaTime = Boolean(selectedIdeaSchedule.startTime) !== Boolean(selectedIdeaSchedule.endTime);
  const selectedIdeaWarning = selectedIdea
    ? hasPartialSelectedIdeaTime
      ? 'Choose both From and To times, or leave both blank to keep this stop flexible.'
      : getOpeningWarning({ hoursText: selectedIdeaHours, ...selectedIdeaSchedule })
    : '';
  const hasInvalidSelectedIdeaTime = hasPartialSelectedIdeaTime || selectedIdeaWarning.startsWith('End time');
  
  // Weather display values
  const weatherTemperature = weather?.temperature?.max || weather?.temperature?.mean
    ? `${Math.round(weather.temperature.max || weather.temperature.mean)}${weather.temperature.unit || 'C'}`
    : '';
  const weatherRain = Number.isFinite(Number(weather?.precipitation?.probability))
    ? `${Math.round(Number(weather.precipitation.probability))}% rain`
    : Number.isFinite(Number(weather?.precipitation?.amountMm))
      ? `${Number(weather.precipitation.amountMm).toFixed(1)} mm rain`
      : 'Rain unavailable';
  const weatherWind = Number.isFinite(Number(weather?.windSpeed?.max))
    ? `${Number(weather.windSpeed.max).toFixed(1)} ${weather.windSpeed.unit || 'km/h'} wind`
    : 'Wind unavailable';
  const WeatherModeIcon = weatherModeIcons[weatherGuidance?.mode] || CloudSun;
  const activeWeatherIdeaProfile = getWeatherIdeaProfile(weatherGuidance, showWeatherHelp);
  const weatherRecommendedCategories = activeWeatherIdeaProfile ? ideaCategories : [];
  const addModeWeatherCategories = weatherRecommendedCategories
    .filter((category) => itineraryGroups.some((group) => group.categoryId === category.id));

  const rankIdeasForWeather = async (places, category, options = {}) => {
    const profile = getWeatherIdeaProfile(weatherGuidance, showWeatherHelp);
    const uniquePlaces = getUniquePlaces(places);

    if (!profile || !weather?.available || !uniquePlaces.length) {
      return uniquePlaces;
    }

    const placesWithCandidateIds = uniquePlaces.map((place, index) => ({
      ...place,
      weatherCandidateId: getWeatherCandidateId(place, category, index),
    }));
    const candidateIds = placesWithCandidateIds.map((place) => place.weatherCandidateId).join('|');
    const cacheKey = JSON.stringify({
      mode: weatherGuidance?.mode || '',
      condition: weather?.condition || '',
      date: activeDay?.date || '',
      location: options.locationQuery || recommendationLocation || '',
      category,
      candidateIds,
    });
    const cachedRanking = weatherRankingCacheRef.current.get(cacheKey);

    if (cachedRanking) return cachedRanking;

    try {
      const response = await getWeatherPlaceRanking({
        weather: {
          condition: weather.condition || '',
          mode: weatherGuidance?.mode || '',
          temperature: weatherTemperature,
          precipitation: weatherRain,
          wind: weatherWind,
          travelTip: weather.travelTip || '',
          placeTips: weatherGuidance?.placeTips || [],
        },
        trip: {
          destination: trip?.destination || '',
          country: trip?.country || '',
        },
        day: {
          dayNumber: activeDay?.dayNumber,
          location: getDayLocationQuery(activeDay, trip) || options.locationQuery || '',
        },
        category,
        candidates: placesWithCandidateIds.map((place, index) => toWeatherCandidate({
          ...place,
          id: place.weatherCandidateId,
        }, category, index)),
      });
      const ranking = response.data?.data?.ranking;

      if (ranking?.available && Array.isArray(ranking.rankedPlaces) && ranking.rankedPlaces.length) {
        const rankingMap = new Map(ranking.rankedPlaces.map((place, index) => [
          place.id,
          {
            index,
            score: Number(place.score) || 0,
            reason: place.reason || ranking.summary || profile.reason,
          },
        ]));
        const rankedPlaces = [...placesWithCandidateIds]
          .map((place, index) => {
            const rankedPlace = rankingMap.get(place.weatherCandidateId);
            return {
              ...place,
              weatherScore: rankedPlace?.score ?? Number(place.rating || 0),
              weatherReason: rankedPlace?.reason || profile.reason,
              weatherProfileLabel: profile.label,
              weatherRank: rankedPlace?.index ?? index + placesWithCandidateIds.length,
            };
          })
          .sort((firstPlace, secondPlace) =>
            Number(firstPlace.weatherRank || 0) - Number(secondPlace.weatherRank || 0)
            || Number(secondPlace.weatherScore || 0) - Number(firstPlace.weatherScore || 0)
          );

        weatherRankingCacheRef.current.set(cacheKey, rankedPlaces);
        return rankedPlaces;
      }
    } catch {
      // Keep place search usable when AI quota/network is unavailable.
    }

    const fallbackRanking = applyWeatherRanking(placesWithCandidateIds, category, profile);
    weatherRankingCacheRef.current.set(cacheKey, fallbackRanking);
    return fallbackRanking;
  };

  // Map and route computed values
  const activeDayMapCenter = activeDayNumber !== 'summary'
    ? editedLocationMapCenter?.dayNumber === activeDay?.dayNumber
      ? editedLocationMapCenter.center
      : getDayLocationCenter(activeDay)
    : null;
  
  const mapPlaces = items
    .map((item) => {
      const itemDay = days.find((day) => formatInputDate(day.date) === formatInputDate(item.scheduledDate));

      return {
        id: item.externalId || item._id,
        itineraryItemId: item._id,
        name: item.title,
        title: item.title,
        city: item.location?.address,
        address: item.location?.address,
        summary: item.description,
        categoryId: getMapCategoryForItemType(item.type),
        type: item.type,
        price: item.priceEstimate?.amount
          ? `${item.priceEstimate.amount} ${item.priceEstimate.currency || tripCurrency}`
          : 'Price unavailable',
        startTime: item.startTime || '',
        endTime: item.endTime || '',
        hours: item.description || '',
        lat: item.location?.coordinates?.coordinates?.[1],
        lng: item.location?.coordinates?.coordinates?.[0],
        dayNumber: itemDay?.dayNumber,
      };
    })
    .filter((place) => Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng)));
  
  const aiMapPlaces = isAiAssistantOpen && selectedIdea
    && Number.isFinite(Number(selectedIdea.lat)) && Number.isFinite(Number(selectedIdea.lng))
    ? [
      ...mapPlaces,
      {
        title: selectedIdea.name,
        city: selectedIdea.address,
        lat: selectedIdea.lat,
        lng: selectedIdea.lng,
      },
    ]
    : mapPlaces;

  // Route planning computed values
  const activeTripRouteResult = tripRoutePlan.results[tripRoutePlan.selectedMode];
  const selectedTripRouteOption = activeTripRouteResult?.alternatives?.find(
    (routeOption) => routeOption.id === tripRoutePlan.selectedRouteId
  ) || activeTripRouteResult;
  const selectedTripRoute = selectedTripRouteOption && activeTripRouteResult
    ? {
      ...activeTripRouteResult,
      ...selectedTripRouteOption,
      alternatives: activeTripRouteResult.alternatives || [],
      optimizedPoints: activeTripRouteResult.optimizedPoints || tripRoutePlan.points,
    }
    : null;
  const tripRouteMapPlaces = selectedTripRoute?.optimizedPoints || tripRoutePlan.points;
  const isDayRouteOpen = Boolean(tripRoutePlan.dayNumber);
  const routeSummary = useMemo(() => getRouteSummary(days), [days]);

  // Checklist progress calculations
  const packingProgress = getChecklistProgress(packingList?.items || [], (item) => item.isPacked);
  const documentProgress = getChecklistProgress(travelDocument?.items || [], (item) => item.files?.length);
  const packingProgressPercent = packingProgress.total
    ? Math.round((packingProgress.completed / packingProgress.total) * 100)
    : 0;
  const documentProgressPercent = documentProgress.total
    ? Math.round((documentProgress.completed / documentProgress.total) * 100)
    : 0;
  
  // Summary statistics
  const summaryTripDuration = days.length || trip?.durationDays || 0;
  const summaryLocationsSet = new Set(
    days
      .map((day) => getEditableLocationName(day.location?.name))
      .filter(Boolean)
  );
  const summaryPlannedItems = items.length;

  /**
   * Effect hook that loads day group idea previews
   * Fetches nearby place suggestions for each itinerary group
   */
  useEffect(() => {
    if (!trip || activeDayNumber === 'summary' || activeTab !== 'itinerary' || !activeDay) {
      return undefined;
    }

    let isCancelled = false;
    const controller = new AbortController();

    Promise.resolve().then(async () => {
      setDayGroupIdeaStatus('loading');
      setDayGroupIdeaSource('');

      const hasEnteredLocation = Boolean(activeDay.location?.name || getDayLocationCenter(activeDay));
      let locationCenter = getDayLocationCenter(activeDay);

      if (hasEnteredLocation && !locationCenter) {
        const [place] = await searchOpenStreetMapPlaces(getDayLocationQuery(activeDay, trip), {
          limit: 1,
          signal: controller.signal,
        });
        if (place) locationCenter = [place.lat, place.lng];
      }

      const currentLocationCenter = locationCenter ? null : await getBrowserCurrentLocationCenter();
      const primaryDestinationPlace = trip.destinationSegments?.[0] || { city: trip.destination, country: trip.country };
      const destinationCenter = getTripMapPoint(primaryDestinationPlace);
      const center = locationCenter || currentLocationCenter || destinationCenter;
      const sourceLabel = locationCenter
        ? activeDay.location?.name || 'day location'
        : currentLocationCenter
          ? 'current location'
          : recommendationLocation || trip.destination || 'trip destination';
      const textLocationQuery = hasEnteredLocation
        ? getDayLocationQuery(activeDay, trip)
        : sourceLabel;

      if (!center || isCancelled) {
        setDayGroupIdeaPreviews({});
        setDayGroupIdeaStatus('fallback');
        setDayGroupIdeaSource('');
        return;
      }

      const previewResults = await Promise.allSettled(itineraryGroups.map(async (group) => {
        const [providerResults, mapResults] = await Promise.all([
          searchProviderCategoryPlaces(group.categoryId, center, textLocationQuery, {
            limit: 3,
            signal: controller.signal,
          }).catch(() => []),
          searchOpenStreetMapCategoryPlaces(group.categoryId, center, {
            limit: 3,
            radius: 0.35,
            signal: controller.signal,
          }).catch(() => []),
        ]);
        const combinedResults = getUniquePlaces([...providerResults, ...mapResults]);
        const textResults = combinedResults.length >= 3
          ? []
          : await searchCategoryPlacesByText(group.categoryId, textLocationQuery, {
          limit: 3,
          limitPerTerm: 2,
          signal: controller.signal,
        }).catch(() => []);
        const results = (await rankIdeasForWeather(
          getUniquePlaces([...combinedResults, ...textResults]),
          group.categoryId,
          { locationQuery: textLocationQuery }
        )).slice(0, 3);

        const formattedIdeas = results.map((idea) => formatIdeaPlace({
            ...idea,
            summary: idea.weatherReason || idea.displayName || `${group.addLabel} near ${sourceLabel}`,
          }, group.categoryId));

        return [
          group.id,
          await enrichIdeaPlacesWithDetails(formattedIdeas),
        ];
      }));

      if (isCancelled) return;

      const nextPreviews = {};
      previewResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const [groupId, groupIdeas] = result.value;
          nextPreviews[groupId] = groupIdeas;
        }
      });

      setDayGroupIdeaPreviews(nextPreviews);
      setDayGroupIdeaSource(sourceLabel);
      setDayGroupIdeaStatus('success');
    }).catch(() => {
      if (!isCancelled) {
        setDayGroupIdeaPreviews({});
        setDayGroupIdeaStatus('fallback');
        setDayGroupIdeaSource('');
      }
    });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [activeDay, activeDayNumber, activeTab, recommendationLocation, showWeatherHelp, trip, weather, weatherGuidance]);

  /**
   * Handles visited place changes by updating the visited places list
   * Adds new record or removes existing one based on payload
   */
  const handleVisitedChange = (visitedPlace) => {
    if (!visitedPlace?.placeKey) return;
    setVisitedPlaces((currentPlaces) => {
      const withoutCurrent = currentPlaces.filter((place) => place.placeKey !== visitedPlace.placeKey);
      return [visitedPlace, ...withoutCurrent];
    });
  };

  /**
   * Creates visited place payload for an idea
   * Formats idea data for visited place tracking
   */
  const getIdeaVisitedPayload = (idea) => getVisitedPlacePayload({
    item: idea,
    type: getIdeaItemType(idea?.categoryId || ideaCategory),
    source: 'trip-ideas',
    defaultDate: activeDay?.date || trip?.startDate,
    tripId: trip?._id,
  });

  /**
   * Creates visited place payload for an itinerary item
   * Formats item data for visited place tracking
   */
  const getItemVisitedPayload = (item) => getVisitedPlacePayload({
    item,
    type: item?.type || 'location',
    source: 'trip-itinerary',
    defaultDate: item?.scheduledDate || activeDay?.date || trip?.startDate,
    tripId: trip?._id,
    itineraryItemId: item?._id,
  });

  /**
   * Saves a day's data to the server
   * Updates title, date, location, notes, and budget
   */
  const saveDay = async (day) => {
    const response = await updateItineraryDay(id, day.dayNumber, {
      date: day.date,
      title: day.title,
      location: day.location,
      notes: day.notes,
      budget: day.budget,
    });
    const savedDay = response.data?.data?.day;
    if (savedDay) updateDayLocal(savedDay.dayNumber, savedDay);
  };

  /**
   * Resolves a day location by geocoding the location query
   * Updates the day with resolved coordinates
   */
  const resolveDayLocation = async (day) => {
    const query = getDayLocationQuery(day, trip);
    if (!query) return day?.location || {};

    const existingCenter = getDayLocationCenter(day);
    const locationName = String(day?.location?.name || '').toLowerCase();
    const existingAddress = String(day?.location?.address || '').toLowerCase();
    if (existingCenter && (!locationName || existingAddress.includes(locationName))) return day.location;

    setLocationStatus('loading');
    try {
      const [place] = await searchOpenStreetMapPlaces(query, { limit: 1 });
      if (!place) {
        setLocationStatus('idle');
        return day?.location || {};
      }

      const resolvedLocation = {
        name: day?.location?.name || place.name,
        country: day?.location?.country || '',
        address: place.displayName || query,
        coordinates: {
          latitude: place.lat,
          longitude: place.lng,
        },
      };

      if (day?.dayNumber) {
        setEditedLocationMapCenter({
          dayNumber: day.dayNumber,
          center: [place.lat, place.lng],
        });
        updateDayLocal(day.dayNumber, { location: resolvedLocation });
        await saveDay({ ...day, location: resolvedLocation });
      }
      setLocationStatus('success');
      return resolvedLocation;
    } catch {
      setLocationStatus('idle');
      return day?.location || {};
    }
  };

  /**
   * Commits a day location change by geocoding the provided name
   * Updates the day with the resolved location data
   */
  const commitDayLocation = async (day, locationName) => {
    const typedName = String(locationName || '').trim();
    if (!day?.dayNumber || typedName.length < 2) return;

    setLocationStatus('loading');
    try {
      const place = await getGeocodeLocation(typedName);
      if (!place?.available) {
        setLocationStatus('idle');
        toast.error(place?.message || 'Unable to find that location. Try a city, state, or country name.');
        return;
      }

      const resolvedLocation = {
        name: typedName,
        country: place.country || '',
        address: place.address || typedName,
        coordinates: {
          latitude: place.latitude,
          longitude: place.longitude,
        },
      };
      const nextDay = { ...day, location: resolvedLocation };

      setEditedLocationMapCenter({
        dayNumber: day.dayNumber,
        center: [place.latitude, place.longitude],
      });
      updateDayLocal(day.dayNumber, { location: resolvedLocation });
      await saveDay(nextDay);
      setLocationSearchText(typedName);
      setLocationSearchSuggestions([]);
      setIsEditingDayLocation(false);
      setLocationStatus('success');
      toast.success(`Day ${day.dayNumber} location saved as ${typedName}.`);
    } catch (error) {
      setLocationStatus('idle');
      toast.error(error.response?.data?.message || error.message || 'Unable to save this location.');
    }
  };

  /**
   * Updates the trip budget total amount
   * Saves changes to the server
   */
  const updateTripBudget = async (amount) => {
    const response = await updateTrip(id, {
      budget: {
        ...trip.budget,
        totalAmount: getSavedMoneyValue(amount),
        currency: tripCurrency,
      },
    });
    const savedTrip = response.data?.data?.trip;
    if (savedTrip) setTrip(savedTrip);
  };

  /**
   * Opens travel tool page with trip context
   * Navigates to packing list or document checklist with query parameters
   */
  const openTravelTool = (path, recordId) => {
    const params = new URLSearchParams({ tripId: id });
    if (recordId) params.set('recordId', recordId);
    setSettingsOpen(false);
    navigate(`${path}?${params.toString()}`);
  };

  /**
   * Opens the trip settings modal with current trip data
   * Populates form fields with existing trip details
   */
  const openTripSettings = () => {
    setTripSettingsForm({
      title: trip.title || trip.destination || '',
      startDate: formatInputDate(trip.startDate),
      endDate: formatInputDate(trip.endDate),
    });
    setTripSettingsError('');
    setTripSettingsStatus('idle');
    setSettingsOpen(true);
  };

  /**
   * Saves trip settings including title, start date, and end date
   * Validates inputs and handles date range changes
   */
  const saveTripSettings = async () => {
    const title = tripSettingsForm.title.trim();
    if (!title) {
      setTripSettingsError('Enter a trip name.');
      return;
    }
    if (!tripSettingsForm.startDate || !tripSettingsForm.endDate) {
      setTripSettingsError('Choose both a start date and an end date.');
      return;
    }
    if (new Date(tripSettingsForm.endDate) < new Date(tripSettingsForm.startDate)) {
      setTripSettingsError('End date cannot be before the start date.');
      return;
    }

    const oldDuration = Math.round(
      (new Date(formatInputDate(trip.endDate)) - new Date(formatInputDate(trip.startDate))) / 86400000
    ) + 1;
    const newDuration = Math.round(
      (new Date(tripSettingsForm.endDate) - new Date(tripSettingsForm.startDate)) / 86400000
    ) + 1;
    if (
      newDuration < oldDuration
      && !window.confirm(
        `Shortening this trip to ${newDuration} day${newDuration === 1 ? '' : 's'} will remove itinerary days and planned items outside the new date range. Continue?`
      )
    ) {
      return;
    }

    setTripSettingsStatus('saving');
    setTripSettingsError('');
    try {
      const response = await updateTrip(id, {
        title,
        startDate: tripSettingsForm.startDate,
        endDate: tripSettingsForm.endDate,
      });
      const itineraryResponse = await getTripItinerary(id);
      const itinerary = itineraryResponse.data?.data || {};
      setTrip(response.data?.data?.trip || itinerary.trip);
      setDays(itinerary.days || []);
      setItems(itinerary.items || []);
      setActiveDayNumber('summary');
      setTripSettingsStatus('success');
      toast.success('Trip name and dates updated.');
    } catch (error) {
      setTripSettingsStatus('error');
      setTripSettingsError(error.response?.data?.message || 'Unable to update trip details.');
    }
  };

  /**
   * Updates item price locally without saving to server
   * Immutable update pattern for price estimation
   */
  const updateItemPriceLocal = (item, amount) => {
    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem._id === item._id
          ? {
            ...currentItem,
            priceEstimate: {
              ...currentItem.priceEstimate,
              amount,
              currency: currentItem.priceEstimate?.currency || tripCurrency,
              source: 'manual',
            },
          }
          : currentItem
      )
    );
  };

  /**
   * Saves item price to the server
   * Updates the price estimate for a specific itinerary item
   */
  const saveItemPrice = async (itemId) => {
    const item = items.find((currentItem) => currentItem._id === itemId);
    await updateItineraryItem(itemId, {
      priceEstimate: {
        amount: getSavedMoneyValue(item?.priceEstimate?.amount),
        currency: item?.priceEstimate?.currency || tripCurrency,
        source: 'manual',
        suggestionText: item?.priceEstimate?.suggestionText || '',
      },
    });
  };

  /**
   * Updates item time locally without saving to server
   * Sets start time or end time for an itinerary item
   */
  const updateItemTimeLocal = (item, field, value) => {
    setItems((currentItems) =>
      currentItems.map((currentItem) => (currentItem._id === item._id ? { ...currentItem, [field]: value } : currentItem))
    );
    setSelectedIdea((currentPlace) => {
      const currentId = currentPlace?.itineraryItemId || currentPlace?._id || currentPlace?.id;
      if (currentId !== item._id) return currentPlace;
      return { ...currentPlace, [field]: value };
    });
  };

  /**
   * Saves item time to the server
   * Updates start time and end time for an itinerary item
   */
  const saveItemTime = async (itemId, nextTime = {}) => {
    const item = items.find((currentItem) => currentItem._id === itemId);
    await updateItineraryItem(itemId, {
      startTime: nextTime.startTime ?? item?.startTime ?? '',
      endTime: nextTime.endTime ?? item?.endTime ?? '',
    });
  };

  /**
   * Removes an item from the itinerary
   * Deletes from server and updates local state
   */
  const removeItem = async (itemId) => {
    await deleteItineraryItem(itemId);
    setItems((currentItems) => currentItems.filter((item) => item._id !== itemId));
  };

  /**
   * Loads place ideas based on category and search term
   * Queries multiple APIs and deduplicates results
   */
  const loadIdeas = async (category = '', searchTerm = ideaSearch) => {
    if (!trip) return;
    setIdeaStatus('loading');
    setSelectedIdea(null);

    try {
      const weatherProfile = getWeatherIdeaProfile(weatherGuidance, showWeatherHelp && !searchTerm?.trim());
      const activeCategory = category || ideaCategory;
      setIdeaCategory(activeCategory);
      const ideaAnchorDay = activeDayNumber === 'summary' ? days[0] : activeDay;
      const explicitSearchTerm = searchTerm?.trim();
      let center = null;
      let locationQuery = explicitSearchTerm;

      if (explicitSearchTerm) {
        const [searchPlace] = await searchOpenStreetMapPlaces(explicitSearchTerm, { limit: 1 });
        center = searchPlace ? [searchPlace.lat, searchPlace.lng] : null;
      } else {
        const resolvedLocation = await resolveDayLocation(ideaAnchorDay || {});
        center = getDayLocationCenter({ location: resolvedLocation })
          || getTripMapPoint(trip.destinationSegments?.[0] || {
            city: getEditableLocationName(trip.destination),
            country: trip.country,
          });
        locationQuery = getDayLocationQuery({ ...ideaAnchorDay, location: resolvedLocation }, trip)
          || recommendationLocation
          || trip.destination;
      }

      const [exploreResults, providerResults, mapResults] = await Promise.all([
        searchExploreCategoryPlaces(activeCategory, locationQuery, { limit: 12 }).catch(() => []),
        searchProviderCategoryPlaces(activeCategory, center, locationQuery, { limit: 12 }).catch(() => []),
        center
          ? searchOpenStreetMapCategoryPlaces(activeCategory, center, { limit: 12, radius: 0.35 }).catch(() => [])
          : Promise.resolve([]),
      ]);
      const combinedResults = getUniquePlaces([...exploreResults, ...providerResults, ...mapResults]);
      const textResults = combinedResults.length >= 6
        ? []
        : await searchCategoryPlacesByText(activeCategory, locationQuery, {
        limit: 12,
        limitPerTerm: 4,
      }).catch(() => []);
      const results = (weatherProfile
        ? await rankIdeasForWeather(
          getUniquePlaces([...combinedResults, ...textResults]),
          activeCategory,
          { locationQuery }
        )
        : getUniquePlaces([...combinedResults, ...textResults])
      ).slice(0, 12);
      const formattedIdeas = results.map((idea) => formatIdeaPlace({
        ...idea,
        summary: idea.weatherReason || idea.displayName || `${activeCategory} near ${locationQuery}`,
      }, activeCategory));
      const nextIdeas = await enrichIdeaPlacesWithDetails(formattedIdeas);
      setIdeas(nextIdeas);
      setSelectedIdea(null);
      setIdeaStatus('success');
    } catch {
      setIdeas([]);
      setSelectedIdea(null);
      setIdeaStatus('fallback');
    }
  };

  /**
   * Opens the add search panel for a specific itinerary group
   * Switches to ideas tab and loads category results
   */
  const openAddSearch = (group) => {
    setActiveTab('ideas');
    setIdeaAddMode(group);
    setAddMode(null);
    closeDayRoute();
    setIdeaSearch('');
    loadIdeas(group.categoryId, '');
  };

  /**
   * Optimizes route for a specific day
   * Fetches route between all places on that day
   */
  const optimizeDayRoute = async (day) => {
    const rawDayPoints = mapPlaces.filter((place) => place.dayNumber === day.dayNumber);
    const dayItems = getItemsForDay(items, day);
    const dayScheduleIssues = getScheduleIssues(dayItems);
    const scheduleAwareRoute = getScheduleAwareRoutePoints(rawDayPoints);
    const dayPoints = scheduleAwareRoute.points;
    setActiveTab('itinerary');
    setActiveDayNumber(day.dayNumber);
    setIsEditingDayLocation(false);
    setIsDayMenuOpen(false);
    setSelectedIdea(null);
    setAddMode(null);

    if (dayPoints.length < 2) {
      setTripRoutePlan((current) => ({
        ...current,
        dayNumber: day.dayNumber,
        points: dayPoints,
        results: {},
        selectedRouteId: '',
        status: 'error',
        message: `Add at least two places to Day ${day.dayNumber} before optimizing its route.`,
        scheduleIssues: dayScheduleIssues,
      }));
      return;
    }

    setTripRoutePlan((current) => ({
      ...current,
      dayNumber: day.dayNumber,
      points: dayPoints,
      results: {},
      selectedRouteId: '',
      status: 'loading',
      message: `Optimizing Day ${day.dayNumber} route...`,
      scheduleIssues: dayScheduleIssues,
    }));

    try {
      const routeEntries = await Promise.all(routeModes.map(async (mode) => [
        mode.id,
        await getRouteBetweenPlaces(dayPoints, null, {
          mode: mode.id,
          optimize: !scheduleAwareRoute.preserveOrder,
        }),
      ]));
      const results = Object.fromEntries(routeEntries.map(([modeId, routeResult]) => [
        modeId,
        routeResult
          ? {
            ...routeResult,
            optimizedPoints: annotateFlexibleRouteSchedule(
              routeResult.optimizedPoints || dayPoints,
              modeId
            ),
          }
          : routeResult,
      ]));
      const selectedMode = results[tripRoutePlan.selectedMode] ? tripRoutePlan.selectedMode : 'car';
      const activeRoute = results[selectedMode] || results.car;
      const routeScheduleMessage = activeRoute?.optimizedPoints?.some((point) => point.suggestedStartTime)
        ? 'Suggested times were placed inside available opening-hour windows when possible.'
        : '';
      const travelIssues = getTravelTimeIssues(
        activeRoute?.optimizedPoints || dayPoints,
        selectedMode
      );

      setTripRoutePlan((current) => ({
        ...current,
        dayNumber: day.dayNumber,
        points: dayPoints,
        results,
        selectedMode,
        selectedRouteId: activeRoute?.id || '',
        status: 'success',
        message: [scheduleAwareRoute.message, routeScheduleMessage, activeRoute?.message].filter(Boolean).join(' '),
        scheduleIssues: [...dayScheduleIssues, ...travelIssues],
      }));
    } catch (error) {
      setTripRoutePlan((current) => ({
        ...current,
        dayNumber: day.dayNumber,
        points: dayPoints,
        results: {},
        selectedRouteId: '',
        status: 'error',
        message: error.message || 'Unable to optimize this day route.',
        scheduleIssues: dayScheduleIssues,
      }));
    }
  };

  /**
   * Selects a different travel mode for the route
   * Updates the displayed route information
   */
  const selectDayRouteMode = (modeId) => {
    const modeRoute = tripRoutePlan.results[modeId];
    const baseScheduleIssues = (tripRoutePlan.scheduleIssues || [])
      .filter((issue) => issue.type !== 'travel-conflict');
    const travelIssues = getTravelTimeIssues(modeRoute?.optimizedPoints || tripRoutePlan.points, modeId);
    const routeScheduleMessage = modeRoute?.optimizedPoints?.some((point) => point.suggestedStartTime)
      ? 'Suggested times were placed inside available opening-hour windows when possible.'
      : '';

    setTripRoutePlan((current) => ({
      ...current,
      selectedMode: modeId,
      selectedRouteId: modeRoute?.id || '',
      message: [routeScheduleMessage, modeRoute?.message].filter(Boolean).join(' '),
      scheduleIssues: [...baseScheduleIssues, ...travelIssues],
    }));
  };

  /**
   * Closes the day route panel
   * Resets route plan state
   */
  const closeDayRoute = () => {
    setTripRoutePlan((current) => ({
      ...current,
      dayNumber: null,
      points: [],
      results: {},
      selectedRouteId: '',
      status: 'idle',
      message: '',
      scheduleIssues: [],
    }));
  };

  /**
   * Closes the add search panel
   * Resets selection state
   */
  const closeAddSearch = () => {
    setAddMode(null);
    setSelectedIdea(null);
  };

  /**
   * Handles idea search form submission
   * Triggers new search with current query
   */
  const handleIdeaSearch = (event) => {
    event.preventDefault();
    loadIdeas(addMode?.categoryId || ideaCategory, ideaSearch);
  };

  /**
   * Selects an idea for detailed view
   * Sets selected idea and source
   */
  const selectIdea = async (idea) => {
    setSelectedIdea(idea);
    setSelectedPlaceSource('idea');
    setIdeaDetailStatus('loading');

    try {
      const [enrichedIdea] = await enrichIdeaPlacesWithDetails([idea]);
      setSelectedIdea(enrichedIdea);
      setIdeas((currentIdeas) =>
        currentIdeas.map((currentIdea) => (currentIdea.id === idea.id ? enrichedIdea : currentIdea))
      );
      setIdeaDetailStatus('success');
    } catch {
      setIdeaDetailStatus('fallback');
    }
  };

  /**
   * Selects a trip place from itinerary or map
   * Enriches with additional details if available
   */
  const selectTripPlace = async (place) => {
    if (!place) return;

    const normalizedPlace = formatIdeaPlace({
      ...place,
      name: place.name || place.title,
      address: place.address || place.city,
      hours: getPlaceHoursText(place),
      price: getPlacePriceText(place, tripCurrency, currency?.formatAmount),
    }, place.categoryId || getMapCategoryForItemType(place.type));

    setSelectedIdea(normalizedPlace);
    setSelectedPlaceSource(place.itineraryItemId || place._id ? 'itinerary' : 'idea');
    setIdeaDetailStatus('loading');

    try {
      const details = await getMapPlaceDetails(normalizedPlace);
      const enrichedPlace = details?.item
        ? formatIdeaPlace({
          ...normalizedPlace,
          ...details.item,
          name: details.item.name || normalizedPlace.name,
          address: details.item.address || normalizedPlace.address,
          hours: getPlaceHoursText({ ...normalizedPlace, ...details.item }),
          price: getPlacePriceText({ ...normalizedPlace, ...details.item }, tripCurrency, currency?.formatAmount),
        }, normalizedPlace.categoryId)
        : normalizedPlace;

      setSelectedIdea(enrichedPlace);
      setIdeaDetailStatus(details?.available ? 'success' : 'fallback');
    } catch {
      setIdeaDetailStatus('fallback');
    }
  };

  /**
   * Sends a prompt to the AI assistant
   * Handles conversation history and place recommendations
   */
  const askTripAiAssistant = async () => {
    const prompt = aiInput.trim();
    if (!prompt || !trip || aiStatus === 'loading') return;

    const history = aiMessages.map((message) => ({ role: message.role, text: message.text }));
    const userMessage = { id: `user-${Date.now()}`, role: 'user', text: prompt };
    setAiMessages((currentMessages) => [...currentMessages, userMessage]);
    setAiInput('');
    setAiStatus('loading');
    setAiError('');
    setSelectedIdea(null);

    try {
      const response = await getTripAiRecommendations({
        prompt,
        trip: {
          title: trip.title,
          destination: trip.destination,
          country: trip.country,
          startDate: trip.startDate,
          endDate: trip.endDate,
          budget: trip.budget,
        },
        plannedPlaces: items.map((item) => item.title).filter(Boolean),
        history,
      });
      const recommendation = response.data?.data?.recommendations || {};

      const resolvedResults = await Promise.allSettled(
        (recommendation.places || []).map(async (suggestion) => {
          const [place] = await searchOpenStreetMapPlaces(suggestion.searchQuery, { limit: 1 });
          if (!place) return null;
          return formatIdeaPlace({
            ...place,
            summary: suggestion.reason || place.displayName,
            aiReason: suggestion.reason,
          }, suggestion.category);
        })
      );
      const nextPlaces = resolvedResults
        .filter((result) => result.status === 'fulfilled' && result.value)
        .map((result) => result.value);

      setAiMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: recommendation.answer || 'Here are some suggestions for this trip.',
          places: nextPlaces,
        },
      ]);
      if (!recommendation.available && !nextPlaces.length) {
        setAiError(recommendation.answer || 'AI recommendations are temporarily unavailable.');
      }
      setAiStatus('success');
    } catch (error) {
      setAiError(error.response?.data?.message || 'Unable to ask Llama 3.1 right now.');
      setAiStatus('error');
    }
  };

  /**
   * Selects a place from AI assistant recommendations
   * Sets up the place for viewing or addition
   */
  const selectAiPlace = (place) => {
    setSelectedIdea(place);
    setSelectedPlaceSource('idea');
    setIdeaDetailStatus('success');
  };

  /**
   * Adds an idea place to the current day's itinerary
   * Creates a new itinerary item with the place data
   */
  const addIdeaToDay = async (idea, modeOverride = ideaAddMode || addMode) => {
    if (!idea || isAddingIdea) return;

    setIsAddingIdea(true);
    const hasCoordinates = Number.isFinite(Number(idea.lng)) && Number.isFinite(Number(idea.lat));

    try {
      const ideaImageCandidates = getPlaceImageCandidates(idea).slice(0, 10);
      const response = await createItineraryItem(id, {
        type: modeOverride?.types?.[0] || getIdeaItemType(idea.categoryId || ideaCategory),
        title: idea.name,
        description: [
          idea.summary || idea.address || idea.displayName || '',
          idea.openState ? `Hours: ${idea.openState}` : '',
          idea.rating && idea.rating !== 'N/A' ? `Rating: ${Number(idea.rating).toFixed(1)}` : '',
          idea.reviews ? `Reviews: ${idea.reviews}` : '',
          idea.price && !unavailablePricePattern.test(String(idea.price)) ? `Price: ${idea.price}` : '',
        ].filter(Boolean).join('\n'),
        scheduledDate: activeDay?.date || trip.startDate,
        ...(selectedIdeaSchedule.startTime ? { startTime: selectedIdeaSchedule.startTime } : {}),
        ...(selectedIdeaSchedule.endTime ? { endTime: selectedIdeaSchedule.endTime } : {}),
        location: hasCoordinates ? {
          address: idea.address || idea.displayName,
          coordinates: {
            type: 'Point',
            coordinates: [Number(idea.lng), Number(idea.lat)],
          },
        } : undefined,
        imageUrl: ideaImageCandidates[0],
        imageUrls: ideaImageCandidates,
        source: 'openstreetmap',
        externalId: idea.id,
        priceEstimate: buildPlacePriceEstimate(idea, tripCurrency),
        rating: Number.isFinite(Number(idea.rating)) ? Number(idea.rating) : undefined,
      });
      const savedItem = response.data?.data?.item;

      if (savedItem) {
        setItems((currentItems) => [...currentItems, savedItem]);
        setActiveTab('itinerary');
        setAddMode(null);
        setIdeaAddMode(null);
        setSelectedIdea(null);
        toast.success(`Added ${savedItem.title} to Day ${activeDay?.dayNumber || 1}.`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to add this place to the itinerary.');
    } finally {
      setIsAddingIdea(false);
    }
  };

  /**
   * Starts panel resize interaction
   * Sets up pointer event listeners for drag-to-resize
   */
  const startPanelResize = (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = panelWidth;

    const handlePointerMove = (moveEvent) => {
      const nextWidth = startWidth + moveEvent.clientX - startX;
      setPanelWidth(Math.min(Math.max(nextWidth, tripPanelMinWidth), tripPanelMaxWidth));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  /**
   * Loading state render
   * Displays spinner while trip data is being fetched
   */
  if (status === 'loading') {
    return <p className="settings-empty"><LoaderCircle className="trip-details-spin" size={16} aria-hidden="true" /> Loading trip details...</p>;
  }

  /**
   * Error state render
   * Displays error message when trip data loading fails
   */
  if (status === 'error') {
    return <p className="form-error" role="alert">{message}</p>;
  }

  /**
   * Main render function
   * Returns the complete trip details page structure
   */
  return (
    <section className="trip-details-page" aria-labelledby="trip-details-title">
      {/* Top navigation bar with back link, title, and actions */}
      <header className="trip-details-topbar">
        <div className="trip-details-title-row">
          <Link to="/trips" className="trip-back-link">
            <ArrowLeft size={17} aria-hidden="true" />
            Back
          </Link>
          <div>
            <h2 id="trip-details-title">{trip.title || trip.destination}</h2>
            <p>
              <CalendarDays size={15} aria-hidden="true" />
              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            </p>
          </div>
        </div>
        <div className="trip-details-topbar-actions">
          <button className="trip-settings-button" type="button" onClick={openTripSettings}>
            <Settings size={16} aria-hidden="true" />
            Settings
          </button>
          <div className="trip-details-budget">
            <span>Budget</span>
            <strong>{currency?.formatAmount ? currency.formatAmount(trip.budget?.totalAmount || 0, tripCurrency) : `${tripCurrency} ${trip.budget?.totalAmount || 0}`}</strong>
          </div>
        </div>
      </header>

      {/* Settings modal overlay */}
      {settingsOpen ? (
        <div className="trip-settings-overlay" role="presentation" onClick={() => setSettingsOpen(false)}>
          <aside className="trip-settings-drawer" aria-label="Trip settings" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>Trip Settings</span>
                <h3>Manage Trip</h3>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close trip settings">
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            {/* Trip details section */}
            <section className="trip-settings-section">
              <h4>Trip Details</h4>
              <label className="trip-settings-field">
                <span>Trip name</span>
                <input
                  type="text"
                  maxLength="120"
                  value={tripSettingsForm.title}
                  onChange={(event) => setTripSettingsForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))}
                />
              </label>
              <div className="trip-settings-date-grid">
                <label className="trip-settings-field">
                  <span>Start date</span>
                  <input
                    type="date"
                    value={tripSettingsForm.startDate}
                    onChange={(event) => setTripSettingsForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))}
                  />
                </label>
                <label className="trip-settings-field">
                  <span>End date</span>
                  <input
                    type="date"
                    min={tripSettingsForm.startDate}
                    value={tripSettingsForm.endDate}
                    onChange={(event) => setTripSettingsForm((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))}
                  />
                </label>
              </div>
              <div className="trip-settings-info">
                <Info size={17} aria-hidden="true" />
                <p>
                  Extending the range adds empty days. Shortening it removes leftover days and
                  planned items. Existing retained days move to their new dates.
                </p>
              </div>
              <button
                className="trip-settings-save"
                type="button"
                onClick={saveTripSettings}
                disabled={tripSettingsStatus === 'saving'}
              >
                {tripSettingsStatus === 'saving' ? 'Saving...' : 'Save trip details'}
              </button>
              {tripSettingsError ? (
                <p className="trip-settings-inline-error" role="alert">{tripSettingsError}</p>
              ) : null}
            </section>

            {/* Packing list section */}
            <section className="trip-settings-section trip-settings-row">
              <div>
                <h4>Packing List</h4>
                <p>
                  {packingList
                    ? `${packingProgress.completed} / ${packingProgress.total} packed`
                    : 'No packing list linked to this trip'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openTravelTool('/packing-lists', packingList?._id)}
              >
                {packingList ? 'Manage' : 'Create'}
              </button>
            </section>

            {/* Document checklist section */}
            <section className="trip-settings-section trip-settings-row">
              <div>
                <h4>Document Checklist</h4>
                <p>
                  {travelDocument
                    ? `${documentProgress.completed} / ${documentProgress.total} with files`
                    : 'No document checklist linked to this trip'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openTravelTool('/travel-documents', travelDocument?._id || travelDocument?.id)}
              >
                {travelDocument ? 'Manage' : 'Create'}
              </button>
            </section>

            {/* Budget section */}
            <section className="trip-settings-section">
              <h4>Trip Budget</h4>
              <label className="trip-settings-budget-input">
                <span>{tripCurrency}</span>
                <input
                  type="number"
                  min="0"
                  value={getEditableMoneyValue(trip.budget?.totalAmount)}
                  onChange={(event) => setTrip((current) => ({
                    ...current,
                    budget: { ...current.budget, totalAmount: event.target.value, currency: tripCurrency },
                  }))}
                  onBlur={(event) => updateTripBudget(event.target.value)}
                />
              </label>
            </section>

            {toolsStatus === 'error' || toolsMessage ? (
              <p className="trip-settings-message" role="alert">{toolsMessage || 'Checklist tools are unavailable.'}</p>
            ) : null}
          </aside>
        </div>
      ) : null}

      {/* Main content shell with AI assistant, left panel, resizer, and map */}
      <div
        className={`trip-details-shell ${isAiAssistantOpen ? 'has-ai-assistant' : ''}`}
        style={{ '--trip-left-panel-width': `${panelWidth}px` }}
      >
        {/* AI Assistant Panel */}
        {isAiAssistantOpen ? (
          <TripAiAssistantPanel
            error={aiError}
            input={aiInput}
            isLoading={aiStatus === 'loading'}
            messages={aiMessages}
            onClose={() => {
              setIsAiAssistantOpen(false);
              setSelectedIdea(null);
            }}
            onSelectPlace={selectAiPlace}
            onSend={askTripAiAssistant}
            selectedPlaceId={selectedIdea?.id}
            setInput={setAiInput}
          />
        ) : null}

        {/* Left panel with itinerary or ideas */}
        <aside className="trip-details-panel">
          {addMode ? (
            // Add search panel
            <div className="trip-add-search-panel">
              <header className="trip-add-search-header">
                <button type="button" onClick={closeAddSearch} aria-label="Back to itinerary">
                  <ArrowLeft size={18} aria-hidden="true" />
                </button>
                <div>
                  <span>Add to Day {activeDay?.dayNumber || 1}</span>
                  <strong>{addMode.title}</strong>
                </div>
              </header>

              {/* Search form */}
              <form className="trip-idea-search" onSubmit={handleIdeaSearch}>
                <input
                  value={ideaSearch}
                  onChange={(event) => setIdeaSearch(event.target.value)}
                  placeholder={`Search real places near ${recommendationLocation || trip.destination || 'this trip'}`}
                />
                <button type="submit" aria-label="Search places">
                  <Search size={16} aria-hidden="true" />
                </button>
              </form>

              {/* Weather help section */}
              {showWeatherHelp && (weatherGuidance || weather) ? (
                <section className={weather?.available ? 'trip-weather-helper' : 'trip-weather-helper is-compact'} aria-label="Weather planning help">
                  <div className="trip-weather-helper-heading">
                    <span><WeatherModeIcon size={16} aria-hidden="true" /></span>
                    <div>
                      <strong>{weather?.available ? 'Plan for the day weather' : weatherGuidance?.headline || 'Weather planning'}</strong>
                      {weather?.available ? (
                        <small>{`${weather.condition}${weatherTemperature ? `, ${weatherTemperature}` : ''}`}</small>
                      ) : null}
                    </div>
                    <button className="trip-weather-hide" type="button" onClick={() => setShowWeatherHelp(false)}>
                      Default
                    </button>
                  </div>
                  {weather?.available ? (
                    <div className="trip-weather-tip-list">
                      {weather.travelTip ? <span>{weather.travelTip}</span> : null}
                      {(weatherGuidance?.packingTips || []).slice(0, 1).map((tip) => <span key={tip}>{tip}</span>)}
                      {(weatherGuidance?.placeTips || []).slice(0, 1).map((tip) => <span key={tip}>{tip}</span>)}
                    </div>
                  ) : null}
                  {addModeWeatherCategories.length ? (
                    <div className="trip-weather-shortcuts" aria-label="Weather-aware place categories">
                      {addModeWeatherCategories.map((category) => {
                        const CategoryIcon = category.icon;
                        return (
                          <button
                            type="button"
                            key={category.id}
                            onClick={() => {
                              if (addMode) {
                                setAddMode(itineraryGroups.find((group) => group.categoryId === category.id) || addMode);
                              }
                              loadIdeas(category.id, '');
                            }}
                          >
                            <CategoryIcon size={13} aria-hidden="true" />
                            {category.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {/* Ideas list */}
              {ideaStatus === 'loading' ? (
                <p className="settings-empty"><LoaderCircle className="trip-details-spin" size={16} aria-hidden="true" /> Loading places...</p>
              ) : ideas.length === 0 ? (
                <div className="trip-add-empty">
                  <Search size={24} aria-hidden="true" />
                  <h3>No places found</h3>
                  <p>Try a more specific city, state, or area for {addMode.title.toLowerCase()}.</p>
                </div>
              ) : (
                <div className="trip-idea-list">
                  {ideas.map((idea) => {
                    const visitedPayload = getIdeaVisitedPayload(idea);
                    const visitedRecord = visitedLookup[visitedPayload.placeKey];
                    const ideaImageSrc = getTripPlaceImageSrc(idea);

                    return (
                      <button
                        className={selectedIdea?.id === idea.id ? 'trip-idea-result is-active' : 'trip-idea-result'}
                        key={idea.id}
                        type="button"
                        onClick={() => selectIdea(idea)}
                      >
                        {visitedRecord ? <span className="visited-place-watermark">Visited</span> : null}
                        <div className="trip-idea-card-main">
                          <span className="trip-idea-thumb">
                            {ideaImageSrc
                              ? <img src={ideaImageSrc} alt="" loading="lazy" />
                              : <AddModeIcon size={20} aria-hidden="true" />}
                          </span>
                          <div>
                            <span className="trip-idea-type">{addMode.addLabel}</span>
                            <strong>{idea.name}</strong>
                            <p>{idea.address || idea.displayName || idea.summary || 'Suggested place near this trip.'}</p>
                          </div>
                        </div>
                        <div className="trip-idea-meta">
                          {idea.weatherReason ? <span className="trip-weather-match"><WeatherModeIcon size={12} aria-hidden="true" />{idea.weatherReason}</span> : null}
                          <span><Star size={12} aria-hidden="true" />{idea.rating && idea.rating !== 'N/A' ? `${Number(idea.rating).toFixed(1)} rating` : 'No rating yet'}</span>
                          {idea.reviews ? <span>{Number(idea.reviews) ? `${Number(idea.reviews).toLocaleString()} reviews` : idea.reviews}</span> : null}
                          <span><Clock3 size={12} aria-hidden="true" />{idea.openState || idea.hours || 'Hours unavailable'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Tab navigation */}
              <nav className="trip-details-tabs" aria-label="Trip details tabs">
                <button className={activeTab === 'itinerary' ? 'active' : ''} type="button" onClick={() => setActiveTab('itinerary')}>
                  Itinerary
                </button>
                <button className={activeTab === 'ideas' ? 'active' : ''} type="button" onClick={() => {
                  setActiveTab('ideas');
                  setIdeaAddMode(null);
                  closeDayRoute();
                  if (ideas.length === 0) loadIdeas();
                }}>
                  Ideas
                </button>
              </nav>

              {/* Itinerary tab content */}
              {activeTab === 'itinerary' ? <div className="trip-day-tabs" aria-label="Itinerary days">
                <div className="trip-day-selector">
                  <div className="trip-day-quick-list">
                    {/* Summary tab */}
                    <button
                      className={activeDayNumber === 'summary' ? 'trip-day-tab-button active' : 'trip-day-tab-button'}
                      type="button"
                      onClick={() => {
                        setActiveDayNumber('summary');
                        closeDayRoute();
                        setIsEditingDayLocation(false);
                        setIsDayMenuOpen(false);
                      }}
                    >
                      <span>Summary</span>
                      <small>{routeSummary.length} stop{routeSummary.length === 1 ? '' : 's'}</small>
                    </button>
                    {/* Visible day tabs */}
                    {visibleDayTabs.map((day) => (
                      <div className="trip-day-tab-group" key={day.dayNumber}>
                        <button
                          className={activeDayNumber === day.dayNumber ? 'trip-day-tab-button active' : 'trip-day-tab-button'}
                          type="button"
                          onClick={() => {
                            setActiveDayNumber(day.dayNumber);
                            closeDayRoute();
                            setIsEditingDayLocation(false);
                            setIsDayMenuOpen(false);
                          }}
                        >
                          <span>Day {day.dayNumber}</span>
                          <small>{formatDate(day.date)}</small>
                        </button>
                        <button
                          className={tripRoutePlan.dayNumber === day.dayNumber ? 'trip-day-route-button active' : 'trip-day-route-button'}
                          type="button"
                          onClick={() => optimizeDayRoute(day)}
                          aria-label={`Optimize route for Day ${day.dayNumber}`}
                        >
                          <Route size={15} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                    {/* More button for overflow days */}
                    {hasOverflowDayTabs ? (
                      <button
                        type="button"
                        className={isDayMenuOpen ? 'trip-day-more active' : 'trip-day-more'}
                        aria-expanded={isDayMenuOpen}
                        onClick={() => setIsDayMenuOpen((current) => !current)}
                      >
                        <span>More</span>
                        <ChevronDown size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  {/* Day dropdown menu */}
                  {hasOverflowDayTabs && isDayMenuOpen ? (
                    <div className="trip-day-menu" role="menu">
                      <button
                        className={activeDayNumber === 'summary' ? 'active' : ''}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActiveDayNumber('summary');
                          closeDayRoute();
                          setIsEditingDayLocation(false);
                          setIsDayMenuOpen(false);
                        }}
                      >
                        <span>Summary</span>
                        <small>{routeSummary.length} stop{routeSummary.length === 1 ? '' : 's'}</small>
                      </button>
                      {days.map((day) => (
                        <div className="trip-day-menu-row" key={day.dayNumber}>
                          <button
                            className={activeDayNumber === day.dayNumber ? 'active' : ''}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setActiveDayNumber(day.dayNumber);
                              closeDayRoute();
                              setIsEditingDayLocation(false);
                              setIsDayMenuOpen(false);
                            }}
                          >
                            <span>Day {day.dayNumber}</span>
                            <small>{formatDate(day.date)}{day.location?.name ? ` · ${day.location.name}` : ''}</small>
                          </button>
                          <button
                            className={tripRoutePlan.dayNumber === day.dayNumber ? 'trip-day-menu-route active' : 'trip-day-menu-route'}
                            type="button"
                            onClick={() => optimizeDayRoute(day)}
                            aria-label={`Optimize route for Day ${day.dayNumber}`}
                          >
                            <Route size={15} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div> : null}

              {/* Main content area */}
              {activeTab === 'itinerary' ? (
              <div className="trip-itinerary-workspace">
              {activeDayNumber === 'summary' ? (
                // Summary view
                <div className="trip-summary-tab">
                  <section className="trip-summary-hero" aria-label="Trip overview">
                    <div>
                      <span>Trip Overview</span>
                      <h3>{trip.title || trip.destination}</h3>
                      <p>{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</p>
                    </div>
                    <strong>{summaryTripDuration} day{summaryTripDuration === 1 ? '' : 's'}</strong>
                  </section>

                  <section className="trip-summary-metrics" aria-label="Trip summary metrics">
                    <span>
                      <CalendarDays size={16} aria-hidden="true" />
                      <small>Duration</small>
                      <strong>{summaryTripDuration} day{summaryTripDuration === 1 ? '' : 's'}</strong>
                    </span>
                    <span>
                      <MapPin size={16} aria-hidden="true" />
                      <small>Locations</small>
                      <strong>{summaryLocationsSet.size || 0}</strong>
                    </span>
                    <span>
                      <ListChecks size={16} aria-hidden="true" />
                      <small>Planned Items</small>
                      <strong>{summaryPlannedItems}</strong>
                    </span>
                    <span>
                      <WalletCards size={16} aria-hidden="true" />
                      <small>Budget Planned</small>
                      <strong>{plannedBudgetPercent}%</strong>
                    </span>
                  </section>

                  <section className="trip-summary-grid" aria-label="Planning summary">
                    <article className="trip-summary-card checklist">
                      <header>
                        <span><ListChecks size={17} aria-hidden="true" /></span>
                        <div>
                          <h3>Checklist Progress</h3>
                          <p>Your trip preparation status</p>
                        </div>
                      </header>
                      <div className="trip-summary-progress-row">
                        <div>
                          <strong>Packing list</strong>
                          <small>{packingList
                            ? `${packingProgress.completed} of ${packingProgress.total} packed`
                            : 'No list linked'}</small>
                        </div>
                        <b>{packingList ? `${packingProgressPercent}%` : '--'}</b>
                        <span><i style={{ width: `${packingProgressPercent}%` }} /></span>
                      </div>
                      <div className="trip-summary-progress-row documents">
                        <div>
                          <strong>Documents</strong>
                          <small>{travelDocument
                            ? `${documentProgress.completed} of ${documentProgress.total} uploaded`
                            : 'No checklist linked'}</small>
                        </div>
                        <b>{travelDocument ? `${documentProgressPercent}%` : '--'}</b>
                        <span><i style={{ width: `${documentProgressPercent}%` }} /></span>
                      </div>
                    </article>

                    <article className="trip-summary-card budget">
                      <header>
                        <span><WalletCards size={17} aria-hidden="true" /></span>
                        <div>
                          <h3>Budget Snapshot</h3>
                          <p>How much of the trip budget is planned</p>
                        </div>
                      </header>
                      <div className="trip-summary-budget-total">
                        <span>Total trip budget</span>
                        <strong>
                          {currency?.formatAmount
                            ? currency.formatAmount(totalBudget, tripCurrency)
                            : `${tripCurrency} ${totalBudget}`}
                        </strong>
                      </div>
                      <div className="trip-summary-budget-bar">
                        <span><i style={{ width: `${plannedBudgetPercent}%` }} /></span>
                        <div>
                          <small>
                            Planned: {currency?.formatAmount
                              ? currency.formatAmount(plannedBudget, tripCurrency)
                              : `${tripCurrency} ${plannedBudget}`}
                          </small>
                          <b>{plannedBudgetPercent}%</b>
                        </div>
                      </div>
                    </article>
                  </section>
                </div>
              ) : (
              // Day detail view
              <>
              {/* Day header */}
              {activeDay && (
                <section className="trip-day-detail-header">
                  <div>
                    <h3>{activeDay.title || `Day ${activeDay.dayNumber}`}</h3>
                    <p>{formatDate(activeDay.date)}</p>
                  </div>
                  <button
                    className={tripRoutePlan.dayNumber === activeDay.dayNumber ? 'trip-day-header-route active' : 'trip-day-header-route'}
                    type="button"
                    onClick={() => optimizeDayRoute(activeDay)}
                  >
                    <Route size={16} aria-hidden="true" />
                    Optimize day route
                  </button>
                </section>
              )}

              {activeDayScheduleIssues.length ? (
                <section className="trip-schedule-alerts" aria-label="Schedule warnings">
                  <strong>
                    <AlertTriangle size={15} aria-hidden="true" />
                    Schedule needs attention
                  </strong>
                  {activeDayScheduleIssues.slice(0, 3).map((issue) => (
                    <p key={`${issue.type}-${issue.itemId}-${issue.relatedItemId || ''}`}>{issue.message}</p>
                  ))}
                </section>
              ) : null}

              {/* Day location row */}
              {activeDay && (
                <section className="trip-day-location-row">
                  <div>
                    <MapPin size={17} aria-hidden="true" />
                    <strong>{activeDayLocationLabel}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const editableName = getEditableLocationName(activeDay.location?.name);
                      if (!editableName && activeDay.location?.name) {
                        updateDayLocal(activeDay.dayNumber, {
                          location: {
                            ...activeDay.location,
                            name: '',
                            address: '',
                            coordinates: undefined,
                          },
                        });
                      }
                      setLocationSearchText(editableName);
                      setIsEditingDayLocation((current) => !current);
                    }}
                  >
                    <Pencil size={15} aria-hidden="true" />
                    Edit location
                  </button>
                </section>
              )}

              {/* Day location edit form */}
              {activeDay && isEditingDayLocation ? (
                <section className="trip-day-location-edit">
                  <span>Day location</span>
                  <input
                    value={getEditableLocationName(activeDay.location?.name)}
                    onFocus={() => setLocationSearchText(getEditableLocationName(activeDay.location?.name))}
                    onChange={(event) => {
                      setLocationSearchText(event.target.value);
                      if (event.target.value.trim().length < 2) {
                        setLocationSearchSuggestions([]);
                      }
                      updateDayLocal(activeDay.dayNumber, {
                        location: {
                          name: event.target.value,
                          country: '',
                          address: event.target.value,
                        },
                      });
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      commitDayLocation(activeDay, event.currentTarget.value);
                    }}
                    placeholder="State, city, or popular area"
                  />
                  {visibleLocationSuggestions.length ? (
                    <div className="trip-location-suggestions" aria-label="Location suggestions">
                      {visibleLocationSuggestions.map((locationName) => (
                        <button
                          type="button"
                          key={locationName}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            const nextLocation = {
                              name: locationName,
                              country: '',
                              address: locationName,
                            };
                            const nextDay = { ...activeDay, location: nextLocation };
                            setLocationSearchText(locationName);
                            updateDayLocal(activeDay.dayNumber, { location: nextLocation });
                            resolveDayLocation(nextDay);
                          }}
                        >
                          {locationName}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {locationStatus === 'loading' ? <small>Resolving map location...</small> : null}
                </section>
              ) : null}

              {/* Weather toggle */}
              <label className="trip-weather-toggle">
                <input
                  type="checkbox"
                  checked={showWeatherHelp}
                  onChange={(event) => setShowWeatherHelp(event.target.checked)}
                />
                <span>Show weather-based advice and place ideas</span>
                <Info size={15} aria-hidden="true" />
              </label>

              {/* Budget overview section */}
              <section className="trip-budget-overview" aria-label="Budget overview">
                {/* Day budget card */}
                <div className={`trip-statistic-card trip-budget-card is-${activeDayBudgetStatus.tone}`}>
                  <div className="trip-statistic-card-header">
                    <span className="trip-statistic-card-icon"><WalletCards size={16} aria-hidden="true" /></span>
                    <div>
                      <strong>Today&apos;s budget</strong>
                      <small>Day {activeDay?.dayNumber || ''}</small>
                    </div>
                    <span className="trip-budget-status">{activeDayBudgetStatus.text}</span>
                  </div>
                  <div className="trip-statistic-card-main">
                    <div className="trip-budget-summary-value">
                      <strong>{currency?.formatAmount ? currency.formatAmount(activeDaySpend, tripCurrency) : `${tripCurrency} ${activeDaySpend}`}</strong>
                      <span>estimated spend today</span>
                    </div>
                    {activeDay ? (
                      <label className="trip-budget-input" title="Daily budget for this itinerary day. Item estimates below count against this amount.">
                        <span>Day limit</span>
                        <div>
                          <small>{tripCurrency}</small>
                          <input
                            aria-label="Daily budget"
                            type="number"
                            min="0"
                            value={getEditableMoneyValue(activeDay.budget?.amount)}
                            onChange={(event) => updateDayLocal(activeDay.dayNumber, {
                              budget: { amount: event.target.value, currency: tripCurrency },
                            })}
                            onBlur={(event) => saveDay({
                              ...activeDay,
                              budget: { amount: getSavedMoneyValue(event.target.value), currency: tripCurrency },
                            })}
                          />
                        </div>
                      </label>
                    ) : null}
                  </div>
                  <small className="trip-budget-note">
                    Day budget is your planned allowance. Place costs are editable estimates
                    {activeDaySuggestedCostCount ? `, including ${activeDaySuggestedCostCount} imported suggestion${activeDaySuggestedCostCount === 1 ? '' : 's'}` : ''}.
                  </small>
                  <span className="trip-budget-bar is-day"><em style={{ width: `${activeDaySpendPercent}%` }} /></span>
                </div>

                {/* Trip allocation card */}
                <div className={`trip-statistic-card trip-allocation-card${isTripBudgetOverAllocated ? ' is-danger' : ''}`}>
                  <div className="trip-statistic-card-header">
                    <span className="trip-statistic-card-icon"><DollarSign size={16} aria-hidden="true" /></span>
                    <div>
                      <strong>Trip budget allocation</strong>
                      <small>{plannedBudgetPercent}% assigned across itinerary days</small>
                    </div>
                    <strong className="trip-allocation-percent">{plannedBudgetPercent}%</strong>
                  </div>
                  <div className="trip-statistic-card-main">
                    <div className="trip-budget-summary-value">
                      <strong>{currency?.formatAmount ? currency.formatAmount(plannedBudget, tripCurrency) : plannedBudget}</strong>
                      <span>of {currency?.formatAmount ? currency.formatAmount(totalBudget, tripCurrency) : totalBudget}</span>
                    </div>
                    <div className="trip-budget-remaining">
                      <span>{isTripBudgetOverAllocated ? 'Over allocated' : 'Unallocated'}</span>
                      <strong>
                        {currency?.formatAmount
                          ? currency.formatAmount(isTripBudgetOverAllocated ? Math.abs(tripBudgetDelta) : remainingBudget, tripCurrency)
                          : isTripBudgetOverAllocated ? Math.abs(tripBudgetDelta) : remainingBudget}
                      </strong>
                    </div>
                  </div>
                  <span className="trip-budget-bar"><em style={{ width: `${plannedBudgetPercent}%` }} /></span>
                </div>

                {/* Weather card */}
                <div className="trip-statistic-card trip-weather-budget-card">
                  <div className="trip-statistic-card-header">
                    <span className="trip-statistic-card-icon"><WeatherModeIcon size={17} aria-hidden="true" /></span>
                    <div>
                      <strong>Weather</strong>
                      <small>{weather?.location?.name || activeDayLocationLabel}</small>
                    </div>
                  </div>
                  {weatherStatus === 'loading' ? (
                    <div className="trip-weather-loading">
                      <LoaderCircle className="trip-details-spin" size={16} aria-hidden="true" />
                      Checking day weather...
                    </div>
                  ) : weather?.available ? (
                    <>
                      <div className="trip-weather-stat">
                        <strong>{weatherTemperature || '--'}</strong>
                        <span>{weather.condition}</span>
                      </div>
                      <div className="trip-weather-metrics">
                        <span><Droplets size={13} aria-hidden="true" />{weatherRain}</span>
                        <span><Wind size={13} aria-hidden="true" />{weatherWind}</span>
                      </div>
                      <small>{weather.travelTip || weatherGuidance?.packingTips?.[0] || 'Plan with flexible indoor and outdoor options.'}</small>
                    </>
                  ) : (
                    <>
                      <div className="trip-weather-stat">
                        <strong>Weather unavailable</strong>
                      </div>
                      <small>{weather?.message || 'Set a specific day location to check weather.'}</small>
                    </>
                  )}
                </div>
              </section>

              {/* Day notes section */}
              {activeDay && (
                <section className="trip-day-notes-panel">
                  <label className="trip-day-note">
                    <span><StickyNote size={15} aria-hidden="true" /> Day notes</span>
                    <textarea
                      value={activeDay.notes || ''}
                      onChange={(event) => updateDayLocal(activeDay.dayNumber, { notes: event.target.value })}
                      onBlur={() => saveDay(activeDay)}
                      placeholder="Add reminders, backup plans, or travel notes for this day."
                    />
                  </label>
                </section>
              )}

              {/* Itinerary groups */}
              <div className="trip-itinerary-groups">
                {groupedDayItems.map((group) => {
                  const GroupIcon = group.icon;
                  const visitedItemCount = group.items.filter((item) => {
                    const payload = getItemVisitedPayload(item);
                    return visitedLookup[payload.placeKey];
                  }).length;
                  const toVisitItemCount = Math.max(0, group.items.length - visitedItemCount);

                  return (
                    <section className="trip-itinerary-group" key={group.id}>
                      <div className="trip-group-heading">
                        <span><GroupIcon size={16} aria-hidden="true" /></span>
                        <div>
                          <h3>{group.title}</h3>
                          <small>{group.description}</small>
                        </div>
                      </div>

                      <button className="trip-group-add" type="button" onClick={() => openAddSearch(group)}>
                        <Plus size={15} aria-hidden="true" />
                        Add {group.addLabel}
                      </button>
                      <button className="trip-group-collapse" type="button" aria-label={`Expand ${group.title}`}>
                        <ChevronDown size={17} aria-hidden="true" />
                      </button>

                      <div className="trip-group-saved-heading">
                        <span>Your added places</span>
                        <small>{toVisitItemCount} to visit · {visitedItemCount} visited</small>
                      </div>
                      {group.items.length === 0 ? (
                        <div className="trip-group-empty">
                          No places added yet. Use the blue Add {group.addLabel} button or choose a nearby suggestion below.
                        </div>
                      ) : null}

                      {/* Nearby suggestions */}
                      <div className="trip-group-ideas">
                        <div className="trip-group-ideas-heading">
                          <span><Sparkles size={14} aria-hidden="true" /> Nearby suggestions</span>
                          <small>
                            {dayGroupIdeaStatus === 'loading'
                              ? 'Finding places near the day location...'
                              : `Ideas near ${dayGroupIdeaSource || activeDayLocationLabel}`}
                          </small>
                        </div>
                        {dayGroupIdeaStatus === 'loading' ? (
                          <small className="trip-group-idea-message">Loading suggestions for this day.</small>
                        ) : dayGroupIdeaPreviews[group.id]?.length ? (
                          <div className="trip-group-idea-list">
                            {dayGroupIdeaPreviews[group.id].slice(0, 3).map((idea) => (
                              <article className="trip-group-idea" key={idea.id || `${group.id}-${idea.name}`}>
                                <div>
                                  <strong>{idea.name}</strong>
                                  <small>{idea.address || idea.summary || 'Suggested nearby place'}</small>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addIdeaToDay(idea, group)}
                                  disabled={isAddingIdea}
                                >
                                  <Plus size={13} aria-hidden="true" />
                                  Add
                                </button>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <small className="trip-group-idea-message">
                            No nearby ideas found yet. Try setting a more specific day location.
                          </small>
                        )}
                      </div>

                      {/* Group items */}
                      {group.items.map((item) => {
                        const itemPoint = getItemPoint(item);
                        const itemPreviewUrl = getTripPlaceImageSrc(item, itemPoint, 15);
                        const visitedPayload = getItemVisitedPayload(item);
                        const visitedRecord = visitedLookup[visitedPayload.placeKey];
                        const priceEstimateLabel = getPriceEstimateLabel(item.priceEstimate);
                        const priceSuggestionText = item.priceEstimate?.suggestionText || '';
                        const itemFacts = getItineraryItemFacts(item, currency?.selectedCurrency || tripCurrency, currency?.formatAmount);
                        const itemTimeWarning = getOpeningWarning({
                          hoursText: itemFacts.hours,
                          startTime: item.startTime,
                          endTime: item.endTime,
                        });
                        const itemScheduleWarnings = activeDayScheduleIssues
                          .filter((issue) => issue.itemId === item._id || issue.relatedItemId === item._id);

                        return (
                        <article className="trip-itinerary-item" key={item._id}>
                          {visitedRecord ? <span className="visited-place-watermark">Visited</span> : null}
                          <div
                            className="trip-item-card-main"
                            role="button"
                            tabIndex="0"
                            onClick={() => selectTripPlace({
                              ...item,
                              id: item.externalId || item._id,
                              name: item.title,
                              address: item.location?.address,
                              lat: itemPoint.lat,
                              lng: itemPoint.lng,
                              categoryId: getMapCategoryForItemType(item.type),
                            })}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                selectTripPlace({
                                  ...item,
                                  id: item.externalId || item._id,
                                  name: item.title,
                                  address: item.location?.address,
                                  lat: itemPoint.lat,
                                  lng: itemPoint.lng,
                                  categoryId: getMapCategoryForItemType(item.type),
                                });
                              }
                            }}
                          >
                            <span className="trip-itinerary-thumb">
                              {itemPreviewUrl ? <img src={itemPreviewUrl} alt="" loading="lazy" /> : <MapPin size={20} aria-hidden="true" />}
                            </span>
                            <div className="trip-item-card-copy">
                              <div className="trip-item-title-row">
                                <strong>{item.title}</strong>
                                <div className="trip-item-header-actions">
                                  <VisitedPlaceControl
                                    compact
                                    payload={visitedPayload}
                                    visitedRecord={visitedRecord}
                                    onVisitedChange={handleVisitedChange}
                                  />
                                  <button
                                    className="trip-item-remove"
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      removeItem(item._id);
                                    }}
                                    aria-label={`Remove ${item.title}`}
                                  >
                                    <Trash2 size={15} aria-hidden="true" />
                                  </button>
                                </div>
                              </div>
                              <p><MapPin size={13} aria-hidden="true" />{item.location?.address || item.description || 'Location details unavailable'}</p>
                              <div className="trip-item-mini-meta">
                                <span><Clock3 size={12} aria-hidden="true" />{item.startTime || item.endTime ? [item.startTime, item.endTime].filter(Boolean).join(' - ') : 'Flexible'}</span>
                                <span><DollarSign size={12} aria-hidden="true" />{currency?.formatAmount ? currency.formatAmount(item.priceEstimate?.amount || 0, tripCurrency) : `${item.priceEstimate?.amount || 0} ${tripCurrency}`}</span>
                              </div>
                              <div className="trip-item-fact-grid" aria-label={`${item.title} details`}>
                                <div>
                                  <span>Working hours</span>
                                  <strong className={`trip-opening-status is-${getOpeningStatusTone(itemFacts.hours)}`}>
                                    <Clock3 size={13} aria-hidden="true" />
                                    {itemFacts.hours}
                                  </strong>
                                </div>
                                <div>
                                  <span>Rating</span>
                                  <strong><Star size={13} aria-hidden="true" />{itemFacts.rating}</strong>
                                  {itemFacts.reviews ? <small>{itemFacts.reviews}</small> : null}
                                </div>
                                <div>
                                  <span>Estimated price</span>
                                  <strong><DollarSign size={13} aria-hidden="true" />{itemFacts.originalPrice}</strong>
                                  <small>{itemFacts.priceTone}</small>
                                </div>
                                <div>
                                  <span>Converted price</span>
                                  <strong><DollarSign size={13} aria-hidden="true" />{itemFacts.convertedPrice}</strong>
                                  <small>{currency?.selectedCurrency || tripCurrency}</small>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="trip-item-controls">
                            <label>
                              <span>From</span>
                              <input
                                type="time"
                                value={item.startTime || ''}
                                onChange={(event) => updateItemTimeLocal(item, 'startTime', event.target.value)}
                                onBlur={(event) => saveItemTime(item._id, { startTime: event.target.value })}
                              />
                            </label>
                            <label>
                              <span>To</span>
                              <input
                                type="time"
                                value={item.endTime || ''}
                                onChange={(event) => updateItemTimeLocal(item, 'endTime', event.target.value)}
                                onBlur={(event) => saveItemTime(item._id, { endTime: event.target.value })}
                              />
                            </label>
                            <label className="trip-item-cost-control">
                              <span>Planned cost</span>
                              <input
                                type="number"
                                min="0"
                                value={getEditableMoneyValue(item.priceEstimate?.amount)}
                                onChange={(event) => updateItemPriceLocal(item, event.target.value)}
                                onBlur={() => saveItemPrice(item._id)}
                              />
                              <small>
                                {priceEstimateLabel}
                                {priceSuggestionText ? ` Suggested price: ${priceSuggestionText}` : ''}
                              </small>
                            </label>
                          </div>
                          {itemTimeWarning ? (
                            <p className="trip-opening-warning">
                              <AlertTriangle size={14} aria-hidden="true" />
                              {itemTimeWarning}
                            </p>
                          ) : null}
                          {itemScheduleWarnings.map((issue) => (
                            <p className="trip-opening-warning" key={`${issue.type}-${issue.itemId}-${issue.relatedItemId || ''}`}>
                              <AlertTriangle size={14} aria-hidden="true" />
                              {issue.message}
                            </p>
                          ))}
                        </article>
                        );
                      })}
                    </section>
                  );
                })}
              </div>
              </>
              )}
            </div>
              ) : (
            // Ideas tab content
            <div className={ideaAddMode ? 'trip-ideas-workspace has-add-context' : 'trip-ideas-workspace'}>
              {ideaAddMode ? (
                <div className="trip-ideas-add-context">
                  <div>
                    <span>Add to Day {activeDay?.dayNumber || 1}</span>
                    <strong>{ideaAddMode.title}</strong>
                  </div>
                  <button type="button" onClick={() => setIdeaAddMode(null)} aria-label="Exit add mode">
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
              <form className="trip-idea-search" onSubmit={handleIdeaSearch}>
                <input
                  value={ideaSearch}
                  onChange={(event) => setIdeaSearch(event.target.value)}
                  placeholder={`Search real places near ${recommendationLocation || trip.destination || 'this destination'}`}
                />
                <button type="submit" aria-label="Search places">
                  <Search size={16} aria-hidden="true" />
                </button>
              </form>

              {showWeatherHelp && weather?.available && activeWeatherIdeaProfile ? (
                <section className="trip-weather-helper" aria-label="Weather-aware recommendations">
                  <div className="trip-weather-helper-heading">
                    <span><WeatherModeIcon size={16} aria-hidden="true" /></span>
                    <div>
                      <strong>{activeWeatherIdeaProfile.label} recommendations</strong>
                      <small>{weatherGuidance?.placeTips?.[0] || weather.travelTip || 'Places are ranked for today weather.'}</small>
                    </div>
                    <button className="trip-weather-hide" type="button" onClick={() => setShowWeatherHelp(false)}>
                      Default
                    </button>
                  </div>
                  <div className="trip-weather-shortcuts" aria-label="Weather-aware place categories">
                    {weatherRecommendedCategories.map((category) => {
                      const CategoryIcon = category.icon;
                      return (
                        <button
                          type="button"
                          key={category.id}
                          onClick={() => {
                            if (ideaAddMode) {
                              setIdeaAddMode(itineraryGroups.find((group) => group.categoryId === category.id) || null);
                            }
                            loadIdeas(category.id, '');
                          }}
                        >
                          <CategoryIcon size={13} aria-hidden="true" />
                          {category.label}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <div className="trip-idea-filters" aria-label="Idea categories">
                {ideaCategories.map((category) => {
                  const CategoryIcon = category.icon;

                  return (
                    <button
                      className={ideaCategory === category.id ? 'active' : ''}
                      type="button"
                      key={category.id}
                      onClick={() => {
                        if (ideaAddMode) {
                          setIdeaAddMode(itineraryGroups.find((group) => group.categoryId === category.id) || null);
                        }
                        loadIdeas(category.id, ideaSearch);
                      }}
                    >
                      <CategoryIcon size={15} aria-hidden="true" />
                      {category.label}
                    </button>
                  );
                })}
              </div>

              {ideaStatus === 'loading' ? (
                <p className="settings-empty"><LoaderCircle className="trip-details-spin" size={16} aria-hidden="true" /> Loading ideas...</p>
              ) : ideas.length === 0 ? (
                <div className="trip-add-empty">
                  <Search size={24} aria-hidden="true" />
                  <h3>No places found</h3>
                  <p>Try another category or search for a more specific city, state, or area.</p>
                </div>
              ) : (
                <div className="trip-idea-list">
                  {ideas.map((idea) => {
                    const visitedPayload = getIdeaVisitedPayload(idea);
                    const visitedRecord = visitedLookup[visitedPayload.placeKey];
                    const ideaImageSrc = getTripPlaceImageSrc(idea);

                    return (
                      <button
                        className={selectedIdea?.id === idea.id ? 'trip-idea-result is-active' : 'trip-idea-result'}
                        key={idea.id}
                        type="button"
                        onClick={() => selectIdea(idea)}
                      >
                        {visitedRecord ? <span className="visited-place-watermark">Visited</span> : null}
                        <div className="trip-idea-card-main">
                          <span className="trip-idea-thumb">
                            {ideaImageSrc
                              ? <img src={ideaImageSrc} alt="" loading="lazy" />
                              : <Lightbulb size={20} aria-hidden="true" />}
                          </span>
                          <div>
                            <span className="trip-idea-type">{ideaCategory}</span>
                            <strong>{idea.name}</strong>
                            <p>{idea.address || idea.displayName || idea.summary || 'Suggested place near this trip.'}</p>
                          </div>
                        </div>
                        <div className="trip-idea-meta">
                          {idea.weatherReason ? <span className="trip-weather-match"><WeatherModeIcon size={12} aria-hidden="true" />{idea.weatherReason}</span> : null}
                          <span><Star size={12} aria-hidden="true" />{idea.rating && idea.rating !== 'N/A' ? `${Number(idea.rating).toFixed(1)} rating` : 'No rating yet'}</span>
                          {idea.reviews ? <span>{Number(idea.reviews) ? `${Number(idea.reviews).toLocaleString()} reviews` : idea.reviews}</span> : null}
                          <span><Clock3 size={12} aria-hidden="true" />{idea.openState || idea.hours || 'Hours unavailable'}</span>
                          <span><DollarSign size={12} aria-hidden="true" />{idea.price || 'Price unavailable'}</span>
                          {idea.fallback && <span>Planning placeholder</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
              )}

              {/* AI assistant bar */}
              <div className="trip-panel-footer">
                <button className="trip-assistant-bar" type="button" onClick={() => setIsAiAssistantOpen(true)}>
                  <Sparkles size={16} aria-hidden="true" />
                  Ask AI Assistance
                </button>
              </div>
            </>
          )}
        </aside>

        {/* Panel resizer */}
        <div
          className="trip-panel-resizer"
          role="separator"
          aria-label="Resize trip planner panel"
          aria-orientation="vertical"
          tabIndex="0"
          onPointerDown={startPanelResize}
        />

        {/* Map area */}
        <main className="trip-details-map-area">
          {/* Map toolbar */}
          {!isDayRouteOpen ? <div className="trip-details-map-toolbar">
            {ideaCategories.map((category) => {
              const CategoryIcon = category.icon;

              return (
                <button type="button" key={category.id} onClick={() => {
                  setActiveTab('ideas');
                  if (ideaAddMode) {
                    setIdeaAddMode(itineraryGroups.find((group) => group.categoryId === category.id) || null);
                  }
                  loadIdeas(category.id, ideaSearch);
                }}>
                  <CategoryIcon size={15} aria-hidden="true" />
                  {category.label}
                </button>
              );
            })}
          </div> : (
            <div className="trip-details-map-toolbar trip-route-map-toolbar">
              <span><Navigation size={15} aria-hidden="true" /> Day {tripRoutePlan.dayNumber} optimized route</span>
            </div>
          )}

          {/* Route mode selector */}
          {isDayRouteOpen ? (
            <div className="trip-day-route-modes" aria-label="Travel mode times">
              {routeModes.map((mode) => {
                const ModeIcon = mode.icon;
                const modeRoute = tripRoutePlan.results[mode.id];

                return (
                  <button
                    className={tripRoutePlan.selectedMode === mode.id ? 'active' : ''}
                    type="button"
                    key={mode.id}
                    onClick={() => selectDayRouteMode(mode.id)}
                    disabled={tripRoutePlan.status === 'loading' || !modeRoute}
                  >
                    <ModeIcon size={16} aria-hidden="true" />
                    <span>{mode.label}</span>
                    <strong>{tripRoutePlan.status === 'loading' ? '...' : formatRouteDuration(modeRoute?.durationSeconds)}</strong>
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Map component */}
          <TripMapPreview
            center={selectedIdea ? [selectedIdea.lat, selectedIdea.lng] : activeDayMapCenter || undefined}
            className="trip-details-map"
            focusCenter={Boolean(selectedIdea)}
            focusOffset={selectedIdea ? [170, 0] : [0, 0]}
            highlightedPlace={selectedIdea}
            onPlaceClick={selectTripPlace}
            places={isAiAssistantOpen && selectedIdea ? aiMapPlaces : isDayRouteOpen ? tripRouteMapPlaces : aiMapPlaces}
            route={isDayRouteOpen ? selectedTripRoute : null}
            scrollWheelZoom
            showZoomControl
            zoom={isAiAssistantOpen && selectedIdea ? 17 : activeDayNumber !== 'summary' ? 10 : undefined}
          />

          {/* Place detail panel */}
          {selectedIdea ? (
            <aside className="trip-place-detail-panel" aria-label={`${selectedIdea.name} details`}>
              {visitedLookup[getIdeaVisitedPayload(selectedIdea).placeKey] ? <span className="visited-place-watermark">Visited</span> : null}
              <button className="trip-place-detail-close" type="button" onClick={() => setSelectedIdea(null)} aria-label="Close place details">
                <X size={18} aria-hidden="true" />
              </button>
              {selectedIdeaImageSrc ? (
                <img className="trip-place-detail-image" src={selectedIdeaImageSrc} alt="" loading="lazy" />
              ) : (
                <div className="trip-place-detail-image trip-place-detail-empty">
                  <Image size={26} aria-hidden="true" />
                </div>
              )}
              <div className="trip-place-detail-body">
                <span className="trip-idea-type">{selectedIdea.categoryId || ideaCategory}</span>
                <h3>{selectedIdea.name}</h3>
                {ideaDetailStatus === 'loading' ? (
                  <p className="trip-place-loading"><LoaderCircle className="trip-details-spin" size={14} aria-hidden="true" /> Loading richer place details...</p>
                ) : null}
                <div className="trip-place-rating">
                  <Star size={15} aria-hidden="true" />
                  <strong>{selectedIdea.rating && selectedIdea.rating !== 'N/A' ? `${Number(selectedIdea.rating).toFixed(1)} stars` : 'No rating'}</strong>
                  {selectedIdea.reviews ? <span>{Number(selectedIdea.reviews) ? `${Number(selectedIdea.reviews).toLocaleString()} reviews` : selectedIdea.reviews}</span> : null}
                </div>
                <p>{selectedIdea.summary || selectedIdea.address || selectedIdea.displayName || 'Map place result for this trip.'}</p>
                <dl className="trip-place-facts">
                  <div>
                    <dt><Clock3 size={14} aria-hidden="true" /> Working hours</dt>
                    <dd>{selectedIdeaHours || 'Hours unavailable'}</dd>
                  </div>
                  <div>
                    <dt><DollarSign size={14} aria-hidden="true" /> Price</dt>
                    <dd>
                      {selectedIdeaPriceText || 'Price unavailable'}
                      {getPlacePriceSuggestionText(selectedIdea) ? <small>Suggestion only. You can edit the estimate after adding.</small> : null}
                    </dd>
                  </div>
                  <div>
                    <dt><Star size={14} aria-hidden="true" /> Rating</dt>
                    <dd>
                      {selectedIdea.rating && selectedIdea.rating !== 'N/A' ? `${Number(selectedIdea.rating).toFixed(1)} stars` : 'No rating'}
                      {selectedIdea.reviews ? <small>{Number(selectedIdea.reviews) ? `${Number(selectedIdea.reviews).toLocaleString()} reviews` : selectedIdea.reviews}</small> : null}
                    </dd>
                  </div>
                  {selectedIdeaTimeText ? (
                    <div>
                      <dt><CalendarDays size={14} aria-hidden="true" /> Planned time</dt>
                      <dd>{selectedIdeaTimeText}</dd>
                    </div>
                  ) : null}
                  {selectedIdeaPhone ? (
                    <div>
                      <dt><Info size={14} aria-hidden="true" /> Contact</dt>
                      <dd>{selectedIdeaPhone}</dd>
                    </div>
                  ) : null}
                  {selectedIdeaWebsite ? (
                    <div>
                      <dt><StickyNote size={14} aria-hidden="true" /> Website</dt>
                      <dd>
                        <a href={selectedIdeaWebsite} target="_blank" rel="noreferrer">
                          {selectedIdeaWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt><MapPin size={14} aria-hidden="true" /> Address</dt>
                    <dd>{selectedIdea.address || selectedIdea.displayName || 'Address unavailable'}</dd>
                  </div>
                </dl>
              </div>
              <div className="trip-place-actions">
                {selectedPlaceSource !== 'itinerary' ? <div className="trip-place-time-grid">
                  <label>
                    <span>From</span>
                    <input
                      type="time"
                      value={selectedIdeaSchedule.startTime}
                      onChange={(event) => setSelectedIdeaSchedule((current) => ({ ...current, startTime: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>To</span>
                    <input
                      type="time"
                      value={selectedIdeaSchedule.endTime}
                      onChange={(event) => setSelectedIdeaSchedule((current) => ({ ...current, endTime: event.target.value }))}
                    />
                  </label>
                  <small>Leave time blank to add as a flexible stop.</small>
                </div> : null}
                {selectedPlaceSource !== 'itinerary' && selectedIdeaWarning ? (
                  <p className="trip-opening-warning">
                    <AlertTriangle size={14} aria-hidden="true" />
                    {selectedIdeaWarning}
                  </p>
                ) : null}
                <VisitedPlaceControl
                  payload={getIdeaVisitedPayload(selectedIdea)}
                  visitedRecord={visitedLookup[getIdeaVisitedPayload(selectedIdea).placeKey]}
                  onVisitedChange={handleVisitedChange}
                />
                {selectedPlaceSource !== 'itinerary' ? <button type="button" onClick={() => addIdeaToDay(selectedIdea)} disabled={isAddingIdea || selectedIdea.fallback || hasInvalidSelectedIdeaTime}>
                  {isAddingIdea ? <LoaderCircle className="trip-details-spin" size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                  {isAddingIdea ? 'Adding...' : 'Add to itinerary'}
                </button> : null}
                {selectedPlaceSource !== 'itinerary' && selectedIdea.fallback ? <small>Choose a real place result before adding.</small> : null}
              </div>
            </aside>
          ) : null}

          {/* Day route panel */}
          {isDayRouteOpen ? (
            <aside className="trip-day-route-panel" aria-label={`Day ${tripRoutePlan.dayNumber} route order`}>
              <header>
                <div>
                  <span><Route size={14} aria-hidden="true" /> Day {tripRoutePlan.dayNumber}</span>
                  <h3>Recommended stop order</h3>
                </div>
                <button type="button" onClick={closeDayRoute} aria-label="Close day route">
                  <X size={17} aria-hidden="true" />
                </button>
              </header>
              {tripRoutePlan.status === 'loading' ? (
                <p className="trip-day-route-state"><LoaderCircle className="trip-details-spin" size={17} aria-hidden="true" /> Comparing all travel modes...</p>
              ) : tripRoutePlan.status === 'error' ? (
                <p className="trip-day-route-state is-error">{tripRoutePlan.message}</p>
              ) : (
                <>
                  <div className="trip-day-route-summary">
                    <strong>{routeModes.find((mode) => mode.id === tripRoutePlan.selectedMode)?.label}</strong>
                    <span>{formatRouteDuration(selectedTripRoute?.durationSeconds)} · {formatRouteDistance(selectedTripRoute?.distanceMeters)}</span>
                  </div>
                  {tripRoutePlan.scheduleIssues?.length ? (
                    <div className="trip-route-conflicts" aria-label="Route schedule warnings">
                      {tripRoutePlan.scheduleIssues.map((issue) => (
                        <p key={`${issue.type}-${issue.itemId}-${issue.relatedItemId || ''}`}>
                          <AlertTriangle size={14} aria-hidden="true" />
                          {issue.message}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  <ol className="trip-day-route-order">
                    {tripRouteMapPlaces.map((place, index) => (
                      <li
                        key={place.id || `${place.title}-${index}`}
                        role="button"
                        tabIndex="0"
                        onClick={() => selectTripPlace(place)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            selectTripPlace(place);
                          }
                        }}
                      >
                        <span>{index + 1}</span>
                        <div>
                          <strong>{place.title || place.name || `Stop ${index + 1}`}</strong>
                          <small>
                            {place.startTime
                              ? `${place.startTime}${place.endTime ? ` - ${place.endTime}` : ''} - locked time`
                              : place.suggestedStartTime
                                ? `${place.suggestedStartTime} - ${place.suggestedEndTime} - suggested time`
                                : 'Flexible stop'}
                            {' - '}
                            {index === 0 ? 'Go here first' : index === tripRouteMapPlaces.length - 1 ? 'Final stop' : `Then continue to stop ${index + 1}`}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ol>
                  {tripRoutePlan.message ? <p className="trip-day-route-note">{tripRoutePlan.message}</p> : null}
                </>
              )}
            </aside>
          ) : null}
        </main>
      </div>
    </section>
  );
}

export default TripDetailsPage;
