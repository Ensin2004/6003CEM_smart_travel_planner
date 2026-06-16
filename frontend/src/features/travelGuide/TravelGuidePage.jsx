/**
 * Travel Guide module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Globe2,
  LoaderCircle,
  MapPin,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTravelGuideCountries, getTravelGuideDestinations } from '../../api/travelGuideApi';
import { getVisitedPlaces } from '../../api/visitedPlaceApi';
import CompareButton from '../../components/compare/CompareButton';
import VisitedPlaceControl from '../../components/visitedPlaces/VisitedPlaceControl';
import { buildVisitedLookup, getVisitedPlacePayload } from '../../components/visitedPlaces/visitedPlaceUtils';
import useAuth from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../utils/apiError';
import { getPlaceImageSrc } from '../../utils/placeImageProxy';
import './TravelGuidePage.css';
const getErrorMessage = (error) =>
  getApiErrorMessage(error, 'Unable to load travel guides right now.');
const getCountryLoadStatus = (countryGuide) => {
  const shown = countryGuide.items?.length || 0;
  const total = countryGuide.pagination?.total ?? shown;
  const countryLabel = total === 1 ? 'country' : 'countries';

  return total > shown
    ? `${total} ${countryLabel} found. ${shown} loaded on this page.`
    : `${total} ${countryLabel} loaded.`;
};

const regionFilters = {
  All: '',
  Asia: 'Asia',
  Europe: 'Europe',
  'North America': 'North America',
  'South America': 'South America',
  Oceania: 'Oceania',
  Africa: 'Africa',
  Antarctica: 'Antarctica',
  Other: 'Other',
};
const fallbackTravelImages = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=900&q=80',
];
const getFallbackTravelImage = (name = '') => {
  const imageIndex = [...name].reduce((total, character) => total + character.charCodeAt(0), 0)
    % fallbackTravelImages.length;

  return fallbackTravelImages[imageIndex];
};
// DestinationCard renders the main screen and handles nearby interactions.
function DestinationCard({ destination, onOpen, visitedRecord, onVisitedChange }) {
  const imageCandidates = useMemo(
    () => [...new Set([destination.imageUrl, ...(destination.imageUrls || []), getFallbackTravelImage(destination.name)].filter(Boolean))],
    [destination.imageUrl, destination.imageUrls, destination.name]
  );
  const [failedImageCount, setFailedImageCount] = useState(0);
  const imageUrl = imageCandidates[Math.min(failedImageCount, imageCandidates.length - 1)];
  const visitedPayload = getVisitedPlacePayload({
    item: destination,
    type: 'location',
    source: 'travel-guide',
    defaultDate: new Date().toISOString().slice(0, 10),
  });
  const compareItem = {
    ...destination,
    source: 'travel-guide',
    category: destination.type || 'Destination',
    price: destination.price || 'Price unavailable',
    hours: destination.openState || destination.hours || 'Working hours unavailable',
    address: destination.address || [destination.name, destination.country].filter(Boolean).join(', '),
  };

  return (
    <article
      className={visitedRecord ? 'travel-guide-card is-visited' : 'travel-guide-card'}
      role="button"
      tabIndex="0"
      onClick={() => onOpen(destination)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(destination);
        }
      }}
    >
      {visitedRecord ? (
        <span className="visited-place-watermark">
          <CheckCircle2 size={13} aria-hidden="true" />
          Visited
        </span>
      ) : null}
      {imageUrl && (
        <img
          src={getPlaceImageSrc(imageUrl)}
          alt=""
          loading="lazy"
          onError={() => setFailedImageCount((count) => Math.min(count + 1, imageCandidates.length))}
        />
      )}
      <span>{destination.type || 'Destination'}</span>
      <strong>{destination.name}</strong>
      {destination.region && <small>{destination.region}</small>}
      <VisitedPlaceControl
        compact
        payload={visitedPayload}
        visitedRecord={visitedRecord}
        onVisitedChange={onVisitedChange}
      />
      <CompareButton item={compareItem} />
    </article>
  );
}
// TravelGuidePage renders the main screen and handles nearby interactions.
function TravelGuidePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userCountry = user?.country || 'Malaysia';
  const userCountryCode = user?.countryCode || '';
  const [guideMode, setGuideMode] = useState('domestic');
  const [selectedOverseasCountry, setSelectedOverseasCountry] = useState(null);
  const [activeRegion, setActiveRegion] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [destinations, setDestinations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, hasMore: false });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [visitedPlaces, setVisitedPlaces] = useState([]);

  const currentCountry = userCountry;
  const isCountryDirectory = guideMode === 'overseas' && !selectedOverseasCountry;
  const filteredDestinations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return destinations;
    }

    return destinations.filter((destination) =>
      [destination.name, destination.type, destination.region, destination.country, destination.address]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      .includes(normalizedSearch)
    );
  }, [destinations, searchTerm]);
  const visitedLookup = useMemo(() => buildVisitedLookup(visitedPlaces), [visitedPlaces]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 450);

    return () => window.clearTimeout(timerId);
  }, [searchTerm]);

  const getDestinationVisitedRecord = (destination) => {
    const payload = getVisitedPlacePayload({
      item: destination,
      type: 'location',
      source: 'travel-guide',
      defaultDate: new Date().toISOString().slice(0, 10),
    });
    return visitedLookup[payload.placeKey];
  };

  const handleVisitedChange = (visitedPlace) => {
    if (!visitedPlace?.placeKey) return;
    setVisitedPlaces((currentPlaces) => {
      const withoutCurrent = currentPlaces.filter((place) => place.placeKey !== visitedPlace.placeKey);
      return [visitedPlace, ...withoutCurrent];
    });
  };

  useEffect(() => {
    let isActive = true;

    getVisitedPlaces()
      .then((response) => {
        if (!isActive) return;
        setVisitedPlaces(response.data?.data?.visitedPlaces || []);
      })
      .catch(() => {
        if (isActive) setVisitedPlaces([]);
      });

    return () => {
      isActive = false;
    };
  }, []);
  useEffect(() => {
    let isActive = true;
    const loadDestinations = async () => {
      setIsLoading(true);
      setError('');
      setStatus('');

      if (isCountryDirectory) {
        try {
          const response = await getTravelGuideCountries({
            currentCountry: userCountry,
            currentCountryCode: userCountryCode,
            region: regionFilters[activeRegion],
            limit: 24,
            page: 1,
            search: debouncedSearchTerm,
          });
          const countryGuide = response.data.data.countries;

          if (!isActive) return;

          setDestinations(countryGuide.items || []);
          setPagination(countryGuide.pagination || { page: 1, totalPages: 1, hasMore: false });
          if (countryGuide.available) {
            setStatus(getCountryLoadStatus(countryGuide));
          } else {
            setError(countryGuide.message || 'Travel guide countries are unavailable.');
          }
        } catch (requestError) {
          if (!isActive) return;
          setDestinations([]);
          setError(getErrorMessage(requestError));
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
        return;
      }
      try {
        const response = await getTravelGuideDestinations({
          mode: 'domestic',
          country: selectedOverseasCountry?.name || userCountry,
          countryCode: selectedOverseasCountry?.countryCode || userCountryCode,
          limit: 24,
          page: 1,
          search: debouncedSearchTerm,
        });
        const guide = response.data.data.guide;


        if (!isActive) return;

        setDestinations(guide.items || []);
        setPagination(guide.pagination || { page: 1, totalPages: 1, hasMore: false });
        if (guide.available) {
          setStatus(`${guide.items?.length || 0} guide result${guide.items?.length === 1 ? '' : 's'} loaded.`);
        } else {
          setError(guide.message || 'Travel guides are unavailable.');
        }
      } catch (requestError) {
        if (!isActive) return;
        setDestinations([]);
        setError(getErrorMessage(requestError));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadDestinations();

    // Cleanup prevents state updates after component unmount.
    return () => {
      isActive = false;
    };
  }, [
    activeRegion,
    debouncedSearchTerm,
    isCountryDirectory,
    selectedOverseasCountry,
    userCountry,
    userCountryCode,
  ]);
  const loadMoreDestinations = () => {
    changePage(Math.min(pagination.page + 1, pagination.totalPages), { append: true });
  };
  const handleModeChange = (nextMode) => {
    setGuideMode(nextMode);
    setSelectedOverseasCountry(null);
    setSearchTerm('');
    setDestinations([]);
    setPagination({ page: 1, totalPages: 1, hasMore: false });
  };
  const openDestination = (destination) => {
    if (isCountryDirectory && destination.type === 'Country') {
      setSelectedOverseasCountry(destination);
      setSearchTerm('');
      setDestinations([]);
      setPagination({ page: 1, totalPages: 1, hasMore: false });
      return;
    }

    const params = new URLSearchParams({
      destination: destination.name,
      country: destination.country || selectedOverseasCountry?.name || (guideMode === 'domestic' ? currentCountry : destination.name),
    });

    if (destination.coordinates?.latitude) {
      params.set('latitude', destination.coordinates.latitude);
    }

    if (destination.coordinates?.longitude) {
      params.set('longitude', destination.coordinates.longitude);
    }

    navigate(`/travel-guide/destination?${params.toString()}`);
  };
  const changePage = async (nextPage, { append = false } = {}) => {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.page) {
      return;
    }

    setIsLoading(true);
    setError('');

    if (isCountryDirectory) {
      try {
        const response = await getTravelGuideCountries({
          currentCountry: userCountry,
          currentCountryCode: userCountryCode,
          region: regionFilters[activeRegion],
          limit: 24,
          page: nextPage,
          search: debouncedSearchTerm,
        });
        const countryGuide = response.data.data.countries;

        setDestinations((currentDestinations) => (
          append
            ? [...currentDestinations, ...(countryGuide.items || [])]
            : countryGuide.items || []
        ));
        setPagination(countryGuide.pagination || pagination);
        if (countryGuide.available) {
          setStatus(getCountryLoadStatus(countryGuide));
        } else {
          setStatus('');
          setError(countryGuide.message || 'Travel guide countries are unavailable.');
        }
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setIsLoading(false);
      }
      return;
    }
    try {
      const response = await getTravelGuideDestinations({
        mode: 'domestic',
        country: selectedOverseasCountry?.name || userCountry,
        countryCode: selectedOverseasCountry?.countryCode || userCountryCode,
        limit: 24,
        page: nextPage,
        search: debouncedSearchTerm,
      });
      const guide = response.data.data.guide;

      setDestinations((currentDestinations) => (
        append
          ? [...currentDestinations, ...(guide.items || [])]
          : guide.items || []
      ));
      setPagination(guide.pagination || pagination);
      if (guide.available) {
        setStatus(`${guide.items?.length || 0} guide result${guide.items?.length === 1 ? '' : 's'} loaded.`);
      } else {
        setStatus('');
        setError(guide.message || 'Travel guides are unavailable.');
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <section className="travel-guide-page">
      <div className="travel-guide-hero">
        <div>
          <span className="travel-guide-eyebrow">
            <BookOpenCheck size={15} aria-hidden="true" />
            Travel Guide
          </span>
          <h2>Browse live destination guides.</h2>
          <p>
            Choose domestic destinations or overseas countries, then open a separate guide page with
            attractions, restaurants, hotels, weather, recommendations, map context, and photos.
          </p>
        </div>
        <div className="travel-guide-hero-card">
          <span>Travel Guide</span>
          <strong>{userCountry}</strong>
          <small>Domestic recommendations start here.</small>
        </div>
      </div>

      <div className="travel-guide-toolbar">
        <div className="travel-guide-tabs" role="tablist" aria-label="Guide type">
          <button
            className={guideMode === 'domestic' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={guideMode === 'domestic'}
            onClick={() => handleModeChange('domestic')}
          >
            <MapPin size={16} aria-hidden="true" />
            Domestic
          </button>
          <button
            className={guideMode === 'overseas' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={guideMode === 'overseas'}
            onClick={() => handleModeChange('overseas')}
          >
            <Globe2 size={16} aria-hidden="true" />
            Overseas
          </button>
        </div>

        {isCountryDirectory && (
          <div className="travel-guide-region-tabs" aria-label="Overseas region filters">
            {Object.keys(regionFilters).map((region) => (
              <button
                className={activeRegion === region ? 'active' : ''}
                type="button"
                key={region}
                onClick={() => {
                  setActiveRegion(region);
                  setSearchTerm('');
                  setPagination({ page: 1, totalPages: 1, hasMore: false });
                }}
              >
                {region}
              </button>
            ))}
          </div>
        )}

        <div className="travel-guide-search-band">
          <label className="travel-guide-search">
            <span className="sr-only">Search guide destinations</span>
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={guideMode === 'overseas' && !selectedOverseasCountry ? 'Search countries' : 'Search destinations'}
            />
          </label>
          <span>
            <SlidersHorizontal size={15} aria-hidden="true" />
            {guideMode === 'overseas' && !selectedOverseasCountry ? 'Country directory' : 'Destination guide'}
          </span>
        </div>
      </div>

      <section className="travel-guide-destinations">
        {selectedOverseasCountry && (
          <button className="travel-guide-back-link" type="button" onClick={() => setSelectedOverseasCountry(null)}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back to overseas countries
          </button>
        )}
        <div className="travel-guide-section-heading">
          <div>
            <span>
              {guideMode === 'domestic'
                ? `${userCountry} domestic`
                : selectedOverseasCountry
                  ? `${selectedOverseasCountry.name} destinations`
                  : 'Overseas countries'}
            </span>
            <h3>
              {guideMode === 'overseas' && !selectedOverseasCountry
                ? 'Choose a country'
                : 'Popular destinations'}
            </h3>
          </div>
          <small>
            {isLoading && !destinations.length
              ? 'Loading'
              : `${filteredDestinations.length} shown${pagination.totalPages > 1 ? `, page ${pagination.page} of ${pagination.totalPages}` : ''}`}
          </small>
        </div>

        {error && <p className="form-error travel-guide-status">{error}</p>}
        {status && !error && <p className="form-success travel-guide-status">{status}</p>}

        {isLoading ? (
          <div className="travel-guide-empty">
            <LoaderCircle className="travel-guide-spin" size={30} aria-hidden="true" />
            <h3>Loading guides</h3>
            <p>Fetching travel guide results.</p>
          </div>
        ) : filteredDestinations.length ? (
          <>
            <div className="travel-guide-grid" aria-label="Travel guide destinations">
              {filteredDestinations.map((destination) => (
                <DestinationCard
                  destination={destination}
                  key={`${destination.id}-${destination.name}`}
                  onOpen={openDestination}
                  onVisitedChange={handleVisitedChange}
                  visitedRecord={getDestinationVisitedRecord(destination)}
                />
              ))}
            </div>
          {pagination.totalPages > 1 && (
            <div className="travel-guide-pagination" aria-label="Destination pages">
              <button type="button" onClick={() => changePage(pagination.page - 1)} disabled={pagination.page <= 1 || isLoading}>
                <ChevronLeft size={16} aria-hidden="true" />
                Previous
              </button>
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <button type="button" onClick={() => changePage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || isLoading}>
                Next
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
          {pagination.hasMore && (
            <button className="travel-guide-view-more" type="button" onClick={loadMoreDestinations} disabled={isLoading}>
              {isLoading ? <LoaderCircle className="travel-guide-spin" size={16} aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
              {isLoading ? 'Loading...' : 'View more'}
            </button>
          )}
          </>
        ) : (
          <div className="travel-guide-empty">
            <Compass size={30} aria-hidden="true" />
            <h3>No destinations loaded</h3>
            <p>Try another search or guide tab.</p>
          </div>
        )}
      </section>
    </section>
  );
}

// Default export registers the primary  value.
export default TravelGuidePage;
