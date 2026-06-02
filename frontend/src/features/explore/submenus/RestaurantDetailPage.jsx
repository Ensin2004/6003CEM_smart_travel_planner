import { ArrowLeft, ExternalLink, Heart, LoaderCircle, MapPin, Phone, Search, Star, Utensils } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addFavorite } from '../../../api/favoriteApi';
import { getRestaurantDetails } from '../../../api/exploreApi';
import { getErrorMessage } from '../explore.helpers';
import './SharedDetailPage.css';

const getPrimaryImage = (restaurant = {}) => restaurant.imageUrl || restaurant.imageUrls?.[0] || '';
const getRestaurantFavoriteKey = (restaurant = {}) =>
  String(restaurant.dataId || restaurant.placeId || restaurant.id || restaurant.name || '')
    .trim()
    .toLowerCase();

function RestaurantDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateRestaurant = location.state?.restaurant || null;
  const initialFavoriteKey = getRestaurantFavoriteKey(stateRestaurant);
  const [restaurant, setRestaurant] = useState(stateRestaurant);
  const [description, setDescription] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteRestaurantKeys, setFavoriteRestaurantKeys] = useState(location.state?.returnState?.favoriteRestaurantKeys || []);
  const [isFavorite, setIsFavorite] = useState(
    Boolean(initialFavoriteKey && location.state?.returnState?.favoriteRestaurantKeys?.includes(initialFavoriteKey))
  );
  const [reviewSearch, setReviewSearch] = useState('');
  const [minRating, setMinRating] = useState('all');

  useEffect(() => {
    let isActive = true;

    const loadRestaurant = async () => {
      setIsLoading(true);
      setError('');

      try {
        const searchParams = new URLSearchParams(location.search);
        const response = await getRestaurantDetails({
          name: stateRestaurant?.name || searchParams.get('name') || '',
          address: stateRestaurant?.address || searchParams.get('address') || '',
          dataId: stateRestaurant?.dataId || searchParams.get('dataId') || '',
          placeId: stateRestaurant?.placeId || searchParams.get('placeId') || '',
        });
        const detail = response.data.data.restaurant;

        if (!isActive) return;
        setRestaurant({ ...(stateRestaurant || {}), ...(detail.item || {}) });
        setDescription(detail.description);
        setReviews(detail.reviews?.items || []);
        setStatus(detail.message || detail.reviews?.message || '');
      } catch (requestError) {
        if (isActive) setError(getErrorMessage(requestError));
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadRestaurant();

    return () => {
      isActive = false;
    };
  }, [location.search, stateRestaurant]);

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
    if (!restaurant || isFavorite) return;

    try {
      await addFavorite({
        type: 'restaurant',
        title: restaurant.name,
        description: restaurant.address,
        address: restaurant.address,
        coordinates: restaurant.coordinates,
        priceLevel: location.state?.originalPriceText || restaurant.priceDetail?.display || restaurant.price,
        rating: restaurant.rating,
        externalId: restaurant.dataId || restaurant.placeId || restaurant.id || restaurant.name,
        source: 'explore-food',
      });
      setIsFavorite(true);
      const favoriteKeys = [getRestaurantFavoriteKey(stateRestaurant), getRestaurantFavoriteKey(restaurant)].filter(Boolean);
      setFavoriteRestaurantKeys((currentKeys) => [...new Set([...currentKeys, ...favoriteKeys])]);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const primaryImage = getPrimaryImage(restaurant);
  const returnSearch = location.state?.returnState?.returnSearch || 'view=food';
  const returnPath = `/explore?${returnSearch || 'view=food'}`;
  const returnState = location.state?.returnState
    ? {
        ...location.state.returnState,
        favoriteRestaurantKeys,
      }
    : null;

  return (
    <section className="shared-detail-page">
      <button className="shared-detail-back" type="button" onClick={() => navigate(returnPath, { state: returnState })}>
        <ArrowLeft size={17} />
        Back to restaurants
      </button>

      {isLoading && (
        <div className="explore-empty shared-detail-loading">
          <LoaderCircle className="explore-spin" size={34} aria-hidden="true" />
          <p>Loading restaurant details and reviews.</p>
        </div>
      )}

      {error && <p className="form-error explore-status">{error}</p>}

      {restaurant && !isLoading && (
        <>
          <section className="shared-detail-hero">
            {primaryImage ? (
              <img src={primaryImage} alt="" />
            ) : (
              <div className="shared-detail-image-placeholder">
                <Utensils size={42} aria-hidden="true" />
              </div>
            )}
            <div className="shared-detail-hero-copy">
              <span className="explore-category">Restaurant</span>
              <h2>{restaurant.name}</h2>
              <div className="shared-detail-meta">
                <span>
                  <Star size={16} fill="currentColor" />
                  {restaurant.rating ? `${Number(restaurant.rating).toFixed(1)} stars` : 'No rating'}
                </span>
                <span>{restaurant.reviewCount ? `${Number(restaurant.reviewCount).toLocaleString()} reviews` : 'No review count'}</span>
              </div>
              {restaurant.address && (
                <p>
                  <MapPin size={16} aria-hidden="true" />
                  {restaurant.address}
                </p>
              )}
              {restaurant.phone && (
                <p>
                  <Phone size={16} aria-hidden="true" />
                  {restaurant.phone}
                </p>
              )}
              <div className="shared-detail-actions">
                <button type="button" onClick={handleFavorite} className={isFavorite ? 'active' : ''}>
                  <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
                  {isFavorite ? 'Saved' : 'Add to favourites'}
                </button>
                {restaurant.url && (
                  <a href={restaurant.url} target="_blank" rel="noreferrer">
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
              <p>{description?.extract || 'A Wikipedia description is not available for this restaurant yet.'}</p>
              {description?.url && (
                <a href={description.url} target="_blank" rel="noreferrer">
                  Read on Wikipedia
                </a>
              )}
            </article>

            <article className="shared-detail-panel">
              <h3>Restaurant Details</h3>
              <dl>
                <div>
                  <dt>Price range</dt>
                  <dd>{location.state?.originalPriceText || restaurant.priceDetail?.display || restaurant.price || 'Price unavailable'}</dd>
                </div>
                {location.state?.convertedPriceText && (
                  <div>
                    <dt>Converted price</dt>
                    <dd>{location.state.convertedPriceText}</dd>
                  </div>
                )}
                <div>
                  <dt>Opening hours</dt>
                  <dd>{restaurant.openState || restaurant.hoursSummary || 'Hours unavailable'}</dd>
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

export default RestaurantDetailPage;
