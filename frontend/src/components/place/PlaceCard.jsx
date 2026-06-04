/**
 * Place Card module.
 * Exports and local helpers keep related behavior in a single module.
 */
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Image,
  MapPin,
  MapPinned,
  Phone,
  Star,
  Utensils,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addFavorite, removeFavorite } from '../../api/favoriteApi';
import CompareButton from '../compare/CompareButton';
import VisitedPlaceControl from '../visitedPlaces/VisitedPlaceControl';
import { getVisitedPlacePayload } from '../visitedPlaces/visitedPlaceUtils';
import { buildPlaceFavoritePayload } from '../../utils/favoriteUtils';
import { getPlaceImageSrc } from '../../utils/placeImageProxy';
import './PlaceCard.css';
const getOpenStatus = (openState = '') => {
  const normalizedState = openState.toLowerCase();

  if (normalizedState.includes('closed')) {
    return { label: 'Closed', tone: 'closed' };
  }

  if (normalizedState.includes('open')) {
    return { label: 'Open now', tone: 'open' };
  }

  return { label: 'Hours unknown', tone: 'unknown' };
};
const missingPriceValues = new Set(['', '-', 'price unavailable', 'unavailable', 'not provided']);
const hasPriceText = (value = '') => !missingPriceValues.has(String(value).trim().toLowerCase());
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
const getCurrencyForPlace = ({ item = {}, fallbackCurrency = 'USD' }) => {
  if (item.priceDetail?.currency) return item.priceDetail.currency;
  return fallbackCurrency || 'USD';
};
const formatEstimatedMoney = (amount, currencyCode) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  }).format(amount);
const convertEstimateRange = (range, currencyCode) => {
  const rate = approximateUsdRates[currencyCode] || approximateUsdRates.USD;
  return range.map((amount) => amount * rate);
};
const getEstimatedPriceText = ({ type, category = '', currencyCode = 'USD' }) => {
  const normalizedCategory = category.toLowerCase();
  let usdRange = [];

  if (type === 'hotels') {
    if (normalizedCategory.includes('luxury') || normalizedCategory.includes('suite')) usdRange = [75, 140];
    else if (normalizedCategory.includes('budget') || normalizedCategory.includes('hostel')) usdRange = [18, 40];
    else usdRange = [35, 70];
  }

  if (type === 'food' || type === 'restaurants') {
    if (normalizedCategory.includes('fine') || normalizedCategory.includes('steak')) usdRange = [14, 35];
    else if (normalizedCategory.includes('cafe') || normalizedCategory.includes('dessert')) usdRange = [3, 8];
    else usdRange = [4, 12];
  }

  if (!usdRange.length) return '';

  const [minimum, maximum] = convertEstimateRange(usdRange, currencyCode);
  return `${formatEstimatedMoney(minimum, currencyCode)} - ${formatEstimatedMoney(maximum, currencyCode)}`;
};
const getImageDedupeKey = (imageUrl = '') => {
  try {
    const parsedUrl = new URL(imageUrl);
    return `${parsedUrl.origin}${parsedUrl.pathname.replace(/=[^/]+$/i, '')}`;
  } catch {
    return imageUrl.split('?')[0].replace(/=[^/]+$/i, '');
  }
};
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
// StarRating renders the main screen and handles nearby interactions.
function StarRating({ rating }) {
  const normalizedRating = Math.max(0, Math.min(Number(rating) || 0, 5));
  return (
    <div className="explore-star-rating" aria-label={`${normalizedRating || 'No'} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fillPercent = Math.max(0, Math.min(normalizedRating - (star - 1), 1)) * 100;
        return (
          <span className="explore-star" key={star} aria-hidden="true">
            <Star size={16} />
            <span style={{ width: `${fillPercent}%` }}>
              <Star size={16} fill="currentColor" />
            </span>
          </span>
        );
      })}
    </div>
  );
}
// PlaceCard renders the main screen and handles nearby interactions.
function PlaceCard({
  item,
  index = 0,
  type = 'attractions',
  categoryLabel,
  originalPriceText,
  convertedPriceText = '',
  selectedCurrency = 'USD',
  isInitiallyFavorite = false,
  favoriteRecord,
  onFavoriteChange,
  returnState,
  visitedRecord,
  onVisitedChange,
  visitedSource,
  visitedDefaultDate,
}) {
  const navigate = useNavigate();
  const galleryImages = useMemo(() => {
    const imageCandidates = item.imageUrls?.length ? [item.imageUrl, ...item.imageUrls] : [item.imageUrl];
    return getUniqueImages(imageCandidates);
  }, [item.imageUrl, item.imageUrls]);
  const [failedImages, setFailedImages] = useState(() => new Set());
  const visibleImages = useMemo(
    () => galleryImages.filter((imageUrl) => imageUrl && !failedImages.has(imageUrl)),
    [failedImages, galleryImages]
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const normalizedImageIndex = activeImageIndex % Math.max(visibleImages.length, 1);
  const primaryImage = visibleImages[normalizedImageIndex];
  const primaryImageSrc = getPlaceImageSrc(primaryImage);
  const openStatus = getOpenStatus(item.openState);
  const isHotelCard = type === 'hotels';
  const isFoodCard = type === 'food' || type === 'restaurants';
  const isAttractionCard = type === 'attractions';
  const canOpenDetails = isHotelCard || isFoodCard || isAttractionCard;
  const visitedType = isHotelCard ? 'hotel' : isFoodCard ? 'restaurant' : type === 'food' ? 'food' : 'attraction';
  const visitedPayload = getVisitedPlacePayload({
    item,
    type: visitedType,
    source: visitedSource || `explore-${type}`,
    defaultDate: visitedDefaultDate,
  });
  const [favoriteOverride, setFavoriteOverride] = useState(null);
  const [currentFavoriteRecord, setCurrentFavoriteRecord] = useState(null);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const effectiveFavoriteRecord = currentFavoriteRecord || favoriteRecord;
  const isFavorite = favoriteOverride ?? (Boolean(effectiveFavoriteRecord?._id) || isInitiallyFavorite);
  const priceIcon =
    type === 'hotels' ? (
      <Building2 size={16} aria-hidden="true" />
    ) : type === 'food' || type === 'restaurants' ? (
      <Utensils size={16} aria-hidden="true" />
    ) : (
      <MapPinned size={16} aria-hidden="true" />
    );
  const categoryText = categoryLabel || item.category || item.type || 'Place';
  const providerOriginalPrice = originalPriceText || item.priceDetail?.display || item.price || '';
  const hasProviderOriginalPrice = hasPriceText(providerOriginalPrice);
  const estimateCurrency = getCurrencyForPlace({ item, fallbackCurrency: selectedCurrency });
  const estimatedPrice = !isAttractionCard && !hasProviderOriginalPrice
    ? getEstimatedPriceText({ type, category: categoryText, currencyCode: estimateCurrency })
    : '';
  const estimatedConvertedPrice = !isAttractionCard && !hasProviderOriginalPrice
    ? getEstimatedPriceText({ type, category: categoryText, currencyCode: selectedCurrency })
    : '';
  const originalPrice = hasProviderOriginalPrice ? providerOriginalPrice : estimatedPrice || '-';
  const convertedPrice = hasPriceText(convertedPriceText) ? convertedPriceText : estimatedConvertedPrice || '-';
  const originalPriceLabel = estimatedPrice ? 'AI price estimate' : 'Original price';
  const convertedPriceLabel = estimatedConvertedPrice && !hasPriceText(convertedPriceText) ? 'AI converted estimate' : 'Converted price';
  const displayHours = item.openState || 'Opening hours unavailable';
  const compareItem = {
    ...item,
    category: categoryText,
    source: `explore-${type}`,
    price: originalPrice,
    hours: displayHours,
    imageUrl: primaryImage,
  };
  const handleOpenDetails = () => {
    if (!canOpenDetails) return;

    const params = new URLSearchParams({
      name: item.name || '',
      address: item.address || '',
      dataId: item.dataId || '',
      placeId: item.placeId || '',
    });
    const detailPath = isHotelCard
      ? '/explore/hotels/detail'
      : isFoodCard
        ? '/explore/restaurants/detail'
        : '/explore/attractions/detail';
    const stateKey = isHotelCard ? 'hotel' : isFoodCard ? 'restaurant' : 'attraction';

    navigate(`${detailPath}?${params.toString()}`, {
      state: {
        [stateKey]: item,
        originalPriceText,
        convertedPriceText,
        selectedCurrency,
        returnState,
      },
    });
  };
  const handleFavoriteClick = async (event) => {
    event.stopPropagation();
    if (isSavingFavorite) return;

    setIsSavingFavorite(true);
    try {
      if (isFavorite && effectiveFavoriteRecord?._id) {
        const favoriteId = effectiveFavoriteRecord._id;
        await removeFavorite(favoriteId);
        setCurrentFavoriteRecord(null);
        setFavoriteOverride(false);
        onFavoriteChange?.(item, { action: 'removed', favoriteId });
        return;
      }

      const response = await addFavorite(buildPlaceFavoritePayload({
        item,
        type,
        originalPriceText,
        visitedSource,
      }));
      const savedFavorite = response.data?.data?.favorite || null;
      setCurrentFavoriteRecord(savedFavorite);
      setFavoriteOverride(true);
      onFavoriteChange?.(item, { action: 'added', favorite: savedFavorite });
    } catch {
      setFavoriteOverride(Boolean(effectiveFavoriteRecord?._id));
    } finally {
      setIsSavingFavorite(false);
    }
  };
  const handleImageStep = (event, direction) => {
    event.stopPropagation();
    if (visibleImages.length < 2) return;
    setActiveImageIndex((currentIndex) => (currentIndex + direction + visibleImages.length) % visibleImages.length);
  };
  return (
    <article
      className={`explore-attraction ${canOpenDetails ? 'is-clickable' : ''}`}
      onClick={handleOpenDetails}
      role={canOpenDetails ? 'button' : undefined}
      tabIndex={canOpenDetails ? 0 : undefined}
      onKeyDown={(event) => {
        if (canOpenDetails && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          handleOpenDetails();
        }
      }}
    >
      <div className="explore-attraction-media">
        {primaryImage ? (
          <img
            className="explore-card-image"
            src={primaryImageSrc}
            alt=""
            loading="lazy"
            onError={() => {
              setFailedImages((currentImages) => {
                const nextImages = new Set(currentImages);
                nextImages.add(primaryImage);
                return nextImages;
              });
              setActiveImageIndex(0);
            }}
          />
        ) : (
          <div className="explore-attraction-image">
            <Image size={28} aria-hidden="true" />
          </div>
        )}
        {visibleImages.length > 1 && (
          <div className="explore-card-gallery-controls" aria-label={`${item.name} photos`}>
            <button type="button" aria-label="Previous photo" onClick={(event) => handleImageStep(event, -1)}>
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <span>{normalizedImageIndex + 1} / {visibleImages.length}</span>
            <button type="button" aria-label="Next photo" onClick={(event) => handleImageStep(event, 1)}>
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
        )}
        {visibleImages.length > 1 && (
          <div className="explore-card-photo-dots" aria-label={`${item.name} photo position`}>
            {visibleImages.slice(0, 8).map((imageUrl, dotIndex) => (
              <button
                className={normalizedImageIndex === dotIndex ? 'active' : ''}
                key={`${imageUrl}-dot`}
                type="button"
                aria-label={`Show photo ${dotIndex + 1}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveImageIndex(dotIndex);
                }}
              />
            ))}
            {visibleImages.length > 8 && <span>+{visibleImages.length - 8}</span>}
          </div>
        )}
        <span className="explore-card-rank">#{index + 1}</span>
        <div className="explore-media-actions">
          <button
            className={`explore-favorite-button ${isFavorite ? 'active' : ''}`}
            type="button"
            aria-label={isFavorite ? 'Saved to favorites' : 'Add to favorites'}
            disabled={isSavingFavorite}
            onClick={handleFavoriteClick}
          >
            <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          {visitedRecord ? (
            <span className="explore-visited-check" aria-label="Visited">
              <Check size={19} aria-hidden="true" />
            </span>
          ) : null}
        </div>
      </div>
      <div className="explore-attraction-body">
        <div className="explore-attraction-title">
          <span className="explore-category" title={categoryText}>{priceIcon}{categoryText}</span>
          <h3 title={item.name}>{item.name}</h3>
        </div>

        <div className="explore-card-rating">
          <StarRating rating={item.rating} />
          <strong>{item.rating ? `${Number(item.rating).toFixed(1)} stars` : 'No rating'}</strong>
          <span>{item.reviewCount ? `${Number(item.reviewCount).toLocaleString()} reviews` : 'No reviews yet'}</span>
        </div>

        <div className="explore-card-facts" aria-label={`${item.name} details`}>
          <div className="explore-card-price-row">
            <div title={originalPrice}>
              <span>{originalPriceLabel}</span>
              <strong>{originalPrice}</strong>
            </div>
            <div title={convertedPrice}>
              <span>{convertedPriceLabel}</span>
              <strong>{convertedPrice}</strong>
            </div>
          </div>

          <div className="explore-card-status-row">
            <span className={`explore-open-badge is-${openStatus.tone}`}>{openStatus.label}</span>
            <div>
              <Clock size={15} aria-hidden="true" />
              <span>{item.openState || 'Opening hours unavailable'}</span>
            </div>
          </div>

          {item.phone && (
            <div className="explore-card-contact">
              <Phone size={15} aria-hidden="true" />
              <a href={`tel:${item.phone}`} onClick={(event) => event.stopPropagation()}>
                {item.phone}
              </a>
            </div>
          )}
        </div>

        {item.address && (
          <p className="explore-address" title={item.address}>
            <MapPin size={15} aria-hidden="true" />
            {item.address}
          </p>
        )}

        <div
          className="explore-card-footer-actions"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <VisitedPlaceControl
            payload={visitedPayload}
            visitedRecord={visitedRecord}
            onVisitedChange={onVisitedChange}
          />
          <CompareButton className="explore-card-compare-button" item={compareItem} />
        </div>
      </div>
    </article>
  );
}
// Default export registers the primary  value.
export default PlaceCard;
