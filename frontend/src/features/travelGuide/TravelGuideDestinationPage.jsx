/**
 * Travel Guide module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Compass,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useContext, useEffect, useMemo, useState } from 'react';
import { convertCurrency } from '../../api/currencyApi';
import { getTravelGuideDestinationDetails } from '../../api/travelGuideApi';
import { getVisitedPlaces } from '../../api/visitedPlaceApi';
import PlaceCard from '../../components/place/PlaceCard';
import CurrencyContext from '../../context/currencyContext';
import { buildVisitedLookup, getVisitedPlacePayload } from '../../components/visitedPlaces/visitedPlaceUtils';
import { getApiErrorMessage } from '../../utils/apiError';
import { getPlaceImageSrc } from '../../utils/placeImageProxy';
import { rankPlacesForWeather } from '../../utils/weatherPlaceRanking';
import { formatMoney, getPriceConversionKey } from '../explore/explore.helpers';
import ExploreAiPanel from '../explore/submenus/ExploreAiPanel';
import './TravelGuidePage.css';

// Helper function to get today's date in YYYY-MM-DD format for the date input default
const getDateKey = () => new Date().toISOString().slice(0, 10);

// Helper function to extract a user-friendly error message from API errors
const getErrorMessage = (error) =>
  getApiErrorMessage(error, 'Unable to load this guide right now.');

// Category configuration for filtering places by type
const categoryOptions = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'attractions', label: 'Attractions', icon: Compass },
  { id: 'restaurants', label: 'Restaurants', icon: ChefHat },
  { id: 'hotels', label: 'Hotels', icon: BedDouble },
];

// Formats a date string into a readable localized format
const formatTravelDate = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
};

// Determines the number of images available for a place carousel
const getCarouselImageCount = (item) => item.imageUrls?.length || (item.imageUrl ? 1 : 0);

// Fallback travel images when no place images are available
const fallbackTravelImages = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
];

// Selects a deterministic fallback image based on a label string hash
const getFallbackTravelImage = (label = '') => {
  const imageIndex = [...label].reduce((total, character) => total + character.charCodeAt(0), 0)
    % fallbackTravelImages.length;
  return fallbackTravelImages[imageIndex];
};

// Resilient image component that falls back through multiple candidate URLs
function ResilientTravelImage({ candidates = [], label = '' }) {
  const candidateKey = candidates.filter(Boolean).join('|');
  const imageCandidates = useMemo(
    () => [...new Set([...candidateKey.split('|'), getFallbackTravelImage(label)].filter(Boolean))],
    [candidateKey, label]
  );
  const [failedImages, setFailedImages] = useState(() => new Set());
  const imageUrl = imageCandidates.find((candidate) => !failedImages.has(candidate));

  return imageUrl ? (
    <img
      src={getPlaceImageSrc(imageUrl)}
      alt=""
      onError={() => setFailedImages((currentImages) => new Set([...currentImages, imageUrl]))}
    />
  ) : null;
}

// GuideCarousel renders destination guide rows with the intro panel and shared Explore place cards.
function GuideCarousel({
  id,
  title,
  introTitle,
  introText,
  items,
  rowIndex,
  onMove,
  onMore,
  onMoveCardCarousel,
  getCardCarouselIndex,
  getVisitedRecord,
  getConvertedPriceText,
  getOriginalPriceText,
  onVisitedChange,
}) {
  const visibleCount = 4;
  const visibleItems = items.slice(rowIndex, rowIndex + visibleCount);
  const canMoveBack = rowIndex > 0;
  const canMoveNext = rowIndex + visibleCount < items.length;

  return (
    <section className="travel-guide-carousel-row">
      {/* Intro panel with section title, description, and view more button */}
      <article className="travel-guide-row-intro">
        <h3>{introTitle}</h3>
        <p>{introText}</p>
        <button type="button" onClick={onMore}>View more</button>
      </article>
      
      {/* Carousel container with navigation arrows */}
      <div className="travel-guide-row-carousel">
        {/* Previous arrow button */}
        <button
          className="travel-guide-row-arrow"
          type="button"
          aria-label={`Previous ${title}`}
          disabled={!canMoveBack}
          onClick={() => onMove(id, items, -1)}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        
        {/* Carousel window displaying visible items */}
        <div className="travel-guide-row-window">
          {visibleItems.length ? visibleItems.map((place, index) => (
            <PlaceCard
              carouselIndex={getCardCarouselIndex(place.id || place.name, getCarouselImageCount(place))}
              index={rowIndex + index}
              item={place}
              key={`${title}-${place.id}-${place.name}`}
              convertedPriceText={getConvertedPriceText(place)}
              onMoveCarousel={onMoveCardCarousel}
              onVisitedChange={onVisitedChange}
              originalPriceText={getOriginalPriceText(place)}
              type={id === 'stays' ? 'hotels' : id === 'food' ? 'food' : 'attractions'}
              visitedRecord={getVisitedRecord?.(place, id === 'stays' ? 'hotel' : id === 'food' ? 'restaurant' : 'attraction')}
              visitedSource="travel-guide"
            />
          )) : (
            <div className="travel-guide-mini-empty">
              <p>No results returned for this row.</p>
            </div>
          )}
        </div>
        
        {/* Next arrow button */}
        <button
          className="travel-guide-row-arrow"
          type="button"
          aria-label={`Next ${title}`}
          disabled={!canMoveNext}
          onClick={() => onMove(id, items, 1)}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

