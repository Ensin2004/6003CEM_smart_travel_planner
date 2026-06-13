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
  CloudRain,
  CloudSun,
  Compass,
  ExternalLink,
  Flame,
  LoaderCircle,
  MapPin,
  Sparkles,
  Sun,
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
import { formatMoney, getPriceConversionKey } from '../explore/explore.helpers';
import './TravelGuidePage.css';
const getDateKey = () => new Date().toISOString().slice(0, 10);
const getErrorMessage = (error) =>
  getApiErrorMessage(error, 'Unable to load this guide right now.');

const categoryOptions = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'attractions', label: 'Attractions', icon: Compass },
  { id: 'restaurants', label: 'Restaurants', icon: ChefHat },
  { id: 'hotels', label: 'Hotels', icon: BedDouble },
];

const weatherOptions = [
  { id: 'overall', label: 'Overall', icon: CloudSun, tip: 'Balanced choices using the live guide results.' },
  { id: 'rainy', label: 'Rainy', icon: CloudRain, tip: 'Prioritizes indoor attractions, food stops, and easy hotel backups.' },
  { id: 'sunny', label: 'Sunny', icon: Sun, tip: 'Prioritizes outdoor sights, viewpoints, and flexible walking routes.' },
  { id: 'cloudy', label: 'Cloudy', icon: CloudSun, tip: 'Keeps outdoor plans open while favoring places with easier backup options.' },
  { id: 'hot', label: 'Hot', icon: Flame, tip: 'Prioritizes shaded, air-conditioned, and lower-transfer plans.' },
];
const getWeatherScore = (place, scenario, category) => {
  if (scenario === 'overall') return Number(place.rating || 0);

  const text = [place.name, place.category, place.address].join(' ').toLowerCase();
  const rating = Number(place.rating || 0);
  const indoorBoost = /(museum|mall|gallery|restaurant|hotel|cafe|indoor|shopping)/.test(text) ? 2 : 0;
  const outdoorBoost = /(park|garden|beach|trail|view|tower|zoo|island|waterfall)/.test(text) ? 2 : 0;
  const foodBoost = category === 'restaurants' ? 1.5 : 0;
  const hotelBoost = category === 'hotels' ? 1.5 : 0;

  if (scenario === 'rainy') return rating + indoorBoost + foodBoost + hotelBoost;
  if (scenario === 'sunny') return rating + outdoorBoost;
  if (scenario === 'cloudy') return rating + outdoorBoost * 0.7 + indoorBoost * 0.5;
  if (scenario === 'hot') return rating + indoorBoost + foodBoost + hotelBoost;
  return rating;
};
const sortForWeather = (items, scenario, category) =>
  [...items].sort((first, second) => getWeatherScore(second, scenario, category) - getWeatherScore(first, scenario, category));
