/**
 * Explore module.
 * Shared destination detail screen for attractions, hotels, and restaurants.
 */
import { ArrowLeft, Clock, ExternalLink, Heart, Info, LoaderCircle, MapPin, Phone, Search, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addFavorite } from '../../../api/favoriteApi';
import { getPlaceImageSrc } from '../../../utils/placeImageProxy';
import { getErrorMessage } from '../explore.helpers';
import './SharedDetailPage.css';

// Set of values that indicate missing or unavailable price information
const missingPriceValues = new Set(['', '-', 'price unavailable', 'unavailable', 'not provided']);

/**
 * Checks if a price text value contains meaningful price information.
 * 
 * @param {string} value - The price text to check
 * @returns {boolean} True if the price text is meaningful and not missing
 */
const hasPriceText = (value = '') => !missingPriceValues.has(String(value).trim().toLowerCase());

// Approximate currency conversion rates relative to USD for estimation purposes
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

/**
 * Formats a monetary amount using the specified currency code.
 * 
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - The currency code for formatting
 * @returns {string} Formatted currency string
 */
const formatEstimatedMoney = (amount, currencyCode) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  }).format(amount);

/**
 * Generates a deduplication key for an image URL by removing query parameters.
 * 
 * @param {string} imageUrl - The image URL to process
 * @returns {string} A normalized key for deduplication
 */
const getImageDedupeKey = (imageUrl = '') => {
  try {
    const parsedUrl = new URL(imageUrl);
    return `${parsedUrl.origin}${parsedUrl.pathname.replace(/=[^/]+$/i, '')}`;
  } catch {
    return imageUrl.split('?')[0].replace(/=[^/]+$/i, '');
  }
};

/**
 * Filters out duplicate images from an array of image URLs.
 * 
 * @param {Array} images - Array of image URLs
 * @returns {Array} Array of unique image URLs
 */
const getUniqueImages = (images = []) => {
  const seenImageKeys = new Set();
  const hasGoogleImage = images.some((imageUrl) => {
    try {
      return new URL(imageUrl).hostname === 'lh3.googleusercontent.com';
    } catch {
      return false;
    }
  });

  return images.filter((imageUrl) => {
    if (!imageUrl) return false;
    if (hasGoogleImage) {
      try {
        if (new URL(imageUrl).hostname === 'serpapi.com') return false;
      } catch {
        // Keep non-URL values available to the existing dedupe path.
      }
    }
    const key = getImageDedupeKey(imageUrl);
    if (seenImageKeys.has(key)) return false;
    seenImageKeys.add(key);
    return true;
  });
};

/**
 * Retrieves the primary image URL from a place object.
 * 
 * @param {Object} place - The place object
 * @returns {string} The primary image URL
 */
const getPrimaryImage = (place = {}) => place.imageUrl || place.imageUrls?.[0] || '';

/**
 * Retrieves all gallery images from a place object with deduplication.
 * 
 * @param {Object} place - The place object
 * @returns {Array} Array of unique gallery image URLs
 */
const getGalleryImages = (place = {}) =>
  getUniqueImages([place.imageUrl, ...(place.imageUrls || [])]);

// Number of reviews to display per page
const reviewPageSize = 30;

// Color mapping for rating stars
const ratingChartColors = {
  5: '#14b8a6',
  4: '#22c55e',
  3: '#f59e0b',
  2: '#fb923c',
  1: '#ef4444',
};

/**
 * Determines the appropriate currency for a place.
 * 
 * @param {Object} params - Parameters object
 * @param {Object} params.place - The place object
 * @param {string} params.fallbackCurrency - Fallback currency if place has none
 * @returns {string} The currency code
 */
const getCurrencyForPlace = ({ place = {}, fallbackCurrency = 'USD' }) => {
  if (place.priceDetail?.currency) return place.priceDetail.currency;
  return fallbackCurrency || 'USD';
};

/**
 * Generates a unique key for favorite identification.
 * 
 * @param {Object} place - The place object
 * @returns {string} A unique key string
 */
const getFavoriteKey = (place = {}) =>
  String(place.dataId || place.placeId || place.id || place.name || '')
    .trim()
    .toLowerCase();

