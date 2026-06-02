/**
 * Place Card module.
 * Exports and local helpers keep related behavior in a single module.
 */
import {
  Building2,
  Check,
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
import { addFavorite } from '../../api/favoriteApi';
import CompareButton from '../compare/CompareButton';
import VisitedPlaceControl from '../visitedPlaces/VisitedPlaceControl';
import { getVisitedPlacePayload } from '../visitedPlaces/visitedPlaceUtils';
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
  isInitiallyFavorite = false,
  onFavoriteChange,
  returnState,
  visitedRecord,
  onVisitedChange,
  visitedSource,
  visitedDefaultDate,
}) {
  const navigate = useNavigate();
  const galleryImages = useMemo(() => {
    if (item.imageUrls?.length) return item.imageUrls;
    if (item.imageUrl) return [item.imageUrl];
    return [];
  }, [item.imageUrl, item.imageUrls]);
  const [failedImages, setFailedImages] = useState(() => new Set());
  const visibleImages = useMemo(
    () => galleryImages.filter((imageUrl) => imageUrl && !failedImages.has(imageUrl)),
    [failedImages, galleryImages]
  );
  const primaryImage = visibleImages[0];
  const openStatus = getOpenStatus(item.openState);
  const isHotelCard = type === 'hotels';
  const isFoodCard = type === 'food' || type === 'restaurants';
  const isAttractionCard = type === 'attractions';
  const isDetailEnabled = isHotelCard || isFoodCard || isAttractionCard;
  const isFavoriteEnabled = isHotelCard || isFoodCard || isAttractionCard;
  const canOpenDetails = isHotelCard || isFoodCard;
  const visitedType = isHotelCard ? 'hotel' : isFoodCard ? 'restaurant' : type === 'food' ? 'food' : 'attraction';
  const visitedPayload = getVisitedPlacePayload({
    item,
    type: visitedType,
    source: visitedSource || `explore-${type}`,
    defaultDate: visitedDefaultDate,
  });
  const [favoriteOverride, setFavoriteOverride] = useState(null);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const isFavorite = favoriteOverride ?? isInitiallyFavorite;
  const priceIcon =
    type === 'hotels' ? (
      <Building2 size={16} aria-hidden="true" />
    ) : type === 'food' || type === 'restaurants' ? (
      <Utensils size={16} aria-hidden="true" />
    ) : (
      <MapPinned size={16} aria-hidden="true" />
    );
  const categoryText = categoryLabel || item.category || item.type || 'Place';
  const originalPrice = originalPriceText || item.priceDetail?.display || item.price || 'Price unavailable';
  const convertedPrice = convertedPriceText || 'Unavailable';
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
    if (!isDetailEnabled) return;
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
        returnState,
      },
    });
  };
  const handleFavoriteClick = async (event) => {
    event.stopPropagation();
    if (isSavingFavorite) return;

    setIsSavingFavorite(true);
    try {
      const favoriteType = isHotelCard ? 'hotel' : isFoodCard ? 'restaurant' : 'attraction';
      await addFavorite({
        type: favoriteType,
        title: item.name,
        description: item.address,
        address: item.address,
        coordinates: item.coordinates,
        priceLevel: originalPriceText || item.priceDetail?.display || item.price,
        rating: item.rating,
        externalId: item.dataId || item.placeId || item.id || item.name,
        source: isHotelCard ? 'explore-hotels' : isFoodCard ? 'explore-food' : 'explore-attractions',
        source: isHotelCard ? 'explore-hotels' : isFoodCard ? 'explore-food' : visitedSource || `explore-${type}`,
      });
      setFavoriteOverride(true);
      onFavoriteChange?.(item);
    } catch {
      setFavoriteOverride(false);
    } finally {
      setIsSavingFavorite(false);
    }
  };
  return (
    <article
      className={`explore-attraction ${isDetailEnabled ? 'is-clickable' : ''}`}
      onClick={handleOpenDetails}
      role={isDetailEnabled ? 'button' : undefined}
      tabIndex={isDetailEnabled ? 0 : undefined}
      onKeyDown={(event) => {
        if (isDetailEnabled && (event.key === 'Enter' || event.key === ' ')) {
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
            src={primaryImage}
            alt=""
            loading="lazy"
            onError={() => {
              setFailedImages((currentImages) => {
                const nextImages = new Set(currentImages);
                nextImages.add(primaryImage);
                return nextImages;
              });
            }}
          />
        ) : (
          <div className="explore-attraction-image">
            <Image size={28} aria-hidden="true" />
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
          <div className="explore-card-category-row">
            <span className="explore-category">{categoryLabel || item.category || item.type || 'Place'}</span>
            <div className="explore-card-actions">
              <VisitedPlaceControl
                compact
                payload={visitedPayload}
                visitedRecord={visitedRecord}
                onVisitedChange={onVisitedChange}
              />
            </div>
          </div>
          <div className="explore-card-name-row">
            <h3>{item.name}</h3>
            <div className="explore-card-actions">
              {isFavoriteEnabled && (
                <button
                  className={`explore-favorite-button ${isFavorite ? 'active' : ''}`}
                  type="button"
                  aria-label={isFavorite ? 'Place saved to favorites' : 'Add place to favorites'}
                  disabled={isSavingFavorite}
                  onClick={handleFavoriteClick}
                >
                  <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              )}
            </div>
          </div>
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
              <strong>{originalPrice}</strong>
              <span>(Local)</span>
            </div>
            <div title={convertedPrice}>
              <strong>{convertedPrice}</strong>
              <span>(Converted)</span>
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

        <div className="explore-card-footer-actions">
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