const getCarouselImageCount = (item) => item.imageUrls?.length || (item.imageUrl ? 1 : 0);
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
      <article className="travel-guide-row-intro">
        <h3>{introTitle}</h3>
        <p>{introText}</p>
        <button type="button" onClick={onMore}>View more</button>
      </article>
      <div className="travel-guide-row-carousel">
        <button
          className="travel-guide-row-arrow"
          type="button"
          aria-label={`Previous ${title}`}
          disabled={!canMoveBack}
          onClick={() => onMove(id, items, -1)}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
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
  const currency = useContext(CurrencyContext);
  const [searchParams] = useSearchParams();
  const destination = searchParams.get('destination') || '';
  const country = searchParams.get('country') || '';
  const latitude = searchParams.get('latitude') || '';
  const longitude = searchParams.get('longitude') || '';
  const [travelDate, setTravelDate] = useState(getDateKey());
  const [activeCategory, setActiveCategory] = useState('all');
  const [weatherScenario, setWeatherScenario] = useState('overall');
  const [starts, setStarts] = useState({ attractions: 0, restaurants: 0, hotels: 0 });
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [rowIndexes, setRowIndexes] = useState({ things: 0, stays: 0, food: 0 });
  const [cardCarouselIndexes, setCardCarouselIndexes] = useState({});
  const [priceConversions, setPriceConversions] = useState({});
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const selectedCurrency = currency?.selectedCurrency || 'USD';
  const supportedCurrencyCodes = useMemo(() => currency?.currencies?.map((option) => option.code) || [], [currency?.currencies]);
  const destinationLabel = useMemo(() => [destination, country].filter(Boolean).join(', '), [country, destination]);
  const gallery = guide?.gallery?.length ? guide.gallery : guide?.heroImageUrl ? [guide.heroImageUrl] : [];
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationLabel || destination)}`;
  const weatherTip = weatherOptions.find((option) => option.id === weatherScenario)?.tip;
  const categories = useMemo(
    () => ({
      attractions: sortForWeather(guide?.attractions?.items || [], weatherScenario, 'attractions'),
      restaurants: sortForWeather(guide?.restaurants?.items || [], weatherScenario, 'restaurants'),
      hotels: sortForWeather(guide?.hotels?.items || [], weatherScenario, 'hotels'),
    }),
    [guide, weatherScenario]
  );
  const visitedLookup = useMemo(() => buildVisitedLookup(visitedPlaces), [visitedPlaces]);
  const guideItems = useMemo(
    () => [
      ...(guide?.attractions?.items || []),
      ...(guide?.restaurants?.items || []),
      ...(guide?.hotels?.items || []),
    ],
    [guide]
  );
  const getTopTitle = (items, action) => `Top ${Math.min(items.length || 8, 8)} ${action}`;

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

  const getVisitedRecord = (place, type) => {
    const payload = getVisitedPlacePayload({
      item: place,
      type,
      source: 'travel-guide',
      defaultDate: travelDate || getDateKey(),
    });
    return visitedLookup[payload.placeKey];
  };
  const weatherPickNames = useMemo(() => {
    const picks = [
      ...categories.attractions.slice(0, 2),
      ...categories.restaurants.slice(0, 1),
      ...categories.hotels.slice(0, 1),
    ];

    return picks.map((place) => place.name).filter(Boolean);
  }, [categories]);
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

  const handleVisitedChange = (visitedPlace) => {
    if (!visitedPlace?.placeKey) return;
    setVisitedPlaces((currentPlaces) => {
      const withoutCurrent = currentPlaces.filter((place) => place.placeKey !== visitedPlace.placeKey);
      return [visitedPlace, ...withoutCurrent];
    });
  };
  const handleViewMore = (category = activeCategory) => {
    const targetCategory = category === 'all' ? 'attractions' : category;
    const itemCount = guide?.[targetCategory]?.items?.length || 8;

    setIsLoadingMore(true);
    setStarts((current) => ({
      ...current,
      [targetCategory]: current[targetCategory] + itemCount,
    }));
  };
  const moveGallery = (direction) => {
    if (!gallery.length) return;
    setGalleryIndex((current) => (current + direction + gallery.length) % gallery.length);
  };

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
          {isLoadingMore ? 'Loading...' : `View more ${option?.label}`}
        </button>
      </section>
    );
  };
  return (
    <section className="travel-guide-page travel-guide-detail-page">
      <Link className="travel-guide-back-link" to="/travel-guide">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Travel Guide
      </Link>

      {isLoading && !guide ? (
        <div className="travel-guide-empty travel-guide-full-empty">
          <LoaderCircle className="travel-guide-spin" size={32} aria-hidden="true" />
          <h3>Loading destination guide</h3>
          <p>Fetching attractions, restaurants, hotels, weather, and photos.</p>
        </div>
      ) : error ? (
        <div className="travel-guide-empty travel-guide-full-empty">
          <Compass size={32} aria-hidden="true" />
          <h3>Guide unavailable</h3>
          <p>{error}</p>
        </div>
      ) : guide ? (
        <>
          <header className="travel-guide-destination-title">
            <span className="travel-guide-location">
              <MapPin size={15} aria-hidden="true" />
              {destinationLabel || guide.destination}
            </span>
            <h2>{guide.destination}</h2>
            <p>{guide.summary?.extract || 'Explore popular places, food spots, hotels, and weather-aware recommendations for this destination.'}</p>
          </header>

          <section className="travel-guide-media-row">
            <div className="travel-guide-gallery">
              <img src={gallery[galleryIndex] || guide.heroImageUrl} alt="" />
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

          <section className="travel-guide-weather-card travel-guide-weather-wide">
            <div className="travel-guide-detail-title">
              <CloudSun size={18} aria-hidden="true" />
              <h3>Weather planner</h3>
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
            <div className="travel-guide-weather-options" aria-label="Weather planning mode">
              {weatherOptions.map((option) => {
                const OptionIcon = option.icon;
                return (
                  <button
                    className={weatherScenario === option.id ? 'active' : ''}
                    type="button"
                    key={option.id}
                    onClick={() => setWeatherScenario(option.id)}
                  >
                    <OptionIcon size={16} aria-hidden="true" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="travel-guide-ai-card travel-guide-ai-wide">
            <div className="travel-guide-detail-title">
              <Sparkles size={18} aria-hidden="true" />
              <h3>{weatherOptions.find((option) => option.id === weatherScenario)?.label} recommendations</h3>
            </div>
            <p>{weatherTip} {guide.recommendations?.summary || ''}</p>
            <div className="travel-guide-weather-recommendations">
              {weatherPickNames.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
            <div className="travel-guide-ai-picks">
              {(guide.recommendations?.picks || []).map((pick) => (
                <span key={`${pick.itemName}-${pick.score}`}>
                  <strong>{pick.itemName}</strong>
                  {pick.reason}
                </span>
              ))}
            </div>
          </section>

          <section className="travel-guide-smart-lists">
            {[
              { label: `Premium stay shortlist in ${guide.destination}`, image: categories.hotels[0]?.imageUrl || guide.heroImageUrl, category: 'hotels' },
              { label: `Best things to do board in ${guide.destination}`, image: categories.attractions[0]?.imageUrl || guide.heroImageUrl, category: 'attractions' },
              { label: `Must-try food trail in ${guide.destination}`, image: categories.restaurants[0]?.imageUrl || guide.heroImageUrl, category: 'restaurants' },
              { label: `Weather-smart picks for ${guide.destination}`, image: gallery[1] || guide.heroImageUrl, category: 'all' },
            ].map((list) => (
              <button className="travel-guide-list-card" type="button" key={list.label} onClick={() => setActiveCategory(list.category)}>
                <img src={list.image} alt="" />
                <span>Smart list</span>
                <strong>{list.label}</strong>
              </button>
            ))}
          </section>

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

          {activeCategory === 'all' ? (
            <>
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
            renderSingleCategory(activeCategory)
          )}
        </>
      ) : null}
    </section>
  );
}

export default TravelGuideDestinationPage;