/**
 * Formats coordinates into a readable string.
 * 
 * @param {Object} coordinates - The coordinates object
 * @param {number} coordinates.latitude - The latitude value
 * @param {number} coordinates.longitude - The longitude value
 * @returns {string} Formatted coordinate string or empty string if invalid
 */
const getCoordinateText = (coordinates = {}) => {
  const latitude = Number(coordinates.latitude);
  const longitude = Number(coordinates.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return '';
  }

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
};

/**
 * Creates a search result description object from place data.
 * 
 * @param {Object} place - The place object
 * @param {string} singularLower - Lowercase singular label
 * @returns {Object} Description object with title, extract, and source information
 */
const getSearchResultDescription = (place = {}, singularLower = 'place') => {
  const ratingText = place.rating
    ? `${Number(place.rating).toFixed(1)} stars${place.reviewCount ? ` from ${Number(place.reviewCount).toLocaleString()} Google reviews` : ''}`
    : '';
  const detailParts = [
    place.category ? `${place.category} ${singularLower}` : `Selected ${singularLower}`,
    ratingText,
    place.openState,
    place.priceDetail?.display || place.price,
  ].filter(Boolean);
  const locationText = place.address ? ` Located at ${place.address}.` : '';

  return {
    available: true,
    title: place.name || `Selected ${singularLower}`,
    extract: `${place.name || `This ${singularLower}`} is a ${detailParts.join(' | ') || singularLower} from the current search results.${locationText}`.replace(/\s+/g, ' ').trim(),
    url: '',
    source: 'search-result',
  };
};

/**
 * Generates highlight items from place data for display.
 * 
 * @param {Object} params - Parameters object
 * @param {Object} params.place - The place object
 * @param {string} params.originalPriceText - Original price text
 * @returns {Array} Array of highlight strings
 */
const getHighlightItems = ({ place = {}, originalPriceText = '' }) =>
  [
    place.rating ? `Rated ${Number(place.rating).toFixed(1)} stars by Google users` : '',
    place.reviewCount ? `${Number(place.reviewCount).toLocaleString()} Google reviews listed` : '',
    originalPriceText || place.priceDetail?.display || place.price ? 'Price information is available' : '',
    place.openState || place.hoursSummary ? `Hours: ${place.openState || place.hoursSummary}` : '',
    place.address ? 'Address is available for trip planning' : '',
    place.category ? `${place.category} category` : '',
  ].filter(Boolean).slice(0, 5);

/**
 * Determines visit timing information based on opening hours.
 * 
 * @param {Object} place - The place object
 * @returns {Object} Timing information with title, detail, and note
 */
const getVisitTimingText = (place = {}) => {
  const hoursText = (place.openState || place.hoursSummary || '').trim();

  if (/open/i.test(hoursText)) {
    return {
      title: 'Current hours shown',
      detail: hoursText,
      note: 'Confirm current timing before departure.',
    };
  }

  if (/closed/i.test(hoursText)) {
    return {
      title: 'Check before visiting',
      detail: hoursText,
      note: 'Plan a nearby backup stop.',
    };
  }

  return {
    title: 'Timing unavailable',
    detail: 'Opening hours were not provided by the search result.',
    note: 'Use the Google listing for current hours.',
  };
};

/**
 * Estimates price range based on place category and currency.
 * 
 * @param {Object} params - Parameters object
 * @param {Object} params.config - Configuration object
 * @param {Object} params.place - The place object
 * @param {string} params.currencyCode - Currency code for formatting
 * @returns {string} Formatted price range or empty string
 */
