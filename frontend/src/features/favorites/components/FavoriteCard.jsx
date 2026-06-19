/**
 * FavoriteCard keeps saved-place presentation and map navigation consistent.
 */
import { Building2, MapPin, Plane, Star, TrainFront, Trash2, Utensils } from 'lucide-react';

/**
 * Maps favorite type identifiers to user-friendly display labels.
 * 
 * @param {string} type - The favorite type identifier
 * @returns {string} The display label for the favorite type
 */
const getFavoriteTypeLabel = (type) => {
  if (type === 'restaurant') return 'Restaurant';
  if (type === 'hotel') return 'Hotel';
  if (type === 'location') return 'Location';
  if (type === 'transport') return 'Transport';
  if (type === 'flight') return 'Flight';
  return 'Attraction';
};

/**
 * Renders the appropriate icon component based on the favorite type.
 * 
 * @param {string} type - The favorite type identifier
 * @returns {JSX.Element} The corresponding icon component
 */
const renderFavoriteIcon = (type) => {
  if (type === 'restaurant') return <Utensils size={22} aria-hidden="true" />;
  if (type === 'hotel') return <Building2 size={22} aria-hidden="true" />;
  if (type === 'transport') return <TrainFront size={22} aria-hidden="true" />;
  if (type === 'flight') return <Plane size={22} aria-hidden="true" />;
  return <MapPin size={22} aria-hidden="true" />;
};

/**
 * FavoriteCard component displays a single saved favorite place.
 * Supports click navigation to map and removal functionality.
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.favorite - The favorite place data
 * @param {string} props.favorite.type - Type of favorite (restaurant, hotel, location, transport, flight)
 * @param {string} props.favorite.title - Display title of the favorite
 * @param {Object} props.favorite.location - Location information
 * @param {string} props.favorite.location.address - Physical address
 * @param {string} props.favorite.description - Optional description text
 * @param {number} props.favorite.rating - Star rating value
 * @param {string} props.favorite.priceLevel - Price level indicator
 * @param {Function} props.onOpen - Callback function when the card is clicked to open on map
 * @param {Function} props.onRemove - Callback function when the remove button is clicked
 * @returns {JSX.Element} The rendered favorite card
 */
function FavoriteCard({ favorite, onOpen, onRemove }) {
  /**
   * Handles keyboard navigation for the clickable card.
   * Triggers onOpen when Enter or Space is pressed.
   * 
   * @param {Object} event - The keyboard event
   */
  const handleKeyDown = (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && onOpen) {
      event.preventDefault();
      onOpen(favorite);
    }
  };

  return (
    <article
      className={`favorite-card ${onOpen ? 'favorite-card-clickable' : ''}`}
      tabIndex={onOpen ? 0 : undefined}
      role={onOpen ? 'button' : undefined}
      aria-label={onOpen ? `Open ${favorite.title} on map` : undefined}
      onClick={() => onOpen?.(favorite)}
      onKeyDown={handleKeyDown}
    >
      {/* Icon section */}
      <div className="favorite-card-icon">
        {renderFavoriteIcon(favorite.type)}
      </div>
      
      {/* Content section */}
      <div className="favorite-card-body">
        <div className="favorite-card-title">
          <div>
            <span>{getFavoriteTypeLabel(favorite.type)}</span>
            <h3>{favorite.title}</h3>
          </div>
          {/* Remove button - only rendered when onRemove callback is provided */}
          {onRemove ? (
            <button
              type="button"
              aria-label={`Remove ${favorite.title} from favourites`}
              onClick={(event) => {
                event.stopPropagation();
                onRemove(favorite);
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {/* Address or description display */}
        {favorite.location?.address ? (
          <p>
            <MapPin size={15} aria-hidden="true" />
            {favorite.location.address}
          </p>
        ) : favorite.description ? <p>{favorite.description}</p> : null}

        {/* Meta information: rating and price level */}
        <div className="favorite-card-meta">
          {favorite.rating ? (
            <span>
              <Star size={14} fill="currentColor" aria-hidden="true" />
              {Number(favorite.rating).toFixed(1)}
            </span>
          ) : null}
          {favorite.priceLevel ? <span>{favorite.priceLevel}</span> : null}
        </div>
      </div>
    </article>
  );
}

export default FavoriteCard;
