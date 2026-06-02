/**
 * Explore module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import { ArrowLeft, ExternalLink, Heart, LoaderCircle, MapPin, MapPinned, Phone, Search, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAttractionDetails } from '../../../api/exploreApi';
import { addFavorite } from '../../../api/favoriteApi';
import { getErrorMessage } from '../explore.helpers';
import './SharedDetailPage.css';

const getPrimaryImage = (attraction = {}) => attraction.imageUrl || attraction.imageUrls?.[0] || '';

// AttractionDetailPage renders the main screen and handles nearby interactions.
function AttractionDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateAttraction = location.state?.attraction || null;
  const [attraction, setAttraction] = useState(stateAttraction);
  const [description, setDescription] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(!stateAttraction);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviewSearch, setReviewSearch] = useState('');
  const [minRating, setMinRating] = useState('all');

  useEffect(() => {
    let isActive = true;
    const loadAttraction = async () => {
      setIsLoading(!stateAttraction);
      setError('');
      try {
        const searchParams = new URLSearchParams(location.search);
        const response = await getAttractionDetails({
          name: stateAttraction?.name || searchParams.get('name') || '',
          address: stateAttraction?.address || searchParams.get('address') || '',
          dataId: stateAttraction?.dataId || searchParams.get('dataId') || '',
          placeId: stateAttraction?.placeId || searchParams.get('placeId') || '',
        });
        const detail = response.data.data.attraction;

        if (!isActive) return;
        setAttraction({ ...(stateAttraction || {}), ...(detail.item || {}) });
        setDescription(detail.description);
        setReviews(detail.reviews?.items || []);
        setStatus(detail.message || detail.reviews?.message || '');
      } catch (requestError) {
        if (isActive) setError(getErrorMessage(requestError));
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadAttraction();
    return () => {
      isActive = false;
    };
  }, [location.search, stateAttraction]);

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
    if (!attraction || isFavorite) return;
    try {
      await addFavorite({
        type: 'attraction',
        title: attraction.name,
        description: attraction.address,
        address: attraction.address,
        coordinates: attraction.coordinates,
        priceLevel: location.state?.originalPriceText || attraction.priceDetail?.display || attraction.price,
        rating: attraction.rating,
        externalId: attraction.dataId || attraction.placeId || attraction.id || attraction.name,
        source: 'explore-attractions',
      });
      setIsFavorite(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const primaryImage = getPrimaryImage(attraction);
  const returnSearch = location.state?.returnState?.returnSearch || 'view=attractions';
  const returnPath = `/explore?${returnSearch || 'view=attractions'}`;

  return (
    <section className="shared-detail-page">
      <button className="shared-detail-back" type="button" onClick={() => navigate(returnPath, { state: location.state?.returnState || null })}>
        <ArrowLeft size={17} />
        Back to attractions
      </button>

      {isLoading && !attraction && (
        <div className="explore-empty shared-detail-loading">
          <LoaderCircle className="explore-spin" size={34} aria-hidden="true" />
          <p>Loading attraction details and reviews.</p>
        </div>
      )}

      {error && <p className="form-error explore-status">{error}</p>}
      {isLoading && attraction && (
        <p className="explore-status">
          <LoaderCircle className="explore-spin" size={15} aria-hidden="true" />
          Loading extra attraction details and reviews.
        </p>
      )}

      {attraction && (
        <>
          <section className="shared-detail-hero">
            {primaryImage ? (
              <img src={primaryImage} alt="" />
            ) : (
              <div className="shared-detail-image-placeholder">
                <MapPinned size={42} aria-hidden="true" />
              </div>
            )}
            <div className="shared-detail-hero-copy">
              <span className="explore-category">Attraction</span>
              <h2>{attraction.name}</h2>
              <div className="shared-detail-meta">
                <span>
                  <Star size={16} fill="currentColor" />
                  {attraction.rating ? `${Number(attraction.rating).toFixed(1)} stars` : 'No rating'}
                </span>
                <span>{attraction.reviewCount ? `${Number(attraction.reviewCount).toLocaleString()} reviews` : 'No review count'}</span>
              </div>
              {attraction.address && (
                <p>
                  <MapPin size={16} aria-hidden="true" />
                  {attraction.address}
                </p>
              )}
              {attraction.phone && (
                <p>
                  <Phone size={16} aria-hidden="true" />
                  {attraction.phone}
                </p>
              )}
              <div className="shared-detail-actions">
                <button type="button" onClick={handleFavorite} className={isFavorite ? 'active' : ''}>
                  <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
                  {isFavorite ? 'Saved' : 'Add to favourites'}
                </button>
                {attraction.url && (
                  <a href={attraction.url} target="_blank" rel="noreferrer">
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
              <p>{description?.extract || 'A Wikipedia description is not available for this attraction yet.'}</p>
              {description?.url && (
                <a href={description.url} target="_blank" rel="noreferrer">
                  Read on Wikipedia
                </a>
              )}
            </article>

            <article className="shared-detail-panel">
              <h3>Attraction Details</h3>
              <dl>
                <div>
                  <dt>Price range</dt>
                  <dd>{location.state?.originalPriceText || attraction.priceDetail?.display || attraction.price || 'Price unavailable'}</dd>
                </div>
                {location.state?.convertedPriceText && (
                  <div>
                    <dt>Converted price</dt>
                    <dd>{location.state.convertedPriceText}</dd>
                  </div>
                )}
                <div>
                  <dt>Opening hours</dt>
                  <dd>{attraction.openState || attraction.hoursSummary || 'Hours unavailable'}</dd>
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

export default AttractionDetailPage;