const getEstimatedPriceText = ({ config, place = {}, currencyCode = 'USD' }) => {
  const category = String(place.category || place.type || '').toLowerCase();
  let usdRange = [];

  if (config.favoriteType === 'hotel') {
    if (category.includes('luxury') || category.includes('suite')) usdRange = [75, 140];
    else if (category.includes('budget') || category.includes('hostel')) usdRange = [18, 40];
    else usdRange = [35, 70];
  }

  if (config.favoriteType === 'restaurant') {
    if (category.includes('fine') || category.includes('steak')) usdRange = [14, 35];
    else if (category.includes('cafe') || category.includes('dessert')) usdRange = [3, 8];
    else usdRange = [4, 12];
  }

  if (!usdRange.length) return '';

  const rate = approximateUsdRates[currencyCode] || approximateUsdRates.USD;
  const [minimum, maximum] = usdRange.map((amount) => amount * rate);
  return `${formatEstimatedMoney(minimum, currencyCode)} - ${formatEstimatedMoney(maximum, currencyCode)}`;
};

/**
 * Generates CSS background for rating pie chart based on rating distribution.
 * 
 * @param {Object} distribution - Rating distribution counts
 * @param {number} totalReviews - Total number of reviews
 * @returns {string} CSS background value for conic gradient
 */
const getRatingPieBackground = (distribution = {}, totalReviews = 0) => {
  if (!totalReviews) return '#e2e8f0';

  let previousPercent = 0;
  const segments = [5, 4, 3, 2, 1].map((rating) => {
    const nextPercent = previousPercent + ((distribution[rating] || 0) / totalReviews) * 100;
    const segment = `${ratingChartColors[rating]} ${previousPercent}% ${nextPercent}%`;
    previousPercent = nextPercent;
    return segment;
  });

  return `conic-gradient(${segments.join(', ')})`;
};

/**
 * ReviewAvatar component for displaying user avatars with fallback.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.review - Review object containing author and avatar information
 * @returns {JSX.Element} Rendered avatar
 */
function ReviewAvatar({ review }) {
  const [hasImageError, setHasImageError] = useState(false);
  const initial = String(review.author || 'G').slice(0, 1).toUpperCase();

  if (review.avatarUrl && !hasImageError) {
    return <img src={review.avatarUrl} alt="" loading="lazy" onError={() => setHasImageError(true)} />;
  }

  return <span>{initial}</span>;
}

/**
 * SharedDestinationDetailPage component.
 * Renders detailed view for attractions, hotels, or restaurants.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.config - Configuration object for the specific detail type
 * @returns {JSX.Element} The rendered detail page
 */
