import { Building2, CloudSun, Compass, MapPin, MapPinned, Search, Sparkles, Utensils } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchAttractions } from '../../api/exploreApi';
import './ExplorePage.css';

const viewOptions = [
  { id: 'discover', label: 'Discover', icon: Sparkles },
  { id: 'weather', label: 'Weather', icon: CloudSun },
  { id: 'attractions', label: 'Attractions', icon: MapPinned },
  { id: 'food', label: 'Food', icon: Utensils },
  { id: 'hotels', label: 'Hotels', icon: Building2 },
  { id: 'transport', label: 'Transport', icon: Compass },
];

const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data?.error || error.message || 'Unable to search right now.';

function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('view') || 'discover';
  const [destination, setDestination] = useState('');
  const [attractions, setAttractions] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const activeOption = useMemo(
    () => viewOptions.find((option) => option.id === activeView) || viewOptions[0],
    [activeView]
  );
  const ActiveIcon = activeOption.icon;

  const handleViewChange = (view) => {
    setSearchParams({ view });
    setStatus('');
    setError('');
  };

  const handleAttractionsSearch = async (event) => {
    event.preventDefault();

    if (!destination.trim()) {
      setError('Enter a destination first.');
      return;
    }

    setIsSearching(true);
    setError('');
    setStatus('');

    try {
      const response = await searchAttractions(destination.trim());
      const nextAttractions = response.data.data.attractions;
      setAttractions(nextAttractions.items || []);
      setStatus(
        nextAttractions.available
          ? `Found ${nextAttractions.items?.length || 0} attraction${nextAttractions.items?.length === 1 ? '' : 's'}.`
          : nextAttractions.message
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setAttractions([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <section className="explore-page">
      <div className="explore-hero">
        <div>
          <span>Explore</span>
          <h2>{activeOption.label}</h2>
          <p>Search live destination data and keep useful places close while planning your trip.</p>
        </div>
      </div>

      <nav className="explore-tabs" aria-label="Explore tools">
        {viewOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              className={activeOption.id === option.id ? 'active' : ''}
              key={option.id}
              type="button"
              onClick={() => handleViewChange(option.id)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </nav>

      {activeOption.id === 'attractions' ? (
        <div className="explore-workspace">
          <form className="explore-search" onSubmit={handleAttractionsSearch}>
            <label>
              Destination
              <input
                type="search"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="Tokyo, Paris, Kuala Lumpur"
              />
            </label>
            <button className="primary-action" type="submit" disabled={isSearching}>
              <Search size={17} aria-hidden="true" />
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {error && <p className="form-error explore-status">{error}</p>}
          {status && <p className="form-success explore-status">{status}</p>}

          <div className="explore-results">
            {attractions.length === 0 ? (
              <div className="explore-empty">
                <MapPinned size={34} aria-hidden="true" />
                <h3>No attractions loaded yet</h3>
                <p>Search a destination to see attractions from SerpApi Google Maps results.</p>
              </div>
            ) : (
              attractions.map((attraction) => (
                <article className="explore-attraction" key={attraction.id}>
                  {attraction.imageUrl ? (
                    <img src={attraction.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <div className="explore-attraction-image">
                      <MapPinned size={26} aria-hidden="true" />
                    </div>
                  )}
                  <div>
                    <span>{attraction.category}</span>
                    <h3>{attraction.name}</h3>
                    {attraction.address && (
                      <p>
                        <MapPin size={15} aria-hidden="true" />
                        {attraction.address}
                      </p>
                    )}
                    <small>
                      {attraction.rating ? `${attraction.rating} rating` : 'Rating unavailable'}
                      {attraction.reviewCount ? ` · ${attraction.reviewCount} reviews` : ''}
                    </small>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="explore-empty explore-placeholder">
          <ActiveIcon size={34} aria-hidden="true" />
          <h3>{activeOption.label} is ready for integration</h3>
          <p>Use the Attractions tab to test the SerpApi Google Maps connection first.</p>
        </div>
      )}
    </section>
  );
}

export default ExplorePage;
