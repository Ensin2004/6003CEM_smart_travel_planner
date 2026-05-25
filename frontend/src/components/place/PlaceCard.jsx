import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image,
  MapPin,
  MapPinned,
  Phone,
  Star,
  Utensils,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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

function PlaceCard({
  item,
  index = 0,
  type = 'attractions',
  categoryLabel,
  originalPriceText,
  convertedPriceText = '',
  carouselIndex = 0,
  onMoveCarousel,
}) {
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
  const safeCarouselIndex = Math.min(carouselIndex, Math.max(visibleImages.length - 1, 0));
  const openStatus = getOpenStatus(item.openState);
  const priceIcon =
    type === 'hotels' ? (
      <Building2 size={16} aria-hidden="true" />
    ) : type === 'food' || type === 'restaurants' ? (
      <Utensils size={16} aria-hidden="true" />
    ) : (
      <MapPinned size={16} aria-hidden="true" />
    );

  return (
    <article className="explore-attraction">
      <div className="explore-attraction-media">
        {visibleImages.length ? (
          <div className="explore-card-carousel" aria-label={`${item.name} images`}>
            <div className="explore-card-track" style={{ transform: `translateX(-${safeCarouselIndex * 100}%)` }}>
              {visibleImages.map((imageUrl, imageIndex) => (
                <img
                  src={imageUrl}
                  alt=""
                  loading="lazy"
                  key={`${item.id || item.name}-image-${imageIndex}`}
                  onError={() => {
                    setFailedImages((currentImages) => {
                      const nextImages = new Set(currentImages);
                      nextImages.add(imageUrl);
                      return nextImages;
                    });
                  }}
                />
              ))}
            </div>
            {visibleImages.length > 1 && (
              <div className="explore-carousel-controls">
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() => onMoveCarousel?.(item.id || item.name, visibleImages.length, -1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>{safeCarouselIndex + 1}/{visibleImages.length}</span>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() => onMoveCarousel?.(item.id || item.name, visibleImages.length, 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="explore-attraction-image">
            <Image size={28} aria-hidden="true" />
          </div>
        )}
        <span className="explore-card-rank">#{index + 1}</span>
      </div>
      <div className="explore-attraction-body">
        <div className="explore-attraction-title">
          <span className="explore-category">{categoryLabel || item.category || item.type || 'Place'}</span>
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
              <a href={`tel:${item.phone}`}>{item.phone}</a>
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

export default PlaceCard;
