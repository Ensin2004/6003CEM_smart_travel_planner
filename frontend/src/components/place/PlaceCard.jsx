/**
 * Place Card module.
 * Exports and local helpers keep related behavior in a single module.
 */
import {
  Building2,
  Clock,
  Heart,
  Image,
  MapPin,
  MapPinned,
  Phone,
  Star,
  Utensils,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addFavorite } from '../../api/favoriteApi';
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
  const isFavoriteEnabled = isHotelCard || isFoodCard;
  const visitedType = isHotelCard ? 'hotel' : isFoodCard ? 'restaurant' : type === 'food' ? 'food' : 'attraction';
  const visitedPayload = getVisitedPlacePayload({
    item,
    type: visitedType,
    source: visitedSource || `explore-${type}`,
    defaultDate: visitedDefaultDate,
  });
  const [isFavorite, setIsFavorite] = useState(isInitiallyFavorite);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const priceIcon =
    type === 'hotels' ? (
      <Building2 size={16} aria-hidden="true" />
    ) : type === 'food' || type === 'restaurants' ? (
      <Utensils size={16} aria-hidden="true" />
    ) : (
      <MapPinned size={16} aria-hidden="true" />
    );
  useEffect(() => {
    setIsFavorite(isInitiallyFavorite);
  }, [isInitiallyFavorite]);
  const handleOpenDetails = () => {
    if (!isFavoriteEnabled) return;

    const params = new URLSearchParams({
      name: item.name || '',
      address: item.address || '',
      dataId: item.dataId || '',
      placeId: item.placeId || '',
    });
    const detailPath = isHotelCard ? '/explore/hotels/detail' : '/explore/restaurants/detail';
    const stateKey = isHotelCard ? 'hotel' : 'restaurant';

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
      const favoriteType = isHotelCard ? 'hotel' : 'restaurant';
      await addFavorite({
        type: favoriteType,
        title: item.name,
        description: item.address,
        address: item.address,
        coordinates: item.coordinates,
        priceLevel: originalPriceText || item.priceDetail?.display || item.price,
        rating: item.rating,
        externalId: item.dataId || item.placeId || item.id || item.name,
        source: isHotelCard ? 'explore-hotels' : 'explore-food',
      });
      setIsFavorite(true);
      onFavoriteChange?.(item);
    } catch {
      setIsFavorite(false);
    } finally {
      setIsSavingFavorite(false);
    }
  };
  return (
    <article
      className={`explore-attraction ${isFavoriteEnabled ? 'is-clickable' : ''}`}
      onClick={handleOpenDetails}
      role={isFavoriteEnabled ? 'button' : undefined}
      tabIndex={isFavoriteEnabled ? 0 : undefined}
      onKeyDown={(event) => {
        if (isFavoriteEnabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          handleOpenDetails();
        }
      }}
    >
      <div className="explore-attraction-media">
        {visitedRecord ? <span className="visited-place-watermark">Visited</span> : null}
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
      </div>
      <div className="explore-attraction-body">
        <div className="explore-attraction-title">
          <div className="explore-card-category-row">
            <span className="explore-category">{categoryLabel || item.category || item.type || 'Place'}</span>
            <div className="explore-card-actions">
              {isFavoriteEnabled && (
                <button
                  className={`explore-favorite-button ${isFavorite ? 'active' : ''}`}
                  type="button"
                  aria-label={isFavorite ? 'Hotel saved to favorites' : 'Add hotel to favorites'}
                  disabled={isSavingFavorite}
                  onClick={handleFavoriteClick}
                >
                  <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              )}
              <VisitedPlaceControl
                compact
                payload={visitedPayload}
                visitedRecord={visitedRecord}
                onVisitedChange={onVisitedChange}
              />
            </div>
          </div>
          <h3>{item.name}</h3>
        </div>

        <div className="explore-card-rating">
          <StarRating rating={item.rating} />
          <strong>{item.rating ? `${Number(item.rating).toFixed(1)} stars` : 'No rating'}</strong>
          <span>{item.reviewCount ? `${Number(item.reviewCount).toLocaleString()} reviews` : 'No reviews yet'}</span>
        </div>

        <div className="explore-card-facts" aria-label={`${item.name} details`}>
          <div className="explore-card-price-row">
            {priceIcon}
            <div>
              <span>Price range</span>
              <strong>{originalPriceText || item.priceDetail?.display || item.price || 'Price unavailable'}</strong>
            </div>
            {convertedPriceText && <small>{convertedPriceText}</small>}
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
          <p className="explore-address">
            <MapPin size={15} aria-hidden="true" />
            {item.address}
          </p>
        )}
      </div>
    </article>
  );
}
// Default export registers the primary  value.
export default PlaceCard;