// TravelGuideDestinationPage renders the main screen and handles nearby interactions.
function TravelGuideDestinationPage() {
  // Context and URL parameter extraction
  const currency = useContext(CurrencyContext);
  const [searchParams] = useSearchParams();
  const destination = searchParams.get('destination') || '';
  const country = searchParams.get('country') || '';
  const latitude = searchParams.get('latitude') || '';
  const longitude = searchParams.get('longitude') || '';
  
  // State management for user controls and UI state
  const [travelDate, setTravelDate] = useState(getDateKey());
  const [activeCategory, setActiveCategory] = useState('all');
  const [starts, setStarts] = useState({ attractions: 0, restaurants: 0, hotels: 0 });
  const [guide, setGuide] = useState(null);
  const [weatherRankings, setWeatherRankings] = useState({ attractions: null, restaurants: null, hotels: null });
  const [weatherRankingStatus, setWeatherRankingStatus] = useState('idle');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [rowIndexes, setRowIndexes] = useState({ things: 0, stays: 0, food: 0 });
  const [cardCarouselIndexes, setCardCarouselIndexes] = useState({});
  const [priceConversions, setPriceConversions] = useState({});
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  
  // Currency-related derived values
  const selectedCurrency = currency?.selectedCurrency || 'USD';
  const supportedCurrencyCodes = useMemo(() => currency?.currencies?.map((option) => option.code) || [], [currency?.currencies]);
  const destinationLabel = useMemo(() => [destination, country].filter(Boolean).join(', '), [country, destination]);
  
  // Gallery and map configuration
  const gallery = guide?.gallery?.length ? guide.gallery : guide?.heroImageUrl ? [guide.heroImageUrl] : [];
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationLabel || destination)}`;
  const weatherTip = guide?.weather?.travelTip || 'Places are ranked from live guide results and current weather context.';
  const isRefreshingGuide = isLoading && Boolean(guide);
  
  // Categorized place lists based on shared weather-aware AI ranking
  const categories = useMemo(
    () => ({
      attractions: weatherRankings.attractions?.items || guide?.attractions?.items || [],
      restaurants: weatherRankings.restaurants?.items || guide?.restaurants?.items || [],
      hotels: weatherRankings.hotels?.items || guide?.hotels?.items || [],
    }),
    [guide, weatherRankings]
  );
  
  // Lookup for visited places to track user interactions
  const visitedLookup = useMemo(() => buildVisitedLookup(visitedPlaces), [visitedPlaces]);
  const guideItems = useMemo(
    () => [
      ...(guide?.attractions?.items || []),
      ...(guide?.restaurants?.items || []),
      ...(guide?.hotels?.items || []),
    ],
    [guide]
  );
  const panelItems = useMemo(() => {
    if (activeCategory === 'attractions') return categories.attractions;
    if (activeCategory === 'restaurants') return categories.restaurants;
    if (activeCategory === 'hotels') return categories.hotels;
    return [
      ...categories.attractions.slice(0, 6),
      ...categories.restaurants.slice(0, 6),
      ...categories.hotels.slice(0, 6),
    ];
  }, [activeCategory, categories]);
  const activeAi = useMemo(() => {
    const rankings = [weatherRankings.attractions, weatherRankings.restaurants, weatherRankings.hotels].filter(Boolean);
    const availableRankings = rankings.filter((ranking) => ranking.available);

    if (availableRankings.length) {
      return {
        available: true,
        summary: availableRankings.map((ranking) => ranking.summary).filter(Boolean)[0] || 'Weather-aware recommendations are ready.',
        picks: availableRankings.flatMap((ranking) => ranking.picks || []).slice(0, 6),
      };
    }

    return guide?.recommendations || null;
  }, [guide?.recommendations, weatherRankings]);
  
  // Helper to generate section titles
  const getTopTitle = (items, action) => `Top ${Math.min(items.length || 8, 8)} ${action}`;

  // Effect hook for currency conversion of place prices
  useEffect(() => {
    const convertibleItems = guideItems.filter((item) => {
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

    // Batch convert currency for all missing items
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
    ).then((results) => {
      if (!isActive) return;
      setPriceConversions((currentConversions) => ({
        ...currentConversions,
        ...Object.fromEntries(results.map((result) => [result.key, result.value])),
      }));
    });

    return () => {
      isActive = false;
    };
  }, [guideItems, priceConversions, selectedCurrency, supportedCurrencyCodes]);

  // Helper functions for price display
  const getOriginalPriceText = (item) => item.priceDetail?.display || item.price || 'Price unavailable';
  const getConvertedPriceText = (item) => {
    const conversion = priceConversions[getPriceConversionKey(item, selectedCurrency)];
    if (!conversion) {
      return '';
    }
    const convertedAmount = formatMoney(conversion.amount, conversion.currency);
    const convertedMaxAmount =
      conversion.maxAmount !== null ? ` - ${formatMoney(conversion.maxAmount, conversion.currency)}` : '';
    return `Approx. ${convertedAmount}${convertedMaxAmount}`;
  };

  // Get visited record for a specific place
  const getVisitedRecord = (place, type) => {
    const payload = getVisitedPlacePayload({
      item: place,
      type,
      source: 'travel-guide',
      defaultDate: travelDate || getDateKey(),
    });
    return visitedLookup[payload.placeKey];
  };
  
  // Extract weather pick names for recommendation display
  const weatherPickNames = useMemo(() => {
    const picks = [
      ...categories.attractions.slice(0, 2),
      ...categories.restaurants.slice(0, 1),
      ...categories.hotels.slice(0, 1),
    ];
    return picks.map((place) => place.name).filter(Boolean);
  }, [categories]);

  // Primary effect hook for loading guide data
  useEffect(() => {
    let isActive = true;
    const loadGuide = async () => {
      if (!destination) {
        setError('Destination is required.');
        return;
      }

      setIsLoading(true);
      setError('');
      try {
        const response = await getTravelGuideDestinationDetails({
          destination,
          country,
          latitude,
          longitude,
          date: travelDate,
          attractionStart: starts.attractions,
          restaurantStart: starts.restaurants,
          hotelStart: starts.hotels,
        });

        if (isActive) {
          setGuide(response.data.data.guide);
          setGalleryIndex(0);
        }
      } catch (requestError) {
        if (isActive) {
          setError(getErrorMessage(requestError));
          setGuide(null);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    };

    loadGuide();

    // Cleanup prevents state updates after component unmount.
    return () => {
      isActive = false;
    };
  }, [country, destination, latitude, longitude, starts, travelDate]);

  useEffect(() => {
    if (!guide || !guide.weather?.available) {
      setWeatherRankings({ attractions: null, restaurants: null, hotels: null });
      setWeatherRankingStatus('idle');
      return undefined;
    }

    let isActive = true;
    setWeatherRankingStatus('loading');

    Promise.allSettled([
      rankPlacesForWeather({
        items: guide.attractions?.items || [],
        weather: guide.weather,
        trip: { destination: guide.destination, country: guide.country || country },
        day: { location: destinationLabel, date: travelDate },
        category: 'attractions',
      }),
      rankPlacesForWeather({
        items: guide.restaurants?.items || [],
        weather: guide.weather,
        trip: { destination: guide.destination, country: guide.country || country },
        day: { location: destinationLabel, date: travelDate },
        category: 'restaurants',
      }),
      rankPlacesForWeather({
        items: guide.hotels?.items || [],
        weather: guide.weather,
        trip: { destination: guide.destination, country: guide.country || country },
        day: { location: destinationLabel, date: travelDate },
        category: 'hotels',
      }),
    ]).then(([attractionResult, restaurantResult, hotelResult]) => {
      if (!isActive) return;
      setWeatherRankings({
        attractions: attractionResult.status === 'fulfilled' ? attractionResult.value : null,
        restaurants: restaurantResult.status === 'fulfilled' ? restaurantResult.value : null,
        hotels: hotelResult.status === 'fulfilled' ? hotelResult.value : null,
      });
      setWeatherRankingStatus('success');
    }).catch(() => {
      if (!isActive) return;
      setWeatherRankings({ attractions: null, restaurants: null, hotels: null });
      setWeatherRankingStatus('fallback');
    });

    return () => {
      isActive = false;
    };
  }, [country, destinationLabel, guide, travelDate]);

  // Effect hook for loading visited places data
  useEffect(() => {
    let isActive = true;

    getVisitedPlaces()
      .then((response) => {
        if (!isActive) return;
        setVisitedPlaces(response.data?.data?.visitedPlaces || []);
      })
      .catch(() => {
        if (isActive) setVisitedPlaces([]);
      });

    return () => {
      isActive = false;
    };
  }, []);

  // Event handler for visited place changes
  const handleVisitedChange = (visitedPlace) => {
    if (!visitedPlace?.placeKey) return;
    setVisitedPlaces((currentPlaces) => {
      const withoutCurrent = currentPlaces.filter((place) => place.placeKey !== visitedPlace.placeKey);
      return [visitedPlace, ...withoutCurrent];
    });
  };
  
  // Handler for loading more items in a category
  const handleViewMore = (category = activeCategory) => {
    const targetCategory = category === 'all' ? 'attractions' : category;
    const itemCount = guide?.[targetCategory]?.items?.length || 8;

    setIsLoadingMore(true);
    setStarts((current) => ({
      ...current,
      [targetCategory]: current[targetCategory] + itemCount,
    }));
  };
  
  // Gallery navigation handlers
  const moveGallery = (direction) => {
    if (!gallery.length) return;
    setGalleryIndex((current) => (current + direction + gallery.length) % gallery.length);
  };

  // Row carousel navigation handler
  const moveRow = (rowId, items, direction) => {
    setRowIndexes((current) => {
      const maxIndex = Math.max(items.length - 4, 0);
      const nextIndex = Math.max(0, Math.min((current[rowId] || 0) + direction, maxIndex));
      return {
        ...current,
        [rowId]: nextIndex,
      };
    });
  };

  // Card carousel index getter and handler
  const getCardCarouselIndex = (itemId, imageCount) =>
    Math.min(cardCarouselIndexes[itemId] || 0, Math.max(imageCount - 1, 0));

  const moveCardCarousel = (itemId, imageCount, direction) => {
    setCardCarouselIndexes((currentIndexes) => {
      const currentIndex = currentIndexes[itemId] || 0;
      const nextIndex = (currentIndex + direction + imageCount) % imageCount;
      return {
        ...currentIndexes,
        [itemId]: nextIndex,
      };
    });
  };

  // Renders a single category view with grid layout
  const renderSingleCategory = (category) => {
    const option = categoryOptions.find((item) => item.id === category);
    const items = categories[category] || [];
    return (
      <section className="travel-guide-place-section">
        <div className="travel-guide-section-heading">
          <div>
            <span>{option?.label}</span>
            <h3>{option?.label} for {guide.destination}</h3>
          </div>
          <small>{items.length} result{items.length === 1 ? '' : 's'} loaded</small>
        </div>
        <div className="travel-guide-place-grid">
          {items.map((place, index) => (
            <PlaceCard
              index={index}
              item={place}
              key={`${category}-${place.id}-${place.name}`}
              convertedPriceText={getConvertedPriceText(place)}
              onVisitedChange={handleVisitedChange}
              originalPriceText={getOriginalPriceText(place)}
              type={category === 'hotels' ? 'hotels' : category === 'restaurants' ? 'food' : 'attractions'}
              visitedRecord={getVisitedRecord(place, category === 'hotels' ? 'hotel' : category === 'restaurants' ? 'restaurant' : 'attraction')}
              visitedSource="travel-guide"
            />
          ))}
        </div>
        <button className="travel-guide-view-more" type="button" onClick={() => handleViewMore(category)} disabled={isLoadingMore || isLoading}>
          {isLoadingMore ? <LoaderCircle className="travel-guide-spin" size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
          {isLoadingMore ? 'Loading...' : `View more ${option?.Label}`}
        </button>
      </section>
    );
  };

  return (
    <section className="travel-guide-page travel-guide-detail-page">
      {/* Back navigation link */}
      <Link className="travel-guide-back-link" to="/travel-guide">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Travel Guide
      </Link>

      {/* Loading state - initial load */}
      {isLoading && !guide ? (
        <div className="travel-guide-empty travel-guide-full-empty">
          <LoaderCircle className="travel-guide-spin" size={32} aria-hidden="true" />
          <h3>Loading destination guide</h3>
          <p>Fetching attractions, restaurants, hotels, weather, and photos.</p>
        </div>
      ) : error ? (
        // Error state display
        <div className="travel-guide-empty travel-guide-full-empty">
          <Compass size={32} aria-hidden="true" />
          <h3>Guide unavailable</h3>
          <p>{error}</p>
        </div>
      ) : guide ? (
        // Main content - guide data successfully loaded
        <>
          {/* Destination header */}
          <header className="travel-guide-destination-title">
            <span className="travel-guide-location">
              <MapPin size={15} aria-hidden="true" />
              {destinationLabel || guide.destination}
            </span>
            <h2>{guide.destination}</h2>
            <p>{guide.summary?.extract || 'Explore popular places, food spots, hotels, and weather-aware recommendations for this destination.'}</p>
          </header>

          {/* Media row - gallery and map panel */}
          <section className="travel-guide-media-row">
            <div className="travel-guide-gallery">
              <ResilientTravelImage
                candidates={[gallery[galleryIndex], guide.heroImageUrl]}
                label={guide.destination}
              />
              {gallery.length > 1 && (
                <div className="travel-guide-gallery-controls">
                  <button type="button" aria-label="Previous image" onClick={() => moveGallery(-1)}>
                    <ChevronLeft size={16} />
                  </button>
                  <span>{galleryIndex + 1}/{gallery.length}</span>
                  <button type="button" aria-label="Next image" onClick={() => moveGallery(1)}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="travel-guide-map-panel">
              <div className="travel-guide-map-grid" aria-hidden="true">
                <MapPin size={34} />
              </div>
              <div>
                <strong>{guide.destination}</strong>
                <span>{guide.coordinates?.latitude && guide.coordinates?.longitude
                  ? `${Number(guide.coordinates.latitude).toFixed(4)}, ${Number(guide.coordinates.longitude).toFixed(4)}`
                  : destinationLabel}</span>
                <a href={mapUrl} target="_blank" rel="noreferrer">
                  Open map
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>

          <div className="travel-guide-detail-shell">
            <div className="travel-guide-detail-main">
          {/* Weather planner card */}
          <section className="travel-guide-weather-card travel-guide-weather-wide">
            <div className="travel-guide-detail-title">
              <CloudSun size={18} aria-hidden="true" />
              <h3>Weather planner</h3>
              {isRefreshingGuide ? (
                <span className="travel-guide-weather-updating" role="status">
                  <LoaderCircle className="travel-guide-spin" size={14} aria-hidden="true" />
                  Updating forecast
                </span>
              ) : weatherRankingStatus === 'loading' ? (
                <span className="travel-guide-weather-updating" role="status">
                  <LoaderCircle className="travel-guide-spin" size={14} aria-hidden="true" />
                  Ranking places
                </span>
              ) : null}
            </div>
            <div className="travel-guide-weather-layout">
              <label>
                <CalendarDays size={15} aria-hidden="true" />
                <input type="date" value={travelDate} min={getDateKey()} onChange={(event) => setTravelDate(event.target.value)} />
              </label>
              {guide.weather?.available ? (
                <div className="travel-guide-weather-stats">
                  <strong>{Math.round(guide.weather.temperature?.mean ?? guide.weather.temperature?.max ?? 0)} C</strong>
                  <span>{guide.weather.condition}</span>
                  <span>High {Math.round(guide.weather.temperature?.max ?? 0)} C</span>
                  <span>Low {Math.round(guide.weather.temperature?.min ?? 0)} C</span>
                  <span>{guide.weather.precipitation?.probability ?? '--'}% rain</span>
                  <span>{guide.weather.windSpeed?.max ?? '--'} km/h wind</span>
                </div>
              ) : (
                <p>{guide.weather?.message || 'Weather is unavailable for this destination.'}</p>
              )}
            </div>
            <p className="travel-guide-weather-context">
              {guide.weather?.available
                ? `${formatTravelDate(guide.weather.requestedDate || travelDate)} · ${guide.weather.source || 'Weather forecast'}`
                : `Weather requested for ${formatTravelDate(travelDate)}.`}
            </p>
            <div className="travel-guide-weather-recommendations">
              {weatherPickNames.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          </section>

          {/* Smart list cards for quick category navigation */}
          <section className="travel-guide-smart-lists">
            {[
              { label: `Premium stay shortlist in ${guide.destination}`, image: categories.hotels[0]?.imageUrl || guide.heroImageUrl, category: 'hotels' },
              { label: `Best things to do board in ${guide.destination}`, image: categories.attractions[0]?.imageUrl || guide.heroImageUrl, category: 'attractions' },
              { label: `Must-try food trail in ${guide.destination}`, image: categories.restaurants[0]?.imageUrl || guide.heroImageUrl, category: 'restaurants' },
              { label: `Weather-smart picks for ${guide.destination}`, image: gallery[1] || guide.heroImageUrl, category: 'all' },
            ].map((list) => (
              <button className="travel-guide-list-card" type="button" key={list.label} onClick={() => setActiveCategory(list.category)}>
                <ResilientTravelImage candidates={[list.image, guide.heroImageUrl]} label={list.label} />
                <span>Smart list</span>
                <strong>{list.label}</strong>
              </button>
            ))}
          </section>

          {/* Category filter panel */}
          <section className="travel-guide-place-section">
            <div className="travel-guide-category-panel">
              {categoryOptions.map((option) => {
                const OptionIcon = option.icon;
                return (
                  <button
                    className={activeCategory === option.id ? 'active' : ''}
                    type="button"
                    key={option.id}
                    onClick={() => setActiveCategory(option.id)}
                  >
                    <OptionIcon size={16} aria-hidden="true" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Conditional rendering: all categories or single category view */}
          {activeCategory === 'all' ? (
            <>
              {/* Attractions carousel */}
              <GuideCarousel
                id="things"
                title="things"
                introTitle={getTopTitle(categories.attractions, 'to do')}
                introText="Sightseeing ideas ranked around ratings, reviews, and the selected weather mode."
                items={categories.attractions.slice(0, 8)}
                rowIndex={rowIndexes.things || 0}
                getCardCarouselIndex={getCardCarouselIndex}
                getVisitedRecord={getVisitedRecord}
                getConvertedPriceText={getConvertedPriceText}
                getOriginalPriceText={getOriginalPriceText}
                onMove={moveRow}
                onMoveCardCarousel={moveCardCarousel}
                onMore={() => handleViewMore('attractions')}
                onVisitedChange={handleVisitedChange}
              />
              {/* Hotels carousel */}
              <GuideCarousel
                id="stays"
                title="stays"
                introTitle={getTopTitle(categories.hotels, 'to stay')}
                introText="Stay options to compare by rating, location signals, and price visibility."
                items={categories.hotels.slice(0, 8)}
                rowIndex={rowIndexes.stays || 0}
                getCardCarouselIndex={getCardCarouselIndex}
                getVisitedRecord={getVisitedRecord}
                getConvertedPriceText={getConvertedPriceText}
                getOriginalPriceText={getOriginalPriceText}
                onMove={moveRow}
                onMoveCardCarousel={moveCardCarousel}
                onMore={() => handleViewMore('hotels')}
                onVisitedChange={handleVisitedChange}
              />
              {/* Restaurants carousel */}
              <GuideCarousel
                id="food"
                title="food"
                introTitle={getTopTitle(categories.restaurants, 'to eat')}
                introText="Food spots for quick shortlist building, with ratings and review counts when available."
                items={categories.restaurants.slice(0, 8)}
                rowIndex={rowIndexes.food || 0}
                getCardCarouselIndex={getCardCarouselIndex}
                getVisitedRecord={getVisitedRecord}
                getConvertedPriceText={getConvertedPriceText}
                getOriginalPriceText={getOriginalPriceText}
                onMove={moveRow}
                onMoveCardCarousel={moveCardCarousel}
                onMore={() => handleViewMore('restaurants')}
                onVisitedChange={handleVisitedChange}
              />
            </>
          ) : (
            // Single category view
            renderSingleCategory(activeCategory)
          )}
            </div>
            <ExploreAiPanel
              activeAi={activeAi}
              activeOption={{
                id: activeCategory,
                label: activeCategory === 'all'
                  ? 'Travel Guide'
                  : categoryOptions.find((item) => item.id === activeCategory)?.label || 'Travel Guide',
              }}
              canRefresh={false}
              currentLocationName={destinationLabel}
              destinationLabel={destinationLabel}
              isLoading={weatherRankingStatus === 'loading'}
              items={panelItems}
              resultCount={panelItems.length}
              summary={activeAi?.summary || weatherTip}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}

export default TravelGuideDestinationPage;
