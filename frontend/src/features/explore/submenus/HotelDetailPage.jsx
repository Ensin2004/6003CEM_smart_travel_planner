/**
 * Explore module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import { ArrowLeft, Building2, ExternalLink, Heart, LoaderCircle, MapPin, Phone, Search, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addFavorite } from '../../../api/favoriteApi';
import { getHotelDetails } from '../../../api/exploreApi';
import { getErrorMessage } from '../explore.helpers';
import './SharedDetailPage.css';

const getPrimaryImage = (hotel = {}) => hotel.imageUrl || hotel.imageUrls?.[0] || '';
const getHotelFavoriteKey = (hotel = {}) =>
  String(hotel.dataId || hotel.placeId || hotel.id || hotel.name || '')
    .trim()
    .toLowerCase();
// HotelDetailPage renders the main screen and handles nearby interactions.
function HotelDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateHotel = location.state?.hotel || null;
  const initialFavoriteKey = getHotelFavoriteKey(stateHotel);
  const [hotel, setHotel] = useState(stateHotel);
  const [description, setDescription] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteHotelKeys, setFavoriteHotelKeys] = useState(location.state?.returnState?.favoriteHotelKeys || []);
  const [isFavorite, setIsFavorite] = useState(
    Boolean(initialFavoriteKey && location.state?.returnState?.favoriteHotelKeys?.includes(initialFavoriteKey))
  );
  const [reviewSearch, setReviewSearch] = useState('');
  const [minRating, setMinRating] = useState('all');

  useEffect(() => {
    let isActive = true;

    const loadHotel = async () => {
      setIsLoading(true);
      setError('');

      try {
        const searchParams = new URLSearchParams(location.search);
        const response = await getHotelDetails({
          name: stateHotel?.name || searchParams.get('name') || '',
          address: stateHotel?.address || searchParams.get('address') || '',
          dataId: stateHotel?.dataId || searchParams.get('dataId') || '',
          placeId: stateHotel?.placeId || searchParams.get('placeId') || '',
        });
        const detail = response.data.data.hotel;

        if (!isActive) return;
        setHotel({ ...(stateHotel || {}), ...(detail.item || {}) });
        setDescription(detail.description);
        setReviews(detail.reviews?.items || []);
        setStatus(detail.message || detail.reviews?.message || '');
      } catch (requestError) {
        if (isActive) setError(getErrorMessage(requestError));
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadHotel();
    // Cleanup prevents state updates after component unmount.
    return () => {
      isActive = false;
    };
  }, [location.search, stateHotel]);

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
    if (!hotel || isFavorite) return;

    try {
      await addFavorite({
        type: 'hotel',
        title: hotel.name,
        description: hotel.address,
        address: hotel.address,
        coordinates: hotel.coordinates,
        priceLevel: location.state?.originalPriceText || hotel.priceDetail?.display || hotel.price,
        rating: hotel.rating,
        externalId: hotel.dataId || hotel.placeId || hotel.id || hotel.name,
        source: 'explore-hotels',
      });
      setIsFavorite(true);
      const favoriteKeys = [getHotelFavoriteKey(stateHotel), getHotelFavoriteKey(hotel)].filter(Boolean);
      setFavoriteHotelKeys((currentKeys) => [...new Set([...currentKeys, ...favoriteKeys])]);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const primaryImage = getPrimaryImage(hotel);
  const returnSearch = location.state?.returnState?.returnSearch || 'view=hotels';
  const returnPath = `/explore?${returnSearch || 'view=hotels'}`;
  const returnState = location.state?.returnState
    ? {
        ...location.state.returnState,
        favoriteHotelKeys,
      }
    : null;

  return (
    <section className="shared-detail-page">
      <button
        className="shared-detail-back"
        type="button"
        onClick={() => navigate(returnPath, { state: returnState })}
      >
        <ArrowLeft size={17} />
        Back to hotels
      </button>

      {isLoading && (
        <div className="explore-empty shared-detail-loading">
          <LoaderCircle className="explore-spin" size={34} aria-hidden="true" />
          <p>Loading hotel details and reviews.</p>
        </div>
      )}

      {error && <p className="form-error explore-status">{error}</p>}

      {hotel && !isLoading && (
        <>
          <section className="shared-detail-hero">
            {primaryImage ? (
              <img src={primaryImage} alt="" />
            ) : (
              <div className="shared-detail-image-placeholder">
                <Building2 size={42} aria-hidden="true" />
              </div>
            )}
            <div className="shared-detail-hero-copy">
              <span className="explore-category">Hotel</span>
              <h2>{hotel.name}</h2>
              <div className="shared-detail-meta">
                <span>
                  <Star size={16} fill="currentColor" />
                  {hotel.rating ? `${Number(hotel.rating).toFixed(1)} stars` : 'No rating'}
                </span>
                <span>{hotel.reviewCount ? `${Number(hotel.reviewCount).toLocaleString()} reviews` : 'No review count'}</span>
              </div>
              {hotel.address && (
                <p>
                  <MapPin size={16} aria-hidden="true" />
                  {hotel.address}
                </p>
              )}
              {hotel.phone && (
                <p>
                  <Phone size={16} aria-hidden="true" />
                  {hotel.phone}
                </p>
              )}
              <div className="shared-detail-actions">
                <button type="button" onClick={handleFavorite} className={isFavorite ? 'active' : ''}>
                  <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
                  {isFavorite ? 'Saved' : 'Add to favourites'}
                </button>
                {hotel.url && (
                  <a href={hotel.url} target="_blank" rel="noreferrer">
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
              <p>{description?.extract || 'A Wikipedia description is not available for this hotel yet.'}</p>
              {description?.url && (
                <a href={description.url} target="_blank" rel="noreferrer">
                  Read on Wikipedia
                </a>
              )}
            </article>

            <article className="shared-detail-panel">
              <h3>Hotel Details</h3>
              <dl>
                <div>
                  <dt>Price range</dt>
                  <dd>{location.state?.originalPriceText || hotel.priceDetail?.display || hotel.price || 'Price unavailable'}</dd>
                </div>
                {location.state?.convertedPriceText && (
                  <div>
                    <dt>Converted price</dt>
                    <dd>{location.state.convertedPriceText}</dd>
                  </div>
                )}
                <div>
                  <dt>Opening hours</dt>
                  <dd>{hotel.openState || hotel.hoursSummary || 'Hours unavailable'}</dd>
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

// Default export registers the primary  value.
export default HotelDetailPage;
