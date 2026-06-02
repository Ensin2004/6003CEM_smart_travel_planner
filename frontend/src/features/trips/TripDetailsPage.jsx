/**
 * Trips module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CloudSun,
  DollarSign,
  Image,
  Landmark,
  Lightbulb,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
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
import { getTripSummary } from '../../api/tripApi';
import { searchOpenStreetMapCategoryPlaces } from '../../api/mapApi';
import { getVisitedPlaces } from '../../api/visitedPlaceApi';
import TripMapPreview from '../../components/trips/TripMapPreview';
import { getTripMapPoint } from '../../components/trips/tripMapUtils';
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

const itineraryGroups = [
  { id: 'food', title: 'What to eat', addLabel: 'Food', categoryId: 'food', types: ['restaurant'], icon: Utensils },
  { id: 'see', title: 'What to see and do', addLabel: 'Attractions', categoryId: 'attractions', types: ['attraction', 'custom'], icon: Landmark },
  { id: 'stay', title: 'Where to stay', addLabel: 'Stay', categoryId: 'hotels', types: ['hotel'], icon: BedDouble },
  { id: 'move', title: 'How to get there', addLabel: 'Transportation', categoryId: 'train', types: ['transport', 'flight'], icon: TrainFront },
];
const getFallbackIdeas = (category, trip) => {
  const destination = [trip?.destination, trip?.country].filter(Boolean).join(', ') || 'this destination';

  return [{
    id: `fallback-${category}`,
    name: `Search ${destination}`,
    displayName: destination,
    summary: 'No live place results came back for this category. Try another category or search term.',
    lat: null,
    lng: null,
    type: 'idea',
    fallback: true,
  }];
};
const getPlaceAddress = (place) => place.address || place.displayName || 'Location details unavailable';
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
const getRecommendationLocation = (trip) => {
  const primaryDestination = trip?.destinationSegments?.[0];
  return [
    primaryDestination?.city || trip?.destination,
    primaryDestination?.country || trip?.country,
  ].filter(Boolean).join(', ');
};
// TripDetailsPage renders the main screen and handles nearby interactions.
function TripDetailsPage() {
  const { id } = useParams();
  const currency = useContext(CurrencyContext);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [activeDayNumber, setActiveDayNumber] = useState(1);
  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [items, setItems] = useState([]);
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weatherGuidance, setWeatherGuidance] = useState(null);
  const [showWeatherHelp, setShowWeatherHelp] = useState(true);
  const [ideas, setIdeas] = useState([]);
  const [ideaCategory, setIdeaCategory] = useState('attractions');
  const [status, setStatus] = useState('loading');
  const [ideaStatus, setIdeaStatus] = useState('idle');
  const [ideaDetailStatus, setIdeaDetailStatus] = useState('idle');
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [ideaSearch, setIdeaSearch] = useState('');
  const [addMode, setAddMode] = useState(null);
  const [message, setMessage] = useState('');
  const [panelWidth, setPanelWidth] = useState(370);
  const [isAddingIdea, setIsAddingIdea] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [selectedIdeaSchedule, setSelectedIdeaSchedule] = useState({ startTime: '09:00', endTime: '10:00' });
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
  const activeDay = useMemo(
    () => days.find((day) => day.dayNumber === activeDayNumber) || days[0],
    [activeDayNumber, days]
  );

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
  const totalBudget = Number(trip?.budget?.totalAmount || 0);
  const remainingBudget = Math.max(0, totalBudget - plannedBudget);
  const plannedBudgetPercent = totalBudget ? Math.min(100, Math.round((plannedBudget / totalBudget) * 100)) : 0;
  const activeDaySpendPercent = activeDayBudget ? Math.min(100, Math.round((activeDaySpend / activeDayBudget) * 100)) : 0;
  const AddModeIcon = addMode?.icon || Plus;
  const recommendationLocation = getRecommendationLocation(trip);
  const selectedIdeaHours = selectedIdea?.openState || selectedIdea?.hours || '';
  const selectedIdeaWarning = selectedIdea
    ? getOpeningWarning({ hoursText: selectedIdeaHours, ...selectedIdeaSchedule })
    : '';
  const hasInvalidSelectedIdeaTime = selectedIdeaWarning.startsWith('End time');
  const weatherTemperature = weather?.temperature?.max || weather?.temperature?.mean
    ? `${Math.round(weather.temperature.max || weather.temperature.mean)}${weather.temperature.unit || 'C'}`
    : '';
  const WeatherModeIcon = weatherModeIcons[weatherGuidance?.mode] || CloudSun;
  const weatherCategoryShortcuts = showWeatherHelp
    ? (weatherGuidance?.recommendedCategories || [])
      .map((categoryId) => ideaCategories.find((category) => category.id === categoryId))
      .filter(Boolean)
    : [];
  const destinationPlaces = trip?.destinationSegments?.length
    ? trip.destinationSegments
    : trip
      ? [{ city: trip.destination, country: trip.country }]
      : [];
  const mapPlaces = [
    ...destinationPlaces,
    ...items.map((item) => ({
      title: item.title,
      city: item.location?.address,
      lat: item.location?.coordinates?.coordinates?.[1],
      lng: item.location?.coordinates?.coordinates?.[0],
    })),
  ];
  const ideaMapPlaces = selectedIdea ? [selectedIdea, ...ideas.filter((idea) => idea.id !== selectedIdea.id)] : ideas;
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

  const updateDayLocal = (dayNumber, patch) => {
    setDays((currentDays) =>
      currentDays.map((day) => (day.dayNumber === dayNumber ? { ...day, ...patch } : day))
    );
  };

  const saveDay = async (day) => {
    const response = await updateItineraryDay(id, day.dayNumber, {
      date: day.date,
      title: day.title,
      notes: day.notes,
      budget: day.budget,
    });
    const savedDay = response.data?.data?.day;
    if (savedDay) updateDayLocal(savedDay.dayNumber, savedDay);
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
      const center = getTripMapPoint(destinationPlaces[0] || {});
      const results = await searchOpenStreetMapCategoryPlaces(category, center, {
        limit: 12,
      });
      const nextIdeas = results.map((idea) => formatIdeaPlace({
        ...idea,
        summary: idea.displayName || `${category} near ${searchTerm?.trim() || recommendationLocation || trip.destination}`,
      }, category));
      const fallbackIdeas = getFallbackIdeas(category, trip);
      const resolvedIdeas = nextIdeas.length ? nextIdeas : fallbackIdeas;
      setIdeas(resolvedIdeas);
      setSelectedIdea(null);
      setIdeaStatus('success');
    } catch {
      const fallbackIdeas = getFallbackIdeas(category, trip);
      setIdeas(fallbackIdeas);
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

  const switchAddCategory = (category) => {
    const matchingGroup = itineraryGroups.find((group) => group.categoryId === category.id);
    setAddMode(matchingGroup || {
      id: category.id,
      title: category.label,
      addLabel: category.label,
      categoryId: category.id,
      types: [getIdeaItemType(category.id)],
      icon: category.icon,
    });
    loadIdeas(category.id, ideaSearch);
  };

  const selectIdea = async (idea) => {
    setSelectedIdea(idea);
    setIdeaDetailStatus('success');
  };

  const addIdeaToDay = async (idea) => {
    if (!idea || isAddingIdea) return;

    setIsAddingIdea(true);
    setActionMessage('');
    const hasCoordinates = Number.isFinite(Number(idea.lng)) && Number.isFinite(Number(idea.lat));

    try {
      const response = await createItineraryItem(id, {
        type: addMode?.types?.[0] || getIdeaItemType(idea.categoryId || ideaCategory),
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
        setActionMessage(`Added ${savedItem.title} to Day ${activeDay?.dayNumber || 1}.`);
      }
    } catch (error) {
      setActionMessage(error.response?.data?.message || 'Unable to add this place to the itinerary.');
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
        <div>
          <Link to="/trips" className="trip-back-link">Trips</Link>
          <h2 id="trip-details-title">{trip.title || trip.destination}</h2>
          <p>
            <CalendarDays size={15} aria-hidden="true" />
            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            <span>{trip.dateFlexibility?.mode === 'flexible' ? `Flexible by ${trip.dateFlexibility.windowDays} days` : 'Exact dates'}</span>
          </p>
        </div>
        <div className="trip-details-budget">
          <span>Whole trip budget</span>
          <strong>{currency?.formatAmount ? currency.formatAmount(trip.budget?.totalAmount || 0, tripCurrency) : `${tripCurrency} ${trip.budget?.totalAmount || 0}`}</strong>
        </div>
      </header>

      <div className="trip-details-shell" style={{ '--trip-left-panel-width': `${panelWidth}px` }}>
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
                  <div className="trip-weather-shortcuts" aria-label="Weather-based place shortcuts">
                    {weatherCategoryShortcuts.map((category) => {
                      const CategoryIcon = category.icon;

                      return (
                        <button
                          type="button"
                          key={category.id}
                          onClick={() => switchAddCategory(category)}
                        >
                          <CategoryIcon size={14} aria-hidden="true" />
                          {category.label}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <div className="trip-add-search-tabs" aria-label="Search shortcuts">
                <button className="active" type="button" onClick={() => loadIdeas(addMode.categoryId, '')}>
                  Recommend
                </button>
                {ideaCategories.map((category) => {
                  const CategoryIcon = category.icon;

                  return (
                    <button
                      className={addMode.categoryId === category.id ? 'active' : ''}
                      type="button"
                      key={category.id}
                      onClick={() => switchAddCategory(category)}
                    >
                      <CategoryIcon size={14} aria-hidden="true" />
                      {category.label}
                    </button>
                  );
                })}
                {destinationPlaces.slice(0, 4).map((place) => (
                  <button
                    type="button"
                    key={`${place.city}-${place.country}`}
                    onClick={() => {
                      setIdeaSearch(place.city || '');
                      loadIdeas(addMode.categoryId, place.city || '');
                    }}
                  >
                    {place.city || place.country}
                  </button>
                ))}
              </div>

              {ideaStatus === 'loading' ? (
                <p className="settings-empty"><LoaderCircle className="trip-details-spin" size={16} aria-hidden="true" /> Loading places...</p>
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
              </nav>

              <div className="trip-day-tabs" aria-label="Itinerary days">
                {days.map((day) => (
                  <button
                    className={activeDayNumber === day.dayNumber ? 'active' : ''}
                    type="button"
                    key={day.dayNumber}
                    onClick={() => setActiveDayNumber(day.dayNumber)}
                  >
                    Day {day.dayNumber}
                  </button>
                ))}
              </div>

              {actionMessage ? <p className="trip-action-message" role="status">{actionMessage}</p> : null}

              {activeTab === 'itinerary' ? (
              <div className="trip-itinerary-workspace">
              <label className="trip-weather-toggle">
                <input
                  type="checkbox"
                  checked={showWeatherHelp}
                  onChange={(event) => setShowWeatherHelp(event.target.checked)}
                />
                <span>Show weather-based advice and place ideas</span>
              </label>
              <section className="trip-budget-overview" aria-label="Budget overview">
                <div>
                  <span>Daily budget</span>
                  <strong>{currency?.formatAmount ? currency.formatAmount(activeDayBudget, tripCurrency) : `${tripCurrency} ${activeDayBudget}`}</strong>
                  <small>{currency?.formatAmount ? currency.formatAmount(activeDaySpend, tripCurrency) : activeDaySpend} estimated in items</small>
                  <span className="trip-budget-bar"><em style={{ width: `${activeDaySpendPercent}%` }} /></span>
                </div>
                <div>
                  <span>Trip allocation</span>
                  <strong>{plannedBudgetPercent}% planned</strong>
                  <small>{currency?.formatAmount ? currency.formatAmount(remainingBudget, tripCurrency) : remainingBudget} left unassigned</small>
                  <span className="trip-budget-bar"><em style={{ width: `${plannedBudgetPercent}%` }} /></span>
                </div>
                {showWeatherHelp ? <div>
                  <span>Weather</span>
                  <strong>{weather?.available ? `${weather.condition}${weatherTemperature ? `, ${weatherTemperature}` : ''}` : 'Default ideas'}</strong>
                  <small>{weatherGuidance?.packingTips?.[0] || weather?.message || 'Weather help is turned off or unavailable.'}</small>
                </div> : null}
              </section>

              {showWeatherHelp && weatherGuidance ? (
                <section className="trip-weather-advice">
                  <div>
                    <span><WeatherModeIcon size={17} aria-hidden="true" /></span>
                    <div>
                      <h3>{weatherGuidance.headline}</h3>
                      <p>{weatherGuidance.placeTips?.[0] || weather?.travelTip || 'Use the forecast as a planning signal.'}</p>
                    </div>
                  </div>
                  <ul>
                    {(weatherGuidance.packingTips || []).slice(0, 2).map((tip) => <li key={tip}>{tip}</li>)}
                  </ul>
                </section>
              ) : null}

              {activeDay && (
                <section className="trip-day-editor">
                  <div className="trip-day-heading">
                    <div>
                      <span>{formatDate(activeDay.date)}</span>
                      <input
                        value={activeDay.title || `Day ${activeDay.dayNumber}`}
                        onChange={(event) => updateDayLocal(activeDay.dayNumber, { title: event.target.value })}
                        onBlur={() => saveDay(activeDay)}
                      />
                    </div>
                    <label title="Daily budget for this itinerary day. Item estimates below count against this amount.">
                      <WalletCards size={15} aria-hidden="true" />
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
                  </div>

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
            </div>
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

              <div className="trip-assistant-bar">
                <Sparkles size={16} aria-hidden="true" />
                Ask anything about this trip
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
          <div className="trip-details-map-toolbar">
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
          </div>
          <TripMapPreview className="trip-details-map" places={(addMode || activeTab === 'ideas') && ideaMapPlaces.length ? ideaMapPlaces : mapPlaces} zoom={(addMode || activeTab === 'ideas') ? 8 : undefined} />
          {(addMode || activeTab === 'ideas') && selectedIdea ? (
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
    </section>
  );
}

export default TripDetailsPage;
