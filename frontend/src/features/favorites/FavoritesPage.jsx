import { Building2, Heart, LoaderCircle, MapPin, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFavorites, removeFavorite } from '../../api/favoriteApi';
import './FavoritesPage.css';

function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadFavorites = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await getFavorites();
        if (isActive) setFavorites(response.data.data.favorites || []);
      } catch {
        if (isActive) setError('Unable to load favourites right now.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadFavorites();

    return () => {
      isActive = false;
    };
  }, []);

  const handleRemove = async (favoriteId) => {
    await removeFavorite(favoriteId);
    setFavorites((currentFavorites) => currentFavorites.filter((favorite) => favorite._id !== favoriteId));
  };

  const hotelFavorites = favorites.filter((favorite) => favorite.type === 'hotel');

  return (
    <section className="favorites-page">
      <div className="favorites-hero">
        <div>
          <span className="favorites-eyebrow">Favourite</span>
          <h2>Saved places</h2>
          <p>Hotels and travel ideas you marked with the heart icon are collected here.</p>
        </div>
        <Heart size={34} aria-hidden="true" />
      </div>

      {isLoading && (
        <div className="favorites-empty">
          <LoaderCircle className="explore-spin" size={32} aria-hidden="true" />
          <p>Loading favourites...</p>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      {!isLoading && !hotelFavorites.length && (
        <div className="favorites-empty">
          <Building2 size={34} aria-hidden="true" />
          <h3>No hotel favourites yet</h3>
          <p>Save hotels from Explore to see them here.</p>
          <Link to="/explore?view=hotels">Explore hotels</Link>
        </div>
      )}

      {!isLoading && hotelFavorites.length > 0 && (
        <div className="favorites-grid">
          {hotelFavorites.map((favorite) => (
            <article className="favorite-card" key={favorite._id}>
              <div className="favorite-card-icon">
                <Building2 size={22} aria-hidden="true" />
              </div>
              <div className="favorite-card-body">
                <div className="favorite-card-title">
                  <div>
                    <span>Hotel</span>
                    <h3>{favorite.title}</h3>
                  </div>
                  <button type="button" aria-label="Remove favourite" onClick={() => handleRemove(favorite._id)}>
                    <Trash2 size={16} />
                  </button>
                </div>

                {favorite.location?.address && (
                  <p>
                    <MapPin size={15} aria-hidden="true" />
                    {favorite.location.address}
                  </p>
                )}

                <div className="favorite-card-meta">
                  {favorite.rating ? (
                    <span>
                      <Star size={14} fill="currentColor" />
                      {Number(favorite.rating).toFixed(1)}
                    </span>
                  ) : null}
                  {favorite.priceLevel ? <span>{favorite.priceLevel}</span> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default FavoritesPage;
