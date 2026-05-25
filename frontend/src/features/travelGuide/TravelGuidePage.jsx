import {
  ArrowLeft,
  BookOpenCheck,
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
import useAuth from '../../hooks/useAuth';
import './TravelGuidePage.css';

const getCountryName = (country = {}) => country.name?.common || country.name?.official || '';

const getCountryCode = (countries = [], countryName = '') =>
  countries.find((country) => getCountryName(country).toLowerCase() === countryName.toLowerCase())?.cca2 || '';

const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data?.error || error.message || 'Unable to load travel guides right now.';

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

const supportedRegionNames = new Set(Object.values(regionFilters).filter(Boolean));

const getCountryRegion = (country) => {
  const continent = country.continents?.find((name) => supportedRegionNames.has(name));

  if (continent) {
    return continent;
  }

  return 'Other';
};

const getCurrencyCodes = (currencies = {}) => Object.keys(currencies).join(', ');

function DestinationCard({ destination, onOpen }) {
  return (
    <button className="travel-guide-card" type="button" onClick={() => onOpen(destination)}>
      <img src={destination.imageUrl} alt="" loading="lazy" />
      <span>{destination.type || 'Destination'}</span>
      <strong>{destination.name}</strong>
      {destination.region && <small>{destination.region}</small>}
    </button>
  );
}

function TravelGuidePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userCountry = user?.country || 'Malaysia';
  const [countries, setCountries] = useState([]);
  const [countryDirectoryError, setCountryDirectoryError] = useState('');
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const userCountryCode = useMemo(() => getCountryCode(countries, userCountry), [countries, userCountry]);
  const [guideMode, setGuideMode] = useState('domestic');
  const [selectedOverseasCountry, setSelectedOverseasCountry] = useState(null);
  const [activeRegion, setActiveRegion] = useState('All');
  const overseasCountries = useMemo(
    () =>
      countries
        .filter((country) => country.cca2 !== userCountryCode)
        .filter((country) => {
          const targetRegion = regionFilters[activeRegion];
          return !targetRegion || getCountryRegion(country) === targetRegion;
        })
        .map((country) => ({
          id: country.cca2,
          name: getCountryName(country),
          type: 'Country',
          region: [getCountryRegion(country), country.subregion].filter(Boolean).join(' - '),
          country: getCountryName(country),
          countryCode: country.cca2,
          imageUrl: country.flags?.png || country.flags?.svg || '',
          flagUrl: country.flags?.png || country.flags?.svg || '',
          currency: getCurrencyCodes(country.currencies),
          coordinates: {
            latitude: Number(country.latlng?.[0]),
            longitude: Number(country.latlng?.[1]),
          },
        })),
    [activeRegion, countries, userCountryCode]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [destinations, setDestinations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, hasMore: false });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    let isActive = true;

    const loadCountries = async () => {
      setIsLoadingCountries(true);
      setCountryDirectoryError('');

      try {
        const response = await getTravelGuideCountries();
        const sortedCountries = (response.data || [])
          .filter((country) => country.cca2 && getCountryName(country))
          .sort((first, second) => getCountryName(first).localeCompare(getCountryName(second)));

        if (!isActive) return;

        setCountries(sortedCountries);
      } catch (requestError) {
        if (!isActive) return;
        setCountries([]);
        setCountryDirectoryError(getErrorMessage(requestError));
      } finally {
        if (isActive) {
          setIsLoadingCountries(false);
        }
      }
    };

    loadCountries();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadDestinations = async () => {
      setIsLoading(true);
      setError(isCountryDirectory ? countryDirectoryError : '');
      setStatus('');

      if (isCountryDirectory) {
        if (isLoadingCountries) {
          return;
        }

        if (countryDirectoryError) {
          setDestinations([]);
          setPagination({ page: 1, totalPages: 1, hasMore: false });
          setIsLoading(false);
          return;
        }

        const normalizedSearch = searchTerm.trim().toLowerCase();
        const countries = overseasCountries.filter((country) => !normalizedSearch || country.name.toLowerCase().includes(normalizedSearch));
        const pageItems = countries.slice(0, 24);

        setDestinations(pageItems);
        setPagination({
          page: 1,
          limit: 24,
          total: countries.length,
          totalPages: Math.max(Math.ceil(countries.length / 24), 1),
          hasMore: countries.length > 24,
        });
        setStatus(`${pageItems.length} countr${pageItems.length === 1 ? 'y' : 'ies'} loaded.`);
        setIsLoading(false);
        return;
      }

      try {
        const response = await getTravelGuideDestinations({
          mode: 'domestic',
          country: selectedOverseasCountry?.name || userCountry,
          countryCode: selectedOverseasCountry?.countryCode || userCountryCode,
          limit: 24,
          page: 1,
          search: searchTerm.trim(),
        });
        const guide = response.data.data.guide;

        if (!isActive) return;

        setDestinations(guide.items || []);
        setPagination(guide.pagination || { page: 1, totalPages: 1, hasMore: false });
        setStatus(guide.available ? `${guide.items?.length || 0} guide result${guide.items?.length === 1 ? '' : 's'} loaded.` : guide.message);
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

    return () => {
      isActive = false;
    };
  }, [
    countryDirectoryError,
    isCountryDirectory,
    isLoadingCountries,
    overseasCountries,
    searchTerm,
    selectedOverseasCountry,
    userCountry,
    userCountryCode,
  ]);

  const loadMoreDestinations = () => {
    changePage(Math.min(pagination.page + 1, pagination.totalPages));
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

  const changePage = async (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.page) {
      return;
    }

    setIsLoading(true);
    setError('');

    if (isCountryDirectory) {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const countries = overseasCountries.filter((country) => !normalizedSearch || country.name.toLowerCase().includes(normalizedSearch));
      const startIndex = (nextPage - 1) * 24;
      const pageItems = countries.slice(startIndex, startIndex + 24);

      setDestinations(pageItems);
      setPagination({
        page: nextPage,
        limit: 24,
        total: countries.length,
        totalPages: Math.max(Math.ceil(countries.length / 24), 1),
        hasMore: startIndex + 24 < countries.length,
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await getTravelGuideDestinations({
        mode: 'domestic',
        country: selectedOverseasCountry?.name || userCountry,
        countryCode: selectedOverseasCountry?.countryCode || userCountryCode,
        limit: 24,
        page: nextPage,
        search: searchTerm.trim(),
      });
      const guide = response.data.data.guide;

      setDestinations(guide.items || []);
      setPagination(guide.pagination || pagination);
      setStatus(`${guide.items?.length || 0} guide result${guide.items?.length === 1 ? '' : 's'} loaded.`);
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

export default TravelGuidePage;
