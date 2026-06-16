/**
 * Trips module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import { useContext, useEffect, useMemo, useState } from 'react';
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
import { getTripAiRecommendations } from '../../api/aiAssistantApi';
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
import './TripDetailsPage.css';

const ideaCategories = [
  { id: 'attractions', label: 'Attractions', icon: Landmark },
  { id: 'food', label: 'Food', icon: Utensils },
  { id: 'hotels', label: 'Hotels', icon: BedDouble },
  { id: 'train', label: 'Transport', icon: TrainFront },
  { id: 'shopping', label: 'Shopping', icon: Lightbulb },
];
const routeModes = [
  { id: 'car', label: 'Car', icon: Car },
  { id: 'walking', label: 'Walk', icon: Footprints },
  { id: 'bike', label: 'Bike', icon: Bike },
];
const formatRouteDuration = (seconds) => {
  if (!Number.isFinite(Number(seconds))) return '--';
  const minutes = Math.max(1, Math.round(Number(seconds) / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} hr${hours === 1 ? '' : 's'}${remainingMinutes ? ` ${remainingMinutes} min` : ''}`;
};
const formatRouteDistance = (meters) => {
  if (!Number.isFinite(Number(meters))) return '--';
  return Number(meters) < 1000
    ? `${Math.round(Number(meters))} m`
    : `${(Number(meters) / 1000).toFixed(1)} km`;
};
const weatherModeIcons = {
  rainy: Umbrella,
  sunny: Sun,
  cold: Building2,
  comfortable: CloudSun,
  default: CloudSun,
};
const emptyLocationLabels = new Set([
  'not added yet',
  'set a day location',
  'set day location',
  'day location',
  'current location',
]);
const getEditableLocationName = (value) => {
  const locationName = String(value || '').trim();
  return emptyLocationLabels.has(locationName.toLowerCase()) ? '' : locationName;
};

const itineraryGroups = [
  { id: 'food', title: 'Food & dining', description: 'Restaurants, cafes, and local food', addLabel: 'Food', categoryId: 'food', types: ['restaurant'], icon: Utensils },
  { id: 'see', title: 'Attractions & activities', description: 'Places to visit and things to do', addLabel: 'Attractions', categoryId: 'attractions', types: ['attraction', 'custom'], icon: Landmark },
  { id: 'stay', title: 'Accommodation', description: 'Hotels and places to stay', addLabel: 'Stay', categoryId: 'hotels', types: ['hotel'], icon: BedDouble },
  { id: 'move', title: 'Transportation', description: 'Stations, airports, and travel connections', addLabel: 'Transportation', categoryId: 'train', types: ['transport', 'flight'], icon: TrainFront },
];
const categoryTextSearchTerms = {
  food: ['restaurants', 'cafes', 'food courts'],
  attractions: ['attractions', 'things to do', 'museums', 'landmarks', 'parks'],
  hotels: ['hotels', 'places to stay', 'resorts', 'hostels', 'guest houses'],
  train: ['train stations', 'railway stations', 'bus stations', 'transport hubs', 'airports'],
};
const getPlaceAddress = (place) => place.address || place.displayName || 'Location details unavailable';
const getUniquePlaces = (places = []) => {
  const uniquePlaces = new Map();

  places.forEach((place) => {
    const key = place.id || `${place.name}-${place.displayName || place.address}`;
    if (key && !uniquePlaces.has(key)) uniquePlaces.set(key, place);
  });

  return [...uniquePlaces.values()];
};
// Format Idea Place converts raw values into readable display text.
const formatIdeaPlace = (place, categoryId) => ({
  ...place,
  lat: Number(place.lat ?? place.coordinates?.latitude),
  lng: Number(place.lng ?? place.coordinates?.longitude),
  categoryId,
  address: getPlaceAddress(place),
  imageUrl: place.imageUrl || place.imageUrls?.[0] || '',
  imageUrls: place.imageUrls || (place.imageUrl ? [place.imageUrl] : []),
  hours: place.hours || place.hoursSummary || place.openState || 'Hours unavailable',
  rating: place.rating || 'N/A',
  reviews: place.reviews || place.reviewCount || '',
  price: place.price || place.priceDetail?.display || 'Price unavailable',
  openState: place.openState || '',
  summary: place.summary || place.category || 'Place result from map data.',
  type: 'idea',
});
// Format Date converts raw values into readable display text.
const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : 'No date');
// Format Input Date converts raw values into readable display text.
const formatInputDate = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '');
const getItemsForDay = (items, day) =>
  items.filter((item) => formatInputDate(item.scheduledDate) === formatInputDate(day.date));
const getIdeaItemType = (category) => {
  if (category === 'food') return 'restaurant';
  if (category === 'hotels') return 'hotel';
  return 'attraction';
};
const parseTimeToMinutes = (time) => {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};
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
      open: 0,
      close: parseHourTextToMinutes(closesMatch[1]),
    };
  }

  return null;
};
const getOpeningWarning = ({ hoursText, startTime, endTime }) => {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (start === null || end === null) return '';
  if (end <= start) return 'End time should be later than start time.';
  if (/closed/i.test(String(hoursText || ''))) return 'This place appears closed during the selected time.';

  const openingWindow = getOpeningWindow(hoursText);
  if (!openingWindow || openingWindow.open === null || openingWindow.close === null) {
    return hoursText ? '' : 'Opening hours unavailable. Please confirm before adding.';
  }

  if (start < openingWindow.open || end > openingWindow.close) {
    return 'Selected time may be outside this place opening hours.';
  }

  return '';
};
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
const getItemPoint = (item) => ({
  lat: item.location?.coordinates?.coordinates?.[1],
  lng: item.location?.coordinates?.coordinates?.[0],
});
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
const getDayLocationQuery = (day, trip) => {
  const locationName = getEditableLocationName(day?.location?.name);
  const isCountryName = Country.getAllCountries().some((country) => country.name.toLowerCase() === locationName.toLowerCase());
  const dayLocation = isCountryName
    ? locationName
    : [locationName, day?.location?.country].filter(Boolean).join(', ');
  if (dayLocation) return dayLocation;

  return getRecommendationLocation(trip, day);
};
const getDayLocationCenter = (day) => {
  const latitude = Number(day?.location?.coordinates?.latitude);
  const longitude = Number(day?.location?.coordinates?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : null;
};
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
const searchCategoryPlacesByText = async (category, locationQuery, options = {}) => {
  const searchTerms = categoryTextSearchTerms[category] || [category];
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
const getMapCategoryForItemType = (type) => {
  if (type === 'restaurant') return 'food';
  if (type === 'hotel') return 'hotels';
  if (type === 'transport' || type === 'flight') return 'train';
  return 'attractions';
};
const searchProviderCategoryPlaces = async (category, center, locationQuery, options = {}) => {
  if (!center) return [];

  const result = await searchMapCategoryPlaces(category, center, {
    destination: locationQuery,
    limit: options.limit || 12,
    signal: options.signal,
  });

  return result.items || [];
};
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
const getChecklistProgress = (items = [], isDone) => {
  const completed = items.filter(isDone).length;
  return { completed, total: items.length };
};
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
// TripDetailsPage renders the main screen and handles nearby interactions.
function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currency = useContext(CurrencyContext);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [activeDayNumber, setActiveDayNumber] = useState('summary');
  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [items, setItems] = useState([]);
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weatherGuidance, setWeatherGuidance] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState('idle');
  const [showWeatherHelp, setShowWeatherHelp] = useState(true);
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
  const [status, setStatus] = useState('loading');
  const [ideaStatus, setIdeaStatus] = useState('idle');
  const [ideaDetailStatus, setIdeaDetailStatus] = useState('idle');
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [selectedPlaceSource, setSelectedPlaceSource] = useState('');
  const [ideaSearch, setIdeaSearch] = useState('');
  const [addMode, setAddMode] = useState(null);
  const [ideaAddMode, setIdeaAddMode] = useState(null);
  const [message, setMessage] = useState('');
  const [panelWidth, setPanelWidth] = useState(460);
  const [isAddingIdea, setIsAddingIdea] = useState(false);
  const [selectedIdeaSchedule, setSelectedIdeaSchedule] = useState({ startTime: '09:00', endTime: '10:00' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tripSettingsForm, setTripSettingsForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
  });
  const [tripSettingsStatus, setTripSettingsStatus] = useState('idle');
  const [tripSettingsError, setTripSettingsError] = useState('');
  const [packingList, setPackingList] = useState(null);
  const [travelDocument, setTravelDocument] = useState(null);
  const [toolsStatus, setToolsStatus] = useState('idle');
  const [toolsMessage, setToolsMessage] = useState('');
  const [locationStatus, setLocationStatus] = useState('idle');
  const [isEditingDayLocation, setIsEditingDayLocation] = useState(false);
  const [isDayMenuOpen, setIsDayMenuOpen] = useState(false);
  const [locationSearchText, setLocationSearchText] = useState('');
  const [locationSearchSuggestions, setLocationSearchSuggestions] = useState([]);
  const [editedLocationMapCenter, setEditedLocationMapCenter] = useState(null);
  const [dayGroupIdeaPreviews, setDayGroupIdeaPreviews] = useState({});
  const [dayGroupIdeaStatus, setDayGroupIdeaStatus] = useState('idle');
  const [dayGroupIdeaSource, setDayGroupIdeaSource] = useState('');
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([]);
  const [aiStatus, setAiStatus] = useState('idle');
  const [aiError, setAiError] = useState('');
  const updateDayLocal = (dayNumber, patch) => {
    setDays((currentDays) =>
      currentDays.map((day) => (day.dayNumber === dayNumber ? { ...day, ...patch } : day))
    );
  };
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
  const activeDay = useMemo(
    () => days.find((day) => day.dayNumber === activeDayNumber) || days[0],
    [activeDayNumber, days]
  );
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

  const activeDayItems = useMemo(() => getItemsForDay(items, activeDay || {}), [activeDay, items]);
  const visitedLookup = useMemo(() => buildVisitedLookup(visitedPlaces), [visitedPlaces]);
  const groupedDayItems = useMemo(() => itineraryGroups.map((group) => ({
    ...group,
    items: activeDayItems.filter((item) => group.types.includes(item.type)),
  })), [activeDayItems]);
  const plannedBudget = days.reduce((total, day) => total + Number(day.budget?.amount || 0), 0);
  const tripCurrency = trip?.budget?.currency || currency?.selectedCurrency || 'MYR';
  const activeDayBudget = Number(activeDay?.budget?.amount || 0);
  const activeDaySpend = activeDayItems.reduce((total, item) => total + Number(item.priceEstimate?.amount || 0), 0);
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
  const remainingBudget = Math.max(0, totalBudget - plannedBudget);
  const plannedBudgetPercent = totalBudget ? Math.min(100, Math.round((plannedBudget / totalBudget) * 100)) : 0;
  const activeDaySpendPercent = activeDayBudget ? Math.min(100, Math.round((activeDaySpend / activeDayBudget) * 100)) : 0;
  const AddModeIcon = addMode?.icon || Plus;
  const recommendationLocation = getRecommendationLocation(trip, activeDay);
  const selectedIdeaHours = selectedIdea?.openState || selectedIdea?.hours || '';
  const selectedIdeaWarning = selectedIdea
    ? getOpeningWarning({ hoursText: selectedIdeaHours, ...selectedIdeaSchedule })
    : '';
  const hasInvalidSelectedIdeaTime = selectedIdeaWarning.startsWith('End time');
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
  const packingProgress = getChecklistProgress(packingList?.items || [], (item) => item.isPacked);
  const documentProgress = getChecklistProgress(travelDocument?.items || [], (item) => item.files?.length);
  const packingProgressPercent = packingProgress.total
    ? Math.round((packingProgress.completed / packingProgress.total) * 100)
    : 0;
  const documentProgressPercent = documentProgress.total
    ? Math.round((documentProgress.completed / documentProgress.total) * 100)
    : 0;
  const summaryTripDuration = days.length || trip?.durationDays || 0;
  const summaryLocationsSet = new Set(
    days
      .map((day) => getEditableLocationName(day.location?.name))
      .filter(Boolean)
  );
  const summaryPlannedItems = items.length;
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
        const results = getUniquePlaces([...combinedResults, ...textResults]).slice(0, 3);

        return [
          group.id,
          results.map((idea) => formatIdeaPlace({
            ...idea,
            summary: idea.displayName || `${group.addLabel} near ${sourceLabel}`,
          }, group.categoryId)),
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
  }, [activeDay, activeDayNumber, activeTab, recommendationLocation, trip]);
  const handleVisitedChange = (visitedPlace) => {
    if (!visitedPlace?.placeKey) return;
    setVisitedPlaces((currentPlaces) => {
      const withoutCurrent = currentPlaces.filter((place) => place.placeKey !== visitedPlace.placeKey);
      return [visitedPlace, ...withoutCurrent];
    });
  };
  const getIdeaVisitedPayload = (idea) => getVisitedPlacePayload({
    item: idea,
    type: getIdeaItemType(idea?.categoryId || ideaCategory),
    source: 'trip-ideas',
    defaultDate: activeDay?.date || trip?.startDate,
    tripId: trip?._id,
  });
  const getItemVisitedPayload = (item) => getVisitedPlacePayload({
    item,
    type: item?.type || 'location',
    source: 'trip-itinerary',
    defaultDate: item?.scheduledDate || activeDay?.date || trip?.startDate,
    tripId: trip?._id,
    itineraryItemId: item?._id,
  });

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

  const updateTripBudget = async (amount) => {
    const response = await updateTrip(id, {
      budget: {
        ...trip.budget,
        totalAmount: Number(amount) || 0,
        currency: tripCurrency,
      },
    });
    const savedTrip = response.data?.data?.trip;
    if (savedTrip) setTrip(savedTrip);
  };

  const openTravelTool = (path, recordId) => {
    const params = new URLSearchParams({ tripId: id });
    if (recordId) params.set('recordId', recordId);
    setSettingsOpen(false);
    navigate(`${path}?${params.toString()}`);
  };
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

  const updateItemPriceLocal = (item, amount) => {
    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem._id === item._id
          ? { ...currentItem, priceEstimate: { amount: Number(amount) || 0, currency: tripCurrency } }
          : currentItem
      )
    );
  };

  const saveItemPrice = async (itemId) => {
    const item = items.find((currentItem) => currentItem._id === itemId);
    await updateItineraryItem(itemId, {
      priceEstimate: {
        amount: Number(item?.priceEstimate?.amount || 0),
        currency: item?.priceEstimate?.currency || tripCurrency,
      },
    });
  };

  const updateItemTimeLocal = (item, field, value) => {
    setItems((currentItems) =>
      currentItems.map((currentItem) => (currentItem._id === item._id ? { ...currentItem, [field]: value } : currentItem))
    );
  };

  const saveItemTime = async (itemId) => {
    const item = items.find((currentItem) => currentItem._id === itemId);
    await updateItineraryItem(itemId, {
      startTime: item?.startTime || '',
      endTime: item?.endTime || '',
    });
  };

  const removeItem = async (itemId) => {
    await deleteItineraryItem(itemId);
    setItems((currentItems) => currentItems.filter((item) => item._id !== itemId));
  };

  const loadIdeas = async (category = ideaCategory, searchTerm = ideaSearch) => {
    if (!trip) return;
    setIdeaStatus('loading');
    setIdeaCategory(category);
    setSelectedIdea(null);

    try {
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
        searchExploreCategoryPlaces(category, locationQuery, { limit: 12 }).catch(() => []),
        searchProviderCategoryPlaces(category, center, locationQuery, { limit: 12 }).catch(() => []),
        center
          ? searchOpenStreetMapCategoryPlaces(category, center, { limit: 12, radius: 0.35 }).catch(() => [])
          : Promise.resolve([]),
      ]);
      const combinedResults = getUniquePlaces([...exploreResults, ...providerResults, ...mapResults]);
      const textResults = combinedResults.length >= 6
        ? []
        : await searchCategoryPlacesByText(category, locationQuery, {
        limit: 12,
        limitPerTerm: 4,
      }).catch(() => []);
      const results = getUniquePlaces([...combinedResults, ...textResults]).slice(0, 12);
      const nextIdeas = results.map((idea) => formatIdeaPlace({
        ...idea,
        summary: idea.displayName || `${category} near ${locationQuery}`,
      }, category));
      setIdeas(nextIdeas);
      setSelectedIdea(null);
      setIdeaStatus('success');
    } catch {
      setIdeas([]);
      setSelectedIdea(null);
      setIdeaStatus('fallback');
    }
  };

  const openAddSearch = (group) => {
    setActiveTab('ideas');
    setIdeaAddMode(group);
    setAddMode(null);
    closeDayRoute();
    setIdeaSearch('');
    loadIdeas(group.categoryId, '');
  };

  const optimizeDayRoute = async (day) => {
    const dayPoints = mapPlaces.filter((place) => place.dayNumber === day.dayNumber);
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
    }));

    try {
      const routeEntries = await Promise.all(routeModes.map(async (mode) => [
        mode.id,
        await getRouteBetweenPlaces(dayPoints, null, { mode: mode.id }),
      ]));
      const results = Object.fromEntries(routeEntries);
      const selectedMode = results[tripRoutePlan.selectedMode] ? tripRoutePlan.selectedMode : 'car';
      const activeRoute = results[selectedMode] || results.car;

      setTripRoutePlan((current) => ({
        ...current,
        dayNumber: day.dayNumber,
        points: dayPoints,
        results,
        selectedMode,
        selectedRouteId: activeRoute?.id || '',
        status: 'success',
        message: activeRoute?.message || '',
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
      }));
    }
  };

  const selectDayRouteMode = (modeId) => {
    const modeRoute = tripRoutePlan.results[modeId];
    setTripRoutePlan((current) => ({
      ...current,
      selectedMode: modeId,
      selectedRouteId: modeRoute?.id || '',
      message: modeRoute?.message || '',
    }));
  };

  const closeDayRoute = () => {
    setTripRoutePlan((current) => ({
      ...current,
      dayNumber: null,
      points: [],
      results: {},
      selectedRouteId: '',
      status: 'idle',
      message: '',
    }));
  };

  const closeAddSearch = () => {
    setAddMode(null);
    setSelectedIdea(null);
  };

  const handleIdeaSearch = (event) => {
    event.preventDefault();
    loadIdeas(addMode?.categoryId || ideaCategory, ideaSearch);
  };

  const selectIdea = async (idea) => {
    setSelectedIdea(idea);
    setSelectedPlaceSource('idea');
    setIdeaDetailStatus('success');
  };

  const selectTripPlace = async (place) => {
    if (!place) return;

    const normalizedPlace = formatIdeaPlace({
      ...place,
      name: place.name || place.title,
      address: place.address || place.city,
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
        }, normalizedPlace.categoryId)
        : normalizedPlace;

      setSelectedIdea(enrichedPlace);
      setIdeaDetailStatus(details?.available ? 'success' : 'fallback');
    } catch {
      setIdeaDetailStatus('fallback');
    }
  };

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

  const selectAiPlace = (place) => {
    setSelectedIdea(place);
    setSelectedPlaceSource('idea');
    setIdeaDetailStatus('success');
  };

  const addIdeaToDay = async (idea, modeOverride = ideaAddMode || addMode) => {
    if (!idea || isAddingIdea) return;

    setIsAddingIdea(true);
    const hasCoordinates = Number.isFinite(Number(idea.lng)) && Number.isFinite(Number(idea.lat));

    try {
      const response = await createItineraryItem(id, {
        type: modeOverride?.types?.[0] || getIdeaItemType(idea.categoryId || ideaCategory),
        title: idea.name,
        description: [
          idea.summary || idea.address || idea.displayName || '',
          idea.openState ? `Hours: ${idea.openState}` : '',
        ].filter(Boolean).join('\n'),
        scheduledDate: activeDay?.date || trip.startDate,
        startTime: selectedIdeaSchedule.startTime,
        endTime: selectedIdeaSchedule.endTime,
        location: hasCoordinates ? {
          address: idea.address || idea.displayName,
          coordinates: {
            type: 'Point',
            coordinates: [Number(idea.lng), Number(idea.lat)],
          },
        } : undefined,
        source: 'openstreetmap',
        externalId: idea.id,
        priceEstimate: { amount: 0, currency: tripCurrency },
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

  const startPanelResize = (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = panelWidth;

    const handlePointerMove = (moveEvent) => {
      const nextWidth = startWidth + moveEvent.clientX - startX;
      setPanelWidth(Math.min(Math.max(nextWidth, 320), 560));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  if (status === 'loading') {
    return <p className="settings-empty"><LoaderCircle className="trip-details-spin" size={16} aria-hidden="true" /> Loading trip details...</p>;
  }

  if (status === 'error') {
    return <p className="form-error" role="alert">{message}</p>;
  }

  return (
    <section className="trip-details-page" aria-labelledby="trip-details-title">
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

            <section className="trip-settings-section">
              <h4>Trip Budget</h4>
              <label className="trip-settings-budget-input">
                <span>{tripCurrency}</span>
                <input
                  type="number"
                  min="0"
                  value={trip.budget?.totalAmount || 0}
                  onChange={(event) => setTrip((current) => ({
                    ...current,
                    budget: { ...current.budget, totalAmount: Number(event.target.value) || 0, currency: tripCurrency },
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

      <div
        className={`trip-details-shell ${isAiAssistantOpen ? 'has-ai-assistant' : ''}`}
        style={{ '--trip-left-panel-width': `${panelWidth}px` }}
      >
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
        <aside className="trip-details-panel">
          {addMode ? (
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
                </section>
              ) : null}

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
                            {idea.imageUrl || getOpenStreetMapTileUrl(idea.lat, idea.lng)
                              ? <img src={idea.imageUrl || getOpenStreetMapTileUrl(idea.lat, idea.lng)} alt="" loading="lazy" />
                              : <AddModeIcon size={20} aria-hidden="true" />}
                          </span>
                          <div>
                            <span className="trip-idea-type">{addMode.addLabel}</span>
                            <strong>{idea.name}</strong>
                            <p>{idea.address || idea.displayName || idea.summary || 'Suggested place near this trip.'}</p>
                          </div>
                        </div>
                        <div className="trip-idea-meta">
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

              {activeTab === 'itinerary' ? <div className="trip-day-tabs" aria-label="Itinerary days">
                <div className="trip-day-selector">
                  <div className="trip-day-quick-list">
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

              {activeTab === 'itinerary' ? (
              <div className="trip-itinerary-workspace">
              {activeDayNumber === 'summary' ? (
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
              <>
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

              <label className="trip-weather-toggle">
                <input
                  type="checkbox"
                  checked={showWeatherHelp}
                  onChange={(event) => setShowWeatherHelp(event.target.checked)}
                />
                <span>Show weather-based advice and place ideas</span>
                <Info size={15} aria-hidden="true" />
              </label>
              <section className="trip-budget-overview" aria-label="Budget overview">
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
                      <span>spent today</span>
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
                            value={activeDay.budget?.amount || 0}
                            onChange={(event) => updateDayLocal(activeDay.dayNumber, {
                              budget: { amount: Number(event.target.value), currency: tripCurrency },
                            })}
                            onBlur={() => saveDay(activeDay)}
                          />
                        </div>
                      </label>
                    ) : null}
                  </div>
                  <span className="trip-budget-bar is-day"><em style={{ width: `${activeDaySpendPercent}%` }} /></span>
                </div>
                <div className="trip-statistic-card trip-allocation-card">
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
                      <span>Unallocated</span>
                      <strong>{currency?.formatAmount ? currency.formatAmount(remainingBudget, tripCurrency) : remainingBudget}</strong>
                    </div>
                  </div>
                  <span className="trip-budget-bar"><em style={{ width: `${plannedBudgetPercent}%` }} /></span>
                </div>
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

                      {group.items.map((item) => {
                        const itemPoint = getItemPoint(item);
                        const itemPreviewUrl = getOpenStreetMapTileUrl(itemPoint.lat, itemPoint.lng, 15);
                        const visitedPayload = getItemVisitedPayload(item);
                        const visitedRecord = visitedLookup[visitedPayload.placeKey];
                        const itemTimeWarning = getOpeningWarning({
                          hoursText: item.description,
                          startTime: item.startTime,
                          endTime: item.endTime,
                        });

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
                                {item.startTime || item.endTime ? <span><Clock3 size={12} aria-hidden="true" />{[item.startTime, item.endTime].filter(Boolean).join(' - ')}</span> : null}
                                <span><DollarSign size={12} aria-hidden="true" />{currency?.formatAmount ? currency.formatAmount(item.priceEstimate?.amount || 0, tripCurrency) : `${item.priceEstimate?.amount || 0} ${tripCurrency}`}</span>
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
                                onBlur={() => saveItemTime(item._id)}
                              />
                            </label>
                            <label>
                              <span>To</span>
                              <input
                                type="time"
                                value={item.endTime || ''}
                                onChange={(event) => updateItemTimeLocal(item, 'endTime', event.target.value)}
                                onBlur={() => saveItemTime(item._id)}
                              />
                            </label>
                            <label>
                              <span>Cost</span>
                              <input
                                type="number"
                                min="0"
                                value={item.priceEstimate?.amount || 0}
                                onChange={(event) => updateItemPriceLocal(item, event.target.value)}
                                onBlur={() => saveItemPrice(item._id)}
                              />
                            </label>
                          </div>
                          {itemTimeWarning ? (
                            <p className="trip-opening-warning">
                              <AlertTriangle size={14} aria-hidden="true" />
                              {itemTimeWarning}
                            </p>
                          ) : null}
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
                            {idea.imageUrl || getOpenStreetMapTileUrl(idea.lat, idea.lng)
                              ? <img src={idea.imageUrl || getOpenStreetMapTileUrl(idea.lat, idea.lng)} alt="" loading="lazy" />
                              : <Lightbulb size={20} aria-hidden="true" />}
                          </span>
                          <div>
                            <span className="trip-idea-type">{ideaCategory}</span>
                            <strong>{idea.name}</strong>
                            <p>{idea.address || idea.displayName || idea.summary || 'Suggested place near this trip.'}</p>
                          </div>
                        </div>
                        <div className="trip-idea-meta">
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

              <div className="trip-panel-footer">
                <button className="trip-assistant-bar" type="button" onClick={() => setIsAiAssistantOpen(true)}>
                  <Sparkles size={16} aria-hidden="true" />
                  Ask AI Assistance
                </button>
              </div>
            </>
          )}
        </aside>
        <div
          className="trip-panel-resizer"
          role="separator"
          aria-label="Resize trip planner panel"
          aria-orientation="vertical"
          tabIndex="0"
          onPointerDown={startPanelResize}
        />

        <main className="trip-details-map-area">
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
          {selectedIdea ? (
            <aside className="trip-place-detail-panel" aria-label={`${selectedIdea.name} details`}>
              {visitedLookup[getIdeaVisitedPayload(selectedIdea).placeKey] ? <span className="visited-place-watermark">Visited</span> : null}
              <button className="trip-place-detail-close" type="button" onClick={() => setSelectedIdea(null)} aria-label="Close place details">
                <X size={18} aria-hidden="true" />
              </button>
              {selectedIdea.imageUrl || getOpenStreetMapTileUrl(selectedIdea.lat, selectedIdea.lng) ? (
                <img className="trip-place-detail-image" src={selectedIdea.imageUrl || getOpenStreetMapTileUrl(selectedIdea.lat, selectedIdea.lng)} alt="" loading="lazy" />
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
                    <dt><Clock3 size={14} aria-hidden="true" /> Hours</dt>
                    <dd>{selectedIdea.openState || selectedIdea.hours || 'Hours unavailable'}</dd>
                  </div>
                  <div>
                    <dt><DollarSign size={14} aria-hidden="true" /> Price</dt>
                    <dd>{selectedIdea.price || 'Price unavailable'}</dd>
                  </div>
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
                          <small>{index === 0 ? 'Go here first' : index === tripRouteMapPlaces.length - 1 ? 'Final stop' : `Then continue to stop ${index + 1}`}</small>
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
