/**
 * Trips module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Country, State } from 'country-state-city';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  AlertTriangle,
  BedDouble,
  Building2,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  Clock3,
  CloudSun,
  DollarSign,
  Image,
  Info,
  Landmark,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
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
import { searchAttractions, searchHotels, searchRestaurants } from '../../api/exploreApi';
import { getTripSummary, updateTrip } from '../../api/tripApi';
import {
  addPackingItem,
  addTravelDocumentItem,
  createPackingList,
  createTravelDocument,
  getPackingLists,
  getTravelDocuments,
  updatePackingItem,
} from '../../api/travelToolsApi';
import { getGeocodeLocation, searchOpenStreetMapCategoryPlaces, searchOpenStreetMapPlaces } from '../../api/mapApi';
import { getVisitedPlaces } from '../../api/visitedPlaceApi';
import TripMapPreview from '../../components/trips/TripMapPreview';
import TripRoutePlanner from '../../components/trips/TripRoutePlanner';
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
const weatherModeIcons = {
  rainy: Umbrella,
  sunny: Sun,
  cold: Building2,
  comfortable: CloudSun,
  default: CloudSun,
};
const defaultPackingItems = ['Passport', 'Charger', 'Umbrella', 'Medicine', 'Power Bank'];
const defaultDocumentItems = [
  { name: 'Flight Ticket', documentType: 'Ticket' },
  { name: 'Hotel Booking', documentType: 'Booking' },
  { name: 'Passport', documentType: 'Passport' },
  { name: 'Visa', documentType: 'Visa' },
  { name: 'Insurance', documentType: 'Insurance' },
];
const settingsStyleOptions = ['Food', 'Culture', 'Shopping'];
const emptyLocationLabels = new Set(['not added yet']);
const getEditableLocationName = (value) => {
  const locationName = String(value || '').trim();
  return emptyLocationLabels.has(locationName.toLowerCase()) ? '' : locationName;
};

const itineraryGroups = [
  { id: 'food', title: 'What to eat', addLabel: 'Food', categoryId: 'food', types: ['restaurant'], icon: Utensils },
  { id: 'see', title: 'What to see and do', addLabel: 'Attractions', categoryId: 'attractions', types: ['attraction', 'custom'], icon: Landmark },
  { id: 'stay', title: 'Where to stay', addLabel: 'Stay', categoryId: 'hotels', types: ['hotel'], icon: BedDouble },
  { id: 'move', title: 'How to get there', addLabel: 'Transportation', categoryId: 'train', types: ['transport', 'flight'], icon: TrainFront },
];
const categoryTextSearchTerms = {
  food: ['restaurants', 'cafes', 'food courts'],
  attractions: ['tourist attractions', 'museums', 'landmarks'],
  hotels: ['hotels', 'resorts', 'guest houses'],
  train: ['train stations', 'transport hubs', 'bus stations'],
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

  const responses = await Promise.allSettled(searchTerms.map((term) =>
    searchOpenStreetMapPlaces(`${term} in ${trimmedLocation}`, {
      limit: options.limitPerTerm || 4,
      signal: options.signal,
    })
  ));

  return getUniquePlaces(responses
    .filter((response) => response.status === 'fulfilled')
    .flatMap((response) => response.value))
    .slice(0, options.limit || 12);
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
const normalizeStyleValue = (value) => value.toLowerCase().replace(/\s+/g, '-');
const hasStyle = (trip, style) => (trip?.travelPreferences?.styles || []).includes(normalizeStyleValue(style));
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
const getRouteCountries = (days = []) => {
  const countryNames = days
    .map((day) => {
      const explicitCountry = day.location?.country;
      if (explicitCountry) return explicitCountry;

      const locationName = day.location?.name || '';
      const countryMatch = Country.getAllCountries().find((country) => country.name.toLowerCase() === locationName.toLowerCase());
      return countryMatch?.name || '';
    })
    .filter(Boolean);

  return [...new Set(countryNames)];
};
// TripDetailsPage renders the main screen and handles nearby interactions.
function TripDetailsPage() {
  const { id } = useParams();
  const currency = useContext(CurrencyContext);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [activeDayNumber, setActiveDayNumber] = useState('summary');
  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [items, setItems] = useState([]);
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weatherGuidance, setWeatherGuidance] = useState(null);
  const [showWeatherHelp, setShowWeatherHelp] = useState(true);
  const [ideas, setIdeas] = useState([]);
  const [tripRoutePlan, setTripRoutePlan] = useState({
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
  const [ideaSearch, setIdeaSearch] = useState('');
  const [addMode, setAddMode] = useState(null);
  const [message, setMessage] = useState('');
  const [panelWidth, setPanelWidth] = useState(460);
  const [isAddingIdea, setIsAddingIdea] = useState(false);
  const [selectedIdeaSchedule, setSelectedIdeaSchedule] = useState({ startTime: '09:00', endTime: '10:00' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [checklistModal, setChecklistModal] = useState(null);
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
  const itemSpend = items.reduce((total, item) => total + Number(item.priceEstimate?.amount || 0), 0);
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
      title: item.title,
      city: item.location?.address,
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
  const routeSummary = useMemo(() => getRouteSummary(days), [days]);
  const routeCountries = useMemo(() => getRouteCountries(days), [days]);
  const packingProgress = getChecklistProgress(packingList?.items || [], (item) => item.isPacked);
  const documentProgress = getChecklistProgress(travelDocument?.items || [], (item) => item.files?.length);
  const summaryTripDuration = days.length || trip?.durationDays || 0;
  const summaryLocationsSet = new Set(days.map((day) => day.location?.name).filter(Boolean));
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
        const exploreResults = await searchExploreCategoryPlaces(group.categoryId, textLocationQuery, {
          limit: 3,
        });
        const mapResults = exploreResults.length
          ? []
          : await searchOpenStreetMapCategoryPlaces(group.categoryId, center, {
          limit: 3,
          signal: controller.signal,
        });
        const textResults = exploreResults.length || mapResults.length
          ? []
          : await searchCategoryPlacesByText(group.categoryId, textLocationQuery, {
          limit: 3,
          limitPerTerm: 2,
          signal: controller.signal,
        });
        const results = getUniquePlaces([...exploreResults, ...mapResults, ...textResults]).slice(0, 3);

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

  const toggleTravelStyle = async (style) => {
    const normalizedStyle = normalizeStyleValue(style);
    const currentStyles = trip?.travelPreferences?.styles || [];
    const nextStyles = currentStyles.includes(normalizedStyle)
      ? currentStyles.filter((item) => item !== normalizedStyle)
      : [...currentStyles, normalizedStyle];
    const response = await updateTrip(id, {
      travelPreferences: {
        ...trip.travelPreferences,
        styles: nextStyles,
      },
    });
    const savedTrip = response.data?.data?.trip;
    if (savedTrip) setTrip(savedTrip);
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

  const openPackingChecklist = async () => {
    setToolsMessage('');
    if (packingList) {
      setChecklistModal('packing');
      return;
    }

    try {
      const response = await createPackingList({
        title: `${trip.title || trip.destination} packing list`,
        tripId: id,
        items: defaultPackingItems.map((name) => ({ name })),
      });
      setPackingList(response.data?.data?.packingList || null);
      setChecklistModal('packing');
    } catch (error) {
      setToolsMessage(error.response?.data?.message || 'Unable to create packing list.');
    }
  };

  const openDocumentChecklist = async () => {
    setToolsMessage('');
    if (travelDocument) {
      setChecklistModal('documents');
      return;
    }

    try {
      const response = await createTravelDocument({
        name: `${trip.title || trip.destination} documents`,
        tripId: id,
        type: 'Custom',
        items: defaultDocumentItems.map((item) => ({
          ...item,
          uploadLabel: `Upload ${item.name}`,
        })),
      });
      setTravelDocument(response.data?.data?.document || response.data?.data?.travelDocument || null);
      setChecklistModal('documents');
    } catch (error) {
      setToolsMessage(error.response?.data?.message || 'Unable to create document checklist.');
    }
  };

  const togglePackingItem = async (item) => {
    const response = await updatePackingItem(packingList._id, item._id, { isPacked: !item.isPacked });
    setPackingList(response.data?.data?.packingList || response.data?.data?.list || packingList);
  };

  const addDefaultPackingItem = async (name) => {
    const response = await addPackingItem(packingList._id, { name });
    setPackingList(response.data?.data?.packingList || response.data?.data?.list || packingList);
  };

  const addDefaultDocumentItem = async (item) => {
    const response = await addTravelDocumentItem(travelDocument._id, {
      ...item,
      uploadLabel: `Upload ${item.name}`,
    });
    setTravelDocument(response.data?.data?.document || response.data?.data?.travelDocument || travelDocument);
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

      const exploreResults = await searchExploreCategoryPlaces(category, locationQuery, { limit: 12 });
      const mapResults = exploreResults.length || !center
        ? []
        : await searchOpenStreetMapCategoryPlaces(category, center, { limit: 12 });
      const textResults = exploreResults.length || mapResults.length
        ? []
        : await searchCategoryPlacesByText(category, locationQuery, {
        limit: 12,
        limitPerTerm: 5,
      });
      const results = getUniquePlaces([...exploreResults, ...mapResults, ...textResults]).slice(0, 12);
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
    setAddMode(group);
    setIdeaSearch('');
    loadIdeas(group.categoryId, '');
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
    setIdeaDetailStatus('success');
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
    setIdeaDetailStatus('success');
  };

  const addIdeaToDay = async (idea, modeOverride = addMode) => {
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
          <button className="trip-settings-button" type="button" onClick={() => setSettingsOpen(true)}>
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
              <h4>Travel Style</h4>
              <div className="trip-settings-checks">
                {settingsStyleOptions.map((style) => (
                  <label key={style}>
                    <input
                      type="checkbox"
                      checked={hasStyle(trip, style)}
                      onChange={() => toggleTravelStyle(style)}
                    />
                    <span>{style}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="trip-settings-section trip-settings-row">
              <div>
                <h4>Packing List</h4>
                <p>{packingProgress.completed} / {packingProgress.total || defaultPackingItems.length} Completed</p>
              </div>
              <button type="button" onClick={openPackingChecklist}>Open</button>
            </section>

            <section className="trip-settings-section trip-settings-row">
              <div>
                <h4>Document Checklist</h4>
                <p>{documentProgress.completed} / {documentProgress.total || defaultDocumentItems.length} Completed</p>
              </div>
              <button type="button" onClick={openDocumentChecklist}>Open</button>
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

              {showWeatherHelp && weatherGuidance ? (
                <section className={weatherGuidance.available ? 'trip-weather-helper' : 'trip-weather-helper is-compact'} aria-label="Weather planning help">
                  <div className="trip-weather-helper-heading">
                    <span><WeatherModeIcon size={16} aria-hidden="true" /></span>
                    <div>
                      <strong>{weatherGuidance.headline}</strong>
                      {weatherGuidance.available ? (
                        <small>{weather?.available ? `${weather.condition}${weatherTemperature ? `, ${weatherTemperature}` : ''}` : weatherGuidance.message}</small>
                      ) : null}
                    </div>
                    <button className="trip-weather-hide" type="button" onClick={() => setShowWeatherHelp(false)}>
                      Default
                    </button>
                  </div>
                  {weatherGuidance.available ? (
                    <div className="trip-weather-tip-list">
                      {(weatherGuidance.packingTips || []).slice(0, 2).map((tip) => <span key={tip}>{tip}</span>)}
                      {(weatherGuidance.placeTips || []).slice(0, 1).map((tip) => <span key={tip}>{tip}</span>)}
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
                  if (ideas.length === 0) loadIdeas();
                }}>
                  Ideas
                </button>
                <button className={activeTab === 'route' ? 'active' : ''} type="button" onClick={() => setActiveTab('route')}>
                  Route
                </button>
              </nav>

              {activeTab !== 'route' ? <div className="trip-day-tabs" aria-label="Itinerary days">
                <div className="trip-day-selector">
                  <div className="trip-day-quick-list">
                    <button
                      className={activeDayNumber === 'summary' ? 'trip-day-tab-button active' : 'trip-day-tab-button'}
                      type="button"
                      onClick={() => {
                        setActiveDayNumber('summary');
                        setIsEditingDayLocation(false);
                        setIsDayMenuOpen(false);
                      }}
                    >
                      <span>Summary</span>
                      <small>{routeSummary.length} stop{routeSummary.length === 1 ? '' : 's'}</small>
                    </button>
                    {visibleDayTabs.map((day) => (
                      <button
                        className={activeDayNumber === day.dayNumber ? 'trip-day-tab-button active' : 'trip-day-tab-button'}
                        type="button"
                        key={day.dayNumber}
                        onClick={() => {
                          setActiveDayNumber(day.dayNumber);
                          setIsEditingDayLocation(false);
                          setIsDayMenuOpen(false);
                        }}
                      >
                        <span>Day {day.dayNumber}</span>
                        <small>{formatDate(day.date)}</small>
                      </button>
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
                          setIsEditingDayLocation(false);
                          setIsDayMenuOpen(false);
                        }}
                      >
                        <span>Summary</span>
                        <small>{routeSummary.length} stop{routeSummary.length === 1 ? '' : 's'}</small>
                      </button>
                      {days.map((day) => (
                        <button
                          className={activeDayNumber === day.dayNumber ? 'active' : ''}
                          type="button"
                          role="menuitem"
                          key={day.dayNumber}
                          onClick={() => {
                            setActiveDayNumber(day.dayNumber);
                            setIsEditingDayLocation(false);
                            setIsDayMenuOpen(false);
                          }}
                        >
                          <span>Day {day.dayNumber}</span>
                          <small>{formatDate(day.date)}{day.location?.name ? ` · ${day.location.name}` : ''}</small>
                        </button>
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

                  <section className="trip-route-summary is-summary-tab" aria-label="Route summary">
                    <div className="trip-route-summary-heading">
                      <MapPin size={15} aria-hidden="true" />
                      <h3>Route Summary</h3>
                    </div>
                    <div className="trip-route-country-summary">
                      <strong>{routeCountries.length} countr{routeCountries.length === 1 ? 'y' : 'ies'} involved</strong>
                      <span>{routeCountries.length ? routeCountries.join(', ') : 'Set day locations to see countries.'}</span>
                    </div>
                    <div className="trip-route-summary-list">
                      {routeSummary.map((stop) => (
                        <span key={`${stop.name}-${stop.country}-${stop.startDay}`}>
                          <strong>{stop.name}</strong>
                          <small>
                            {stop.startDay === stop.endDay
                              ? `Day ${stop.startDay}`
                              : `Days ${stop.startDay}-${stop.endDay}`}
                          </small>
                        </span>
                      ))}
                    </div>
                    <p className="trip-route-summary-note">
                      Day locations power nearby ideas, weather context, and route planning. Open each day to set a state, city, or popular area.
                    </p>
                  </section>

                  <section className="trip-summary-grid" aria-label="Planning summary">
                    <div>
                      <h3>Checklist Progress</h3>
                      <p>Packing list: {packingProgress.completed} / {packingProgress.total || defaultPackingItems.length}</p>
                      <p>Documents: {documentProgress.completed} / {documentProgress.total || defaultDocumentItems.length}</p>
                    </div>
                    <div>
                      <h3>Budget Snapshot</h3>
                      <p>Total: {currency?.formatAmount ? currency.formatAmount(totalBudget, tripCurrency) : `${tripCurrency} ${totalBudget}`}</p>
                      <p>Daily planned: {currency?.formatAmount ? currency.formatAmount(plannedBudget, tripCurrency) : plannedBudget}</p>
                    </div>
                    <div>
                      <h3>Next Planning Step</h3>
                      <p>{summaryLocationsSet.size ? 'Add food, attractions, hotels, and transport to each day.' : 'Set each day location first so ideas match the correct area.'}</p>
                    </div>
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
                <div className={`trip-budget-card is-${activeDayBudgetStatus.tone}`}>
                  <div className="trip-stat-card-head">
                    <span>Budget</span>
                    {activeDay ? (
                      <label className="trip-budget-input" title="Daily budget for this itinerary day. Item estimates below count against this amount.">
                        <span>{tripCurrency}</span>
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
                      </label>
                    ) : null}
                  </div>
                  <strong>{currency?.formatAmount ? currency.formatAmount(activeDaySpend, tripCurrency) : `${tripCurrency} ${activeDaySpend}`}</strong>
                  <small>of {currency?.formatAmount ? currency.formatAmount(activeDayBudget, tripCurrency) : `${tripCurrency} ${activeDayBudget}`}</small>
                  <span className="trip-budget-status">{activeDayBudgetStatus.text}</span>
                </div>
                <div>
                  <span>Trip allocation</span>
                  <strong>{plannedBudgetPercent}% planned</strong>
                  <span className="trip-budget-bar"><em style={{ width: `${plannedBudgetPercent}%` }} /></span>
                  <small>{currency?.formatAmount ? currency.formatAmount(remainingBudget, tripCurrency) : remainingBudget} left</small>
                </div>
                <div className="trip-weather-budget-card">
                  <span>Weather</span>
                  <div className="trip-weather-stat">
                    <WeatherModeIcon size={22} aria-hidden="true" />
                    <strong>{weather?.available ? `${weather.condition}${weatherTemperature ? `, ${weatherTemperature}` : ''}` : 'Weather unavailable'}</strong>
                  </div>
                  <small>{weatherGuidance?.packingTips?.[0] || weather?.message || 'Plan with flexible indoor and outdoor options.'}</small>
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
                          <small>{toVisitItemCount} place{toVisitItemCount === 1 ? '' : 's'} to visit / {visitedItemCount} visited</small>
                        </div>
                      </div>

                      <button className="trip-group-add" type="button" onClick={() => openAddSearch(group)}>
                        <Plus size={15} aria-hidden="true" />
                        Add {group.addLabel}
                      </button>
                      <button className="trip-group-collapse" type="button" aria-label={`Expand ${group.title}`}>
                        <ChevronDown size={17} aria-hidden="true" />
                      </button>

                      <div className="trip-group-ideas">
                        <div className="trip-group-ideas-heading">
                          <Sparkles size={14} aria-hidden="true" />
                          <span>
                            {dayGroupIdeaStatus === 'loading'
                              ? 'Finding nearby ideas...'
                              : `Ideas near ${dayGroupIdeaSource || activeDayLocationLabel}`}
                          </span>
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
                          <div className="trip-item-card-main">
                            <span className="trip-itinerary-thumb">
                              {itemPreviewUrl ? <img src={itemPreviewUrl} alt="" loading="lazy" /> : <MapPin size={20} aria-hidden="true" />}
                            </span>
                            <div className="trip-item-card-copy">
                              <div className="trip-item-title-row">
                                <strong>{item.title}</strong>
                                <span className={visitedRecord ? 'trip-visit-status is-visited' : 'trip-visit-status'}>
                                  {visitedRecord ? 'Visited' : 'Place to visit'}
                                </span>
                                <button type="button" onClick={() => removeItem(item._id)} aria-label={`Remove ${item.title}`}>
                                  <Trash2 size={15} aria-hidden="true" />
                                </button>
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
                            <VisitedPlaceControl
                              compact
                              payload={visitedPayload}
                              visitedRecord={visitedRecord}
                              onVisitedChange={handleVisitedChange}
                            />
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
              ) : activeTab === 'route' ? (
                <TripRoutePlanner
                  itineraryPlaces={mapPlaces}
                  plan={tripRoutePlan}
                  onPlanChange={setTripRoutePlan}
                />
              ) : (
            <div className="trip-ideas-workspace">
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
                      onClick={() => loadIdeas(category.id, ideaSearch)}
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
                <p className="settings-empty">Choose a category to load map-based ideas for this trip.</p>
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
          {activeTab !== 'route' ? <div className="trip-details-map-toolbar">
            {ideaCategories.map((category) => {
              const CategoryIcon = category.icon;

              return (
                <button type="button" key={category.id} onClick={() => {
                  setActiveTab('ideas');
                  loadIdeas(category.id, ideaSearch);
                }}>
                  <CategoryIcon size={15} aria-hidden="true" />
                  {category.label}
                </button>
              );
            })}
          </div> : (
            <div className="trip-details-map-toolbar trip-route-map-toolbar">
              <span><Sparkles size={15} aria-hidden="true" /> Best route highlighted · alternatives dashed</span>
            </div>
          )}
          <TripMapPreview
            center={isAiAssistantOpen && selectedIdea ? [selectedIdea.lat, selectedIdea.lng] : activeTab === 'itinerary' ? activeDayMapCenter : undefined}
            className="trip-details-map"
            focusCenter={Boolean(isAiAssistantOpen && selectedIdea)}
            focusOffset={isAiAssistantOpen && selectedIdea ? [170, 0] : [0, 0]}
            highlightedPlace={isAiAssistantOpen ? selectedIdea : null}
            places={isAiAssistantOpen && selectedIdea ? aiMapPlaces : activeTab === 'route' ? tripRouteMapPlaces : aiMapPlaces}
            route={activeTab === 'route' ? selectedTripRoute : null}
            scrollWheelZoom
            showZoomControl
            zoom={isAiAssistantOpen && selectedIdea ? 17 : activeDayNumber !== 'summary' ? 10 : undefined}
          />
          {(addMode || activeTab === 'ideas' || isAiAssistantOpen) && selectedIdea ? (
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
                <div className="trip-place-time-grid">
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
                </div>
                {selectedIdeaWarning ? (
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
                <button type="button" onClick={() => addIdeaToDay(selectedIdea)} disabled={isAddingIdea || selectedIdea.fallback || hasInvalidSelectedIdeaTime}>
                  {isAddingIdea ? <LoaderCircle className="trip-details-spin" size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                  {isAddingIdea ? 'Adding...' : 'Add to itinerary'}
                </button>
                {selectedIdea.fallback ? <small>Choose a real place result before adding.</small> : null}
              </div>
            </aside>
          ) : null}
          <div className="trip-details-summary-strip">
            {showWeatherHelp ? <span><CloudSun size={16} aria-hidden="true" />{weather?.available ? weather.condition : weather?.message || 'Weather unavailable'}</span> : null}
            <span><WalletCards size={16} aria-hidden="true" />Daily planned: {currency?.formatAmount ? currency.formatAmount(plannedBudget, tripCurrency) : plannedBudget}</span>
            <span><CheckCircle2 size={16} aria-hidden="true" />Item estimates: {currency?.formatAmount ? currency.formatAmount(itemSpend, tripCurrency) : itemSpend}</span>
          </div>
        </main>
      </div>
      {checklistModal ? (
        <div className="trip-checklist-modal-backdrop" role="presentation" onClick={() => setChecklistModal(null)}>
          <section className="trip-checklist-modal" role="dialog" aria-modal="true" aria-labelledby="trip-checklist-title" onClick={(event) => event.stopPropagation()}>
            <header>
              <h3 id="trip-checklist-title">{checklistModal === 'packing' ? 'Packing List' : 'Documents'}</h3>
              <button type="button" onClick={() => setChecklistModal(null)} aria-label="Close checklist">
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            {checklistModal === 'packing' ? (
              <div className="trip-checklist-items">
                {(packingList?.items || []).map((item) => (
                  <label key={item._id}>
                    <input type="checkbox" checked={Boolean(item.isPacked)} onChange={() => togglePackingItem(item)} />
                    <span>{item.name}</span>
                  </label>
                ))}
                {defaultPackingItems
                  .filter((name) => !(packingList?.items || []).some((item) => item.name.toLowerCase() === name.toLowerCase()))
                  .map((name) => (
                    <button type="button" key={name} onClick={() => addDefaultPackingItem(name)}>
                      <Plus size={15} aria-hidden="true" />
                      {name}
                    </button>
                  ))}
              </div>
            ) : (
              <div className="trip-checklist-items">
                {(travelDocument?.items || []).map((item) => (
                  <label key={item._id}>
                    <input type="checkbox" checked={Boolean(item.files?.length)} readOnly />
                    <span>{item.name}</span>
                  </label>
                ))}
                {defaultDocumentItems
                  .filter((defaultItem) => !(travelDocument?.items || []).some((item) => item.name.toLowerCase() === defaultItem.name.toLowerCase()))
                  .map((item) => (
                    <button type="button" key={item.name} onClick={() => addDefaultDocumentItem(item)}>
                      <Plus size={15} aria-hidden="true" />
                      {item.name}
                    </button>
                  ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default TripDetailsPage;
