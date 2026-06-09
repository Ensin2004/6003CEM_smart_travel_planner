/**
 * FavoriteCard keeps saved-place presentation and map navigation consistent.
 */
import { Building2, MapPin, Plane, Star, TrainFront, Trash2, Utensils } from 'lucide-react';

const getFavoriteTypeLabel = (type) => {
  if (type === 'restaurant') return 'Restaurant';
  if (type === 'hotel') return 'Hotel';
  if (type === 'location') return 'Location';
  if (type === 'transport') return 'Transport';
  if (type === 'flight') return 'Flight';
  return 'Attraction';
};

const renderFavoriteIcon = (type) => {
  if (type === 'restaurant') return <Utensils size={22} aria-hidden="true" />;
  if (type === 'hotel') return <Building2 size={22} aria-hidden="true" />;
  if (type === 'transport') return <TrainFront size={22} aria-hidden="true" />;
  if (type === 'flight') return <Plane size={22} aria-hidden="true" />;
  return <MapPin size={22} aria-hidden="true" />;
};

function FavoriteCard({ favorite, onOpen, onRemove }) {
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
      <div className="favorite-card-icon">
        {renderFavoriteIcon(favorite.type)}
      </div>
      <div className="favorite-card-body">
        <div className="favorite-card-title">
          <div>
            <span>{getFavoriteTypeLabel(favorite.type)}</span>
            <h3>{favorite.title}</h3>
          </div>
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

        {favorite.location?.address ? (
          <p>
            <MapPin size={15} aria-hidden="true" />
            {favorite.location.address}
          </p>
        ) : favorite.description ? <p>{favorite.description}</p> : null}

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