function SharedDestinationDetailPage({
  config,
}) {
  // Navigation and location hooks
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract state from location or initialize as null
  const statePlace = location.state?.[config.stateKey] || null;
  const initialFavoriteKey = getFavoriteKey(statePlace);
  
  // State declarations for place data and UI state
  const [place, setPlace] = useState(statePlace);
  const [description, setDescription] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteKeys, setFavoriteKeys] = useState(location.state?.returnState?.[config.favoriteKeysState] || []);
  const [isFavorite, setIsFavorite] = useState(
    Boolean(initialFavoriteKey && location.state?.returnState?.[config.favoriteKeysState]?.includes(initialFavoriteKey))
  );
  
  // Filter and pagination state for reviews
  const [reviewSearch, setReviewSearch] = useState('');
  const [minRating, setMinRating] = useState('all');
  const [visibleReviewCount, setVisibleReviewCount] = useState(reviewPageSize);
  const [selectedImageSelection, setSelectedImageSelection] = useState({ placeKey: '', index: 0 });

  // Load place details on component mount or when dependencies change
  useEffect(() => {
    let isActive = true;
    const loadPlace = async () => {
      setIsLoading(true);
      setError('');

      if (statePlace) {
        setPlace(statePlace);
        setDescription(getSearchResultDescription(statePlace, config.singularLower));
        setReviews([]);
        setStatus('');
      }

      try {
        const searchParams = new URLSearchParams(location.search);
        const response = await config.getDetails({
          name: statePlace?.name || searchParams.get('name') || '',
          address: statePlace?.address || searchParams.get('address') || '',
          dataId: statePlace?.dataId || searchParams.get('dataId') || '',
          placeId: statePlace?.placeId || searchParams.get('placeId') || '',
        });
        const detail = response.data.data[config.responseKey];

        if (!isActive) return;
        setPlace(detail.item || null);
        setDescription(detail.description);
        setReviews(detail.reviews?.items || []);
        setStatus(detail.message || detail.reviews?.message || '');
      } catch (requestError) {
        if (isActive) setError(getErrorMessage(requestError));
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadPlace();
    return () => {
      isActive = false;
    };
  }, [config, location.search, statePlace]);

  // Filter reviews based on search query and minimum rating
  const filteredReviews = useMemo(() => {
    const query = reviewSearch.trim().toLowerCase();
    const selectedRating = minRating === 'all' ? 0 : Number(minRating);

    return reviews.filter((review) => {
      const matchesRating = !selectedRating || Math.round(Number(review.rating || 0)) === selectedRating;
      const matchesText =
        !query ||
        review.author?.toLowerCase().includes(query) ||
        review.text?.toLowerCase().includes(query) ||
        review.ownerReply?.text?.toLowerCase().includes(query);
      return matchesRating && matchesText;
    });
  }, [minRating, reviewSearch, reviews]);
  
  // Calculate rating distribution from reviews
  const ratingDistribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    reviews.forEach((review) => {
      const rating = Math.max(1, Math.min(5, Math.round(Number(review.rating || 0))));
      if (counts[rating] !== undefined) counts[rating] += 1;
    });

    return counts;
  }, [reviews]);

  /**
   * Handles adding the place to favorites
   */
  const handleFavorite = async () => {
    if (!place || isFavorite) return;
    try {
      await addFavorite({
        type: config.favoriteType,
        title: place.name,
        description: place.address,
        address: place.address,
        coordinates: place.coordinates,
        priceLevel: location.state?.originalPriceText || place.priceDetail?.display || place.price,
        rating: place.rating,
        externalId: place.dataId || place.placeId || place.id || place.name,
        source: config.favoriteSource,
      });
      setIsFavorite(true);
      const nextFavoriteKeys = [getFavoriteKey(statePlace), getFavoriteKey(place)].filter(Boolean);
      setFavoriteKeys((currentKeys) => [...new Set([...currentKeys, ...nextFavoriteKeys])]);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };
  
  // Process gallery images and determine current selection
  const galleryImages = getGalleryImages(place);
  const selectedImagePlaceKey = String(place?.id || place?.dataId || place?.placeId || place?.name || '');
  const selectedImageIndex =
    selectedImageSelection.placeKey === selectedImagePlaceKey ? selectedImageSelection.index : 0;
  const primaryImage = galleryImages[selectedImageIndex] || getPrimaryImage(place);
  const primaryImageSrc = getPlaceImageSrc(primaryImage);
  const openedFromSearchResult = description?.source === 'search-result';
  const highlightItems = getHighlightItems({
    place,
    originalPriceText: location.state?.originalPriceText,
  });
  const visitTiming = getVisitTimingText(place);
  
  // Price handling and display logic
  const providerOriginalPrice = location.state?.originalPriceText || place?.priceDetail?.display || place?.price || '';
  const selectedCurrency = location.state?.selectedCurrency || 'USD';
  const estimateCurrency = getCurrencyForPlace({ place, fallbackCurrency: selectedCurrency });
  const estimatedPrice = hasPriceText(providerOriginalPrice) ? '' : getEstimatedPriceText({ config, place, currencyCode: estimateCurrency });
  const estimatedConvertedPrice = hasPriceText(providerOriginalPrice) ? '' : getEstimatedPriceText({ config, place, currencyCode: selectedCurrency });
  const originalPriceValue = hasPriceText(providerOriginalPrice) ? providerOriginalPrice : estimatedPrice || '-';
  const convertedPriceValue = hasPriceText(location.state?.convertedPriceText) ? location.state.convertedPriceText : estimatedConvertedPrice || '-';
  const originalPriceLabel = estimatedPrice ? 'AI price estimate' : 'Original price';
  const convertedPriceLabel = estimatedConvertedPrice && !hasPriceText(location.state?.convertedPriceText) ? 'AI converted estimate' : 'Converted price';
  
  // Information cards configuration
  const infoCards = [
    {
      label: originalPriceLabel,
      value: originalPriceValue,
      helper: estimatedPrice ? 'Provider price was unavailable' : 'Local search result',
      icon: Info,
    },
    {
      label: convertedPriceLabel,
      value: convertedPriceValue,
      helper: convertedPriceValue === '-' ? 'Conversion unavailable' : 'Converted from original price',
      icon: Info,
    },
    {
      label: 'Category',
      value: place?.category || place?.type || config.singularLabel,
      helper: config.singularLabel,
      icon: config.icon,
    },
    {
      label: 'Open hours',
      value: place?.openState || place?.hoursSummary || 'Not provided',
      helper: place?.hoursSummary && place.hoursSummary !== place.openState ? place.hoursSummary : 'Check listing before going',
      icon: Clock,
    },
    {
      label: 'Phone',
      value: place?.phone || 'Not provided',
      helper: place?.phone ? 'Tap listing for more contact options' : 'Contact unavailable',
      icon: Phone,
    },
    {
      label: 'Address',
      value: place?.address || 'Not provided',
      helper: 'Use for trip planning',
      icon: MapPin,
    },
    {
      label: 'Coordinates',
      value: getCoordinateText(place?.coordinates) || 'Not provided',
      helper: 'Map-ready location',
      icon: MapPin,
    },
  ];
  
  // Photo and review display data
  const photoHighlights = galleryImages.length ? galleryImages : primaryImage ? [primaryImage] : [];
  const displayedReviews = filteredReviews.slice(0, visibleReviewCount);
  const hiddenReviewCount = Math.max(filteredReviews.length - displayedReviews.length, 0);
  const reviewAverage = reviews.length
    ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
    : Number(place?.rating || 0);
  const ratingPieBackground = getRatingPieBackground(ratingDistribution, reviews.length);
  
  // Empty state messages
  const reviewEmptyTitle = openedFromSearchResult ? 'Review snippets unavailable' : 'No review snippets loaded';
  const reviewEmptyText = status || (
    openedFromSearchResult
      ? 'The detail response did not include review snippets. Open the Google listing to read reviews for this place.'
      : 'Google review snippets need a Google place identifier. Use the Google listing link when review text is needed.'
  );
  
  // Navigation return state preparation
  const returnSearch = location.state?.returnState?.returnSearch || config.returnSearch;
  const returnPath = `/explore?${returnSearch || config.returnSearch}`;
  const returnState = location.state?.returnState
    ? {
        ...location.state.returnState,
        [config.favoriteKeysState]: favoriteKeys,
      }
    : null;
  const PlaceholderIcon = config.icon;

  return (
    <section className="shared-detail-page">
      {/* Back navigation button */}
      <button className="shared-detail-back" type="button" onClick={() => navigate(returnPath, { state: returnState })}>
        <ArrowLeft size={17} />
        Back to {config.backLabel}
      </button>

      {/* Loading state */}
      {isLoading && (
        <div className="explore-empty shared-detail-loading">
          <LoaderCircle className="explore-spin" size={34} aria-hidden="true" />
          <p>Loading {config.singularLower} details and reviews.</p>
        </div>
      )}

      {/* Error display */}
      {error && <p className="form-error explore-status">{error}</p>}

      {/* Main content when place data is available */}
      {place && !isLoading && (
        <>
          {/* Hero section with image and key information */}
          <section className="shared-detail-hero">
            <div className="shared-detail-media">
              <div className="shared-detail-main-image">
                {primaryImage ? (
                  <img src={primaryImageSrc} alt="" />
                ) : (
                  <div className="shared-detail-image-placeholder">
                    <PlaceholderIcon size={42} aria-hidden="true" />
                  </div>
                )}
                {photoHighlights.length > 1 && <span className="shared-detail-photo-count">{selectedImageIndex + 1} / {photoHighlights.length}</span>}
              </div>
              {/* Thumbnail row for image gallery navigation */}
              {photoHighlights.length > 1 && (
                <div className="shared-detail-thumb-row" aria-label={`${place.name} photo thumbnails`}>
                  {photoHighlights.map((imageUrl, index) => (
                    <button
                      className={`shared-detail-thumb ${selectedImageIndex === index ? 'active' : ''}`}
                      key={`${imageUrl}-${index}`}
                      type="button"
                      onClick={() => setSelectedImageSelection({ placeKey: selectedImagePlaceKey, index })}
                    >
                      <img src={getPlaceImageSrc(imageUrl)} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="shared-detail-hero-copy">
              <div className="shared-detail-title-block">
                <span className="explore-category">{config.singularLabel}</span>
                <h2>{place.name}</h2>
                <div className="shared-detail-rating-row">
                  <span>
                    <Star size={16} fill="currentColor" aria-hidden="true" />
                    {place.rating ? Number(place.rating).toFixed(1) : 'No rating'}
                  </span>
                  <span>{place.reviewCount ? `${Number(place.reviewCount).toLocaleString()} Google reviews` : 'No review count'}</span>
                </div>
              </div>
              
              {/* Information grid displaying all detail cards */}
              <div className="shared-detail-info-grid">
                {infoCards.map((card) => {
                  const CardIcon = card.icon;

                  return (
                    <article key={card.label}>
                      <CardIcon size={18} aria-hidden="true" />
                      <div>
                        <span>{card.label}</span>
                        <strong>{card.value}</strong>
                        <small>{card.helper}</small>
                      </div>
                    </article>
                  );
                })}
              </div>
              
              {/* Action buttons for favorite and external link */}
              <div className="shared-detail-actions">
                <button type="button" onClick={handleFavorite} className={isFavorite ? 'active' : ''}>
                  <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
                  {isFavorite ? 'Saved' : 'Add to favourites'}
                </button>
                {place.url && (
                  <a href={place.url} target="_blank" rel="noreferrer">
                    <ExternalLink size={17} />
                    Google listing
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Feature grid with description, highlights, and visit timing */}
          <section className="shared-detail-feature-grid">
            <article className="shared-detail-panel">
              <h3>About this place</h3>
              <p>{description?.extract || `A Wikipedia description is not available for this ${config.singularLower} yet.`}</p>
              {description?.url && (
                <a href={description.url} target="_blank" rel="noreferrer">
                  Read on Wikipedia
                </a>
              )}
            </article>

            <article className="shared-detail-panel">
              <h3>Highlights</h3>
              <ul className="shared-detail-highlight-list">
                {highlightItems.length ? (
                  highlightItems.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>More highlights appear when provider data is available.</li>
                )}
              </ul>
            </article>

            <article className="shared-detail-panel shared-detail-visit-card">
              <h3>Best time to visit</h3>
              <strong>{visitTiming.title}</strong>
              <p>{visitTiming.detail}</p>
              <small>{visitTiming.note}</small>
            </article>
          </section>

          {/* Reviews section with filtering and rating summary */}
          <section className="shared-detail-reviews">
            <div className="shared-detail-reviews-heading">
              <div>
                <span className="explore-category">Google reviews</span>
                <h3>{reviews.length ? `${filteredReviews.length} filtered review${filteredReviews.length === 1 ? '' : 's'}` : `${place.reviewCount ? Number(place.reviewCount).toLocaleString() : '0'} Google review${Number(place.reviewCount || 0) === 1 ? '' : 's'}`}</h3>
              </div>
              {/* Review filter controls */}
              {reviews.length > 0 && (
                <div className="shared-detail-review-filters">
                  <label>
                    <Search size={15} aria-hidden="true" />
                    <input
                      type="search"
                      value={reviewSearch}
                      onChange={(event) => {
                        setReviewSearch(event.target.value);
                        setVisibleReviewCount(reviewPageSize);
                      }}
                      placeholder="Filter reviews"
                    />
                  </label>
                  <select
                    value={minRating}
                    onChange={(event) => {
                      setMinRating(event.target.value);
                      setVisibleReviewCount(reviewPageSize);
                    }}
                  >
                    <option value="all">All ratings</option>
                    <option value="5">5 stars</option>
                    <option value="4">4 stars</option>
                    <option value="3">3 stars</option>
                    <option value="2">2 stars</option>
                    <option value="1">1 star</option>
                  </select>
                </div>
              )}
            </div>

            {/* Rating summary with pie chart and bar chart */}
            {reviews.length > 0 && (
              <div className="shared-detail-rating-summary" aria-label="Google review rating distribution">
                <div className="shared-detail-rating-score">
                  <span>Average rating</span>
                  <strong>{reviewAverage ? reviewAverage.toFixed(1) : '0.0'}</strong>
                  <div aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        fill={reviewAverage >= star - 0.25 ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                  <small>{reviews.length.toLocaleString()} loaded review{reviews.length === 1 ? '' : 's'}</small>
                </div>

                <div className="shared-detail-rating-pie-wrap">
                  <div
                    className="shared-detail-rating-pie"
                    style={{ background: ratingPieBackground }}
                    aria-hidden="true"
                  >
                    <span>{reviews.length}</span>
                  </div>
                  <div className="shared-detail-rating-legend">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <button
                        className={minRating === String(rating) ? 'active' : ''}
                        key={rating}
                        type="button"
                        onClick={() => {
                          setMinRating((currentRating) => (currentRating === String(rating) ? 'all' : String(rating)));
                          setVisibleReviewCount(reviewPageSize);
                        }}
                      >
                        <i style={{ background: ratingChartColors[rating] }} />
                        <span>{rating} star</span>
                        <strong>{ratingDistribution[rating] || 0}</strong>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="shared-detail-rating-chart">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = ratingDistribution[rating] || 0;
                    const percentage = reviews.length ? Math.round((count / reviews.length) * 100) : 0;

                    return (
                      <button
                        className={minRating === String(rating) ? 'active' : ''}
                        key={rating}
                        type="button"
                        onClick={() => {
                          setMinRating((currentRating) => (currentRating === String(rating) ? 'all' : String(rating)));
                          setVisibleReviewCount(reviewPageSize);
                        }}
                      >
                        <span>{rating} star</span>
                        <div>
                          <i style={{ width: `${percentage}%`, background: ratingChartColors[rating] }} />
                        </div>
                        <strong>{percentage}%</strong>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Review list display */}
            <div className="shared-detail-review-list">
              {displayedReviews.map((review) => (
                <article className="shared-detail-review" key={review.id}>
                  <div className="shared-detail-review-author">
                    <ReviewAvatar review={review} />
                    <div>
                      {review.authorLink ? (
                        <a href={review.authorLink} target="_blank" rel="noreferrer">{review.author}</a>
                      ) : (
                        <strong>{review.author}</strong>
                      )}
                      <small>Google account</small>
                    </div>
                    <em>
                      <Star size={14} fill="currentColor" />
                      {review.rating || 'No rating'}
                    </em>
                  </div>
                  {review.date && <small className="shared-detail-review-date">{review.date}</small>}
                  <p>{review.text || 'No written review provided.'}</p>
                  {/* Owner reply section if available */}
                  {review.ownerReply?.text && (
                    <div className="shared-detail-owner-reply">
                      <strong>{review.ownerReply.author || 'Owner response'}</strong>
                      {review.ownerReply.date && <small>{review.ownerReply.date}</small>}
                      <p>{review.ownerReply.text}</p>
                    </div>
                  )}
                </article>
              ))}
              {/* Empty state when no reviews match filters */}
              {!filteredReviews.length && (
                <article className="shared-detail-review-empty">
                  <Info size={22} aria-hidden="true" />
                  <div>
                    <strong>{reviewEmptyTitle}</strong>
                    <p>{reviewEmptyText}</p>
                  </div>
                </article>
              )}
            </div>
            
            {/* Load more button for paginated reviews */}
            {hiddenReviewCount > 0 && (
              <button
                className="shared-detail-load-more"
                type="button"
                onClick={() => setVisibleReviewCount((currentCount) => currentCount + reviewPageSize)}
              >
                Load {Math.min(reviewPageSize, hiddenReviewCount)} more review{Math.min(reviewPageSize, hiddenReviewCount) === 1 ? '' : 's'}
                <span>{displayedReviews.length} of {filteredReviews.length} shown</span>
              </button>
            )}
          </section>
        </>
      )}
    </section>
  );
}

export default SharedDestinationDetailPage;
