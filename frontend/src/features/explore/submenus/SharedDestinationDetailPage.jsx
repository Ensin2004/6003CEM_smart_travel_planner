/**
 * Explore module.
 * Shared destination detail screen for attractions, hotels, and restaurants.
 */
import { ArrowLeft, ExternalLink, Heart, LoaderCircle, MapPin, Phone, Search, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addFavorite } from '../../../api/favoriteApi';
import { getErrorMessage } from '../explore.helpers';
import './SharedDetailPage.css';

const getPrimaryImage = (place = {}) => place.imageUrl || place.imageUrls?.[0] || '';
const getFavoriteKey = (place = {}) =>
  String(place.dataId || place.placeId || place.id || place.name || '')
    .trim()
    .toLowerCase();

function SharedDestinationDetailPage({
  config,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const statePlace = location.state?.[config.stateKey] || null;
  const initialFavoriteKey = getFavoriteKey(statePlace);
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
  const [reviewSearch, setReviewSearch] = useState('');
  const [minRating, setMinRating] = useState('all');

  useEffect(() => {
    let isActive = true;
    const loadPlace = async () => {
      setIsLoading(true);
      setError('');
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
        setPlace({ ...(statePlace || {}), ...(detail.item || {}) });
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

  const filteredReviews = useMemo(() => {
    const query = reviewSearch.trim().toLowerCase();
    const ratingFloor = minRating === 'all' ? 0 : Number(minRating);

    return reviews.filter((review) => {
      const matchesRating = !ratingFloor || Number(review.rating || 0) >= ratingFloor;
      const matchesText =
        !query ||
        review.author?.toLowerCase().includes(query) ||
        review.text?.toLowerCase().includes(query);
      return matchesRating && matchesText;
    });
  }, [minRating, reviewSearch, reviews]);

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

  const primaryImage = getPrimaryImage(place);
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
      <button className="shared-detail-back" type="button" onClick={() => navigate(returnPath, { state: returnState })}>
        <ArrowLeft size={17} />
        Back to {config.backLabel}
      </button>

      {isLoading && (
        <div className="explore-empty shared-detail-loading">
          <LoaderCircle className="explore-spin" size={34} aria-hidden="true" />
          <p>Loading {config.singularLower} details and reviews.</p>
        </div>
      )}

      {error && <p className="form-error explore-status">{error}</p>}

      {place && !isLoading && (
        <>
          <section className="shared-detail-hero">
            {primaryImage ? (
              <img src={primaryImage} alt="" />
            ) : (
              <div className="shared-detail-image-placeholder">
                <PlaceholderIcon size={42} aria-hidden="true" />
              </div>
            )}
            <div className="shared-detail-hero-copy">
              <span className="explore-category">{config.singularLabel}</span>
              <h2>{place.name}</h2>
              <div className="shared-detail-meta">
                <span>
                  <Star size={16} fill="currentColor" />
                  {place.rating ? `${Number(place.rating).toFixed(1)} stars` : 'No rating'}
                </span>
                <span>{place.reviewCount ? `${Number(place.reviewCount).toLocaleString()} reviews` : 'No review count'}</span>
              </div>
              {place.address && (
                <p>
                  <MapPin size={16} aria-hidden="true" />
                  {place.address}
                </p>
              )}
              {place.phone && (
                <p>
                  <Phone size={16} aria-hidden="true" />
                  {place.phone}
                </p>
              )}
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

          <section className="shared-detail-grid">
            <article className="shared-detail-panel">
              <h3>Description</h3>
              <p>{description?.extract || `A Wikipedia description is not available for this ${config.singularLower} yet.`}</p>
              {description?.url && (
                <a href={description.url} target="_blank" rel="noreferrer">
                  Read on Wikipedia
                </a>
              )}
            </article>

            <article className="shared-detail-panel">
              <h3>{config.singularLabel} Details</h3>
              <dl>
                <div>
                  <dt>Price range</dt>
                  <dd>{location.state?.originalPriceText || place.priceDetail?.display || place.price || 'Price unavailable'}</dd>
                </div>
                {location.state?.convertedPriceText && (
                  <div>
                    <dt>Converted price</dt>
                    <dd>{location.state.convertedPriceText}</dd>
                  </div>
                )}
                <div>
                  <dt>Opening hours</dt>
                  <dd>{place.openState || place.hoursSummary || 'Hours unavailable'}</dd>
                </div>
              </dl>
            </article>
          </section>

          <section className="shared-detail-reviews">
            <div className="shared-detail-reviews-heading">
              <div>
                <span className="explore-category">Google reviews</span>
                <h3>{filteredReviews.length} review{filteredReviews.length === 1 ? '' : 's'}</h3>
              </div>
              <div className="shared-detail-review-filters">
                <label>
                  <Search size={15} aria-hidden="true" />
                  <input
                    type="search"
                    value={reviewSearch}
                    onChange={(event) => setReviewSearch(event.target.value)}
                    placeholder="Filter reviews"
                  />
                </label>
                <select value={minRating} onChange={(event) => setMinRating(event.target.value)}>
                  <option value="all">All ratings</option>
                  <option value="5">5 stars</option>
                  <option value="4">4+ stars</option>
                  <option value="3">3+ stars</option>
                </select>
              </div>
            </div>

            {status && !reviews.length && <p className="explore-status">{status}</p>}

            <div className="shared-detail-review-list">
              {filteredReviews.map((review) => (
                <article className="shared-detail-review" key={review.id}>
                  <div>
                    <strong>{review.author}</strong>
                    <span>
                      <Star size={14} fill="currentColor" />
                      {review.rating || 'No rating'}
                      {review.date ? ` | ${review.date}` : ''}
                    </span>
                  </div>
                  <p>{review.text || 'No written review provided.'}</p>
                </article>
              ))}
              {!filteredReviews.length && <p className="explore-status">No reviews match the selected filter.</p>}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

export default SharedDestinationDetailPage;
