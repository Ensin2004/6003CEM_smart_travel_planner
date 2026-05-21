import {
  Building2,
  Compass,
  ExternalLink,
  Image,
  LoaderCircle,
  MapPin,
  MapPinned,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  Utensils,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchAttractions } from '../../api/exploreApi';
import './ExplorePage.css';

const viewOptions = [
  { id: 'discover', label: 'AI Discovery', icon: Sparkles },
  { id: 'attractions', label: 'Attractions', icon: MapPinned },
  { id: 'food', label: 'Restaurants / Food', icon: Utensils },
  { id: 'hotels', label: 'Hotels / Rooms', icon: Building2 },
  { id: 'transport', label: 'Transportation', icon: Compass },
];

const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data?.error || error.message || 'Unable to search right now.';

function ExplorePage() {
  const [searchParams] = useSearchParams();
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
  const destinationLabel = destination.trim() || 'your next city';
  const resultCount = attractions.length;
  const ratedCount = attractions.filter((attraction) => attraction.rating).length;
  const topRatedCount = attractions.filter((attraction) => attraction.rating >= 4.5).length;
  const hasAttractionResults = resultCount > 0;

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
          ? `Found ${nextAttractions.items?.length || 0} attraction${nextAttractions.items?.length === 1 ? '' : 's'} for ${destination.trim()}.`
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
          <span className="explore-eyebrow">
            <MapPinned size={15} aria-hidden="true" />
            Explore
          </span>
          <h2>{activeOption.label}</h2>
          <p>Find popular stops, ratings, reviews, and addresses from live destination data before adding places into the rest of your trip plan.</p>
        </div>
        {activeOption.id === 'attractions' && (
          <div className="explore-hero-panel" aria-label="Attraction search summary">
            <div>
              <span>Current search</span>
              <strong>{destinationLabel}</strong>
            </div>
            <small>{resultCount ? `${resultCount} places loaded` : 'Ready to discover places'}</small>
            <div className="explore-hero-meter" aria-hidden="true">
              <span style={{ width: hasAttractionResults ? '100%' : '38%' }} />
            </div>
          </div>
        )}
      </div>

      {activeOption.id === 'attractions' && (
        <div className="explore-insights" aria-label="Attraction result summary">
          <article>
            <Search size={18} aria-hidden="true" />
            <div>
              <strong>{resultCount || '--'}</strong>
              <span>Places loaded</span>
            </div>
          </article>
          <article>
            <Star size={18} aria-hidden="true" />
            <div>
              <strong>{ratedCount || '--'}</strong>
              <span>Rated places</span>
            </div>
          </article>
          <article>
            <Sparkles size={18} aria-hidden="true" />
            <div>
              <strong>{topRatedCount || '--'}</strong>
              <span>Highly rated</span>
            </div>
          </article>
        </div>
      )}

      {activeOption.id === 'attractions' ? (
        <div className="explore-workspace">
          <form className="explore-search" onSubmit={handleAttractionsSearch}>
            <div className="explore-search-copy">
              <span>Attraction finder</span>
              <strong>Search by destination</strong>
            </div>
            <label>
              <span className="sr-only">Destination</span>
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="Tokyo, Paris, Kuala Lumpur"
              />
            </label>
            <button className="primary-action" type="submit" disabled={isSearching}>
              {isSearching ? <LoaderCircle className="explore-spin" size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {error && <p className="form-error explore-status">{error}</p>}
          {status && <p className="form-success explore-status">{status}</p>}

          <section className="explore-results-shell">
            <div className="explore-results-heading">
              <div>
                <span>Attraction results</span>
                <h3>{hasAttractionResults ? `Places for ${destinationLabel}` : 'Ready when you are'}</h3>
              </div>
              <small>{hasAttractionResults ? `${resultCount} curated matches` : 'Search a city to begin'}</small>
            </div>

            <div className="explore-results">
              {attractions.length === 0 ? (
                <div className="explore-empty">
                  <MapPinned size={34} aria-hidden="true" />
                  <h3>No attractions loaded yet</h3>
                  <p>Search a destination to see attraction cards with photos, ratings, reviews, and addresses.</p>
                </div>
            ) : (
              attractions.map((attraction, index) => (
                <article className="explore-attraction" key={attraction.id}>
                  <div className="explore-attraction-media">
                    {attraction.imageUrl ? (
                      <img src={attraction.imageUrl} alt="" loading="lazy" />
                    ) : (
                      <div className="explore-attraction-image">
                        <Image size={28} aria-hidden="true" />
                      </div>
                    )}
                    <span className="explore-card-rank">#{index + 1}</span>
                  </div>
                  <div className="explore-attraction-body">
                    <div className="explore-attraction-title">
                      <span className="explore-category">{attraction.category}</span>
                      <h3>{attraction.name}</h3>
                    </div>
                    <div className="explore-card-meta">
                      <span>
                        <Star size={14} aria-hidden="true" />
                        {attraction.rating ? attraction.rating : 'No rating'}
                      </span>
                      <span>
                        <MessageCircle size={14} aria-hidden="true" />
                        {attraction.reviewCount ? attraction.reviewCount.toLocaleString() : 'No'} reviews
                      </span>
                    </div>
                    {attraction.address && (
                      <p className="explore-address">
                        <MapPin size={15} aria-hidden="true" />
                        {attraction.address}
                      </p>
                    )}
                    {attraction.url && (
                      <a className="explore-card-link" href={attraction.url} target="_blank" rel="noreferrer">
                        View place
                        <ExternalLink size={14} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </article>
              ))
              )}
            </div>
          </section>
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
