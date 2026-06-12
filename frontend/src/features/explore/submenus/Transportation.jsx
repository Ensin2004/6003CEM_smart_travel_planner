/**
 * Explore module.
 * Exports and local helpers keep related behavior in a single module.
 */
import {
  ArrowLeftRight,
  CalendarDays,
  ChevronDown,
  Clock,
  DollarSign,
  LoaderCircle,
  MapPin,
  Plane,
  Search,
  Sparkles,
  TrainFront,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getDateKey } from '../explore.helpers';
import './Transportation.css';

const transportationTabs = [
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'trains', label: 'Trains', icon: TrainFront },
];

const getCountryFlag = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '';

  return countryCode
    .toUpperCase()
    .split('')
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join('');
};

// TransportationSubmenu renders the main screen and handles nearby interactions.
function TransportationSubmenu({
  activeTransportTab,
  clearFlightCountry,
  clearFlightSearchField,
  clearTrainSearchField,
  countryOptions,
  error,
  flightResults,
  flightSearch,
  formatFlightDuration,
  formatFlightTime,
  getAirportLocationLabel,
  getFlightCodeLabel,
  getFlightSearchTitle,
  handleFlightCountryChange,
  handleFlightSearch,
  handleFlightSearchChange,
  handleTrainSearchChange,
  handleTrainSelect,
  handleTrainStationSearch,
  isSearching,
  setActiveTransportTab,
  status,
  trainResults,
  trainSearch,
}) {
  const [flightSort, setFlightSort] = useState('departure');
  const [openCountryMenu, setOpenCountryMenu] = useState('');
  const [fromCountryQuery, setFromCountryQuery] = useState('');
  const [toCountryQuery, setToCountryQuery] = useState('');
  const [selectedFlight, setSelectedFlight] = useState(null);
  const countryMenuRef = useRef(null);
  // Format Train Date converts raw values into readable display text.
  const formatTrainDate = (value) => value || 'Date unavailable';
  const getTrainDistanceLabel = (train = {}) => {
    const kilometers = Number(train.distanceEstimate?.kilometers);

    if (Number.isFinite(kilometers) && kilometers > 0) {
      return `${Math.round(kilometers).toLocaleString('en-US')} km`;
    }

    if (train.distanceEstimate?.available && train.distanceEstimate?.display) {
      return train.distanceEstimate.display;
    }

    return train.distanceEstimate?.display || 'AI estimate unavailable';
  };
  const getTrainPriceLabel = (train = {}) =>
    train.priceEstimate?.available && train.priceEstimate?.display
      ? train.priceEstimate.display
      : train.priceEstimate?.display || 'AI estimate unavailable';
  const getTrainRunLabel = (train = {}) =>
    [train.trainUid || train.service || trainResults?.stationCode, train.platform ? `Platform ${train.platform}` : '']
      .filter(Boolean)
      .join(' - ') || 'Train service';
  const getTrainDepartureTime = (train = {}) =>
    train.expectedDepartureTime || train.actualDepartureTime || train.aimedDepartureTime || '--:--';
  const getTrainArrivalTime = (train = {}) => train.expectedArrivalTime || train.actualArrivalTime || train.aimedArrivalTime || '--:--';
  const getTrainDateLabel = (train = {}, kind = 'departure') =>
    kind === 'arrival'
      ? formatTrainDate(train.expectedArrivalDate || train.arrivalDate || train.serviceDate || trainResults?.date)
      : formatTrainDate(train.expectedDepartureDate || train.departureDate || train.serviceDate || trainResults?.date);
  const getTrainRouteLabel = (train = {}) => train.status || 'Scheduled';
  const formatTransportDate = (value) => {
    if (!value) return 'Date unavailable';

    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    }

    return value;
  };
  const getAirportCodeLabel = (airport = {}) => airport.iata || airport.icao || '';
  const getFlightPlaceLabel = (airport = {}) => {
    const airportCode = getAirportCodeLabel(airport);
    const airportName = airport.name && !airport.name.includes('unavailable') ? airport.name : '';
    const locationLabel = getAirportLocationLabel(airport);

    if (airportName && airportCode) {
      return `${airportName} (${airportCode})`;
    }

    if (airportName) {
      return airportName;
    }

    if (airportCode) {
      return `${locationLabel || 'Airport'} airport (${airportCode})`;
    }

    return locationLabel;
  };
  const getAirportCodeHelper = (airport = {}) => {
    const airportCode = getAirportCodeLabel(airport);

    return airportCode ? `Airport code ${airportCode}` : '';
  };
  const formatFullTransportDateTime = (value) => {
    if (!value) return 'Unavailable';

    const normalizedValue = String(value).includes('T') ? value : String(value).replace(' ', 'T');
    const parsedDate = new Date(normalizedValue);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return value;
  };
  const getAirportDetailRows = (airport = {}) =>
    [
      ['Airport', getFlightPlaceLabel(airport)],
      ['IATA code', airport.iata],
      ['ICAO code', airport.icao],
      ['City', airport.city],
      ['Country code', airport.countryCode],
      ['Timezone', airport.timezone],
    ].filter(([, value]) => value);
  const getFlightStatusLabel = (flight = {}) => flight.status || (flight.type === 'live' ? 'Live' : 'Scheduled');
  const getFlightTypeLabel = (flight = {}) => (flight.type === 'live' ? 'Live flight' : 'Scheduled flight');
  const getCarrierBadgeLabel = (flight = {}) =>
    flight.airline?.iata || flight.airline?.icao || getFlightCodeLabel(flight).slice(0, 2) || flight.airline?.name?.slice(0, 2) || 'FL';
  const getAirlineDisplayName = (flight = {}) => {
    const airlineName = flight.airline?.name || '';
    const airlineCode = flight.airline?.iata || flight.airline?.icao || '';

    if (!airlineName || airlineName === 'Airline name unavailable') {
      return airlineCode ? `Airline ${airlineCode}` : 'Airline unavailable';
    }

    if (airlineCode && airlineName.toLowerCase() === airlineCode.toLowerCase()) {
      return `Airline ${airlineCode}`;
    }

    return airlineName;
  };
  const sortedFlightItems = useMemo(() => {
    const getTimeValue = (value) => {
      const parsedTime = new Date(value).getTime();
      return Number.isFinite(parsedTime) ? parsedTime : Number.MAX_SAFE_INTEGER;
    };
    const getPriceValue = (flight = {}) => Number(flight.priceEstimate?.min ?? flight.priceEstimate?.amount ?? Number.MAX_SAFE_INTEGER);

    return [...(flightResults?.items || [])].sort((firstFlight, secondFlight) => {
      if (flightSort === 'arrival') {
        return (
          getTimeValue(firstFlight.arrival?.scheduledTime || firstFlight.arrival?.actualTime) -
          getTimeValue(secondFlight.arrival?.scheduledTime || secondFlight.arrival?.actualTime)
        );
      }

      if (flightSort === 'price') {
        return getPriceValue(firstFlight) - getPriceValue(secondFlight);
      }

      return (
        getTimeValue(firstFlight.departure?.scheduledTime || firstFlight.departure?.actualTime) -
        getTimeValue(secondFlight.departure?.scheduledTime || secondFlight.departure?.actualTime)
      );
    });
  }, [flightResults?.items, flightSort]);
  const activeItems = activeTransportTab === 'flights' ? sortedFlightItems : trainResults?.items || [];
  const activeResultCount = activeItems.length;
  const hasActiveTransportSearch = activeTransportTab === 'flights' ? Boolean(flightResults) : Boolean(trainResults);
  const selectedFromCountry = countryOptions.find((country) => country.isoCode === flightSearch.fromCountryCode);
  const selectedToCountry = countryOptions.find((country) => country.isoCode === flightSearch.toCountryCode);
  useEffect(() => {
    setFromCountryQuery(selectedFromCountry?.name || '');
  }, [selectedFromCountry?.name]);
  useEffect(() => {
    setToCountryQuery(selectedToCountry?.name || '');
  }, [selectedToCountry?.name]);
  useEffect(() => {
    const closeCountryMenu = (event) => {
      if (!countryMenuRef.current?.contains(event.target)) {
        setOpenCountryMenu('');
      }
    };

    document.addEventListener('mousedown', closeCountryMenu);
    return () => document.removeEventListener('mousedown', closeCountryMenu);
  }, []);
  useEffect(() => {
    const closeFlightDialog = (event) => {
      if (event.key === 'Escape') {
        setSelectedFlight(null);
      }
    };

    document.addEventListener('keydown', closeFlightDialog);
    return () => document.removeEventListener('keydown', closeFlightDialog);
  }, []);
  const getCountryMatches = (query) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = normalizedQuery
      ? countryOptions.filter((country) =>
          [country.name, country.isoCode, country.phonecode].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery))
        )
      : countryOptions;

    return matches.slice(0, 10);
  };
  const handleCountryQueryChange = (fieldPrefix, value) => {
    const setQuery = fieldPrefix === 'from' ? setFromCountryQuery : setToCountryQuery;
    setQuery(value);
    setOpenCountryMenu(fieldPrefix);

    const exactMatch = countryOptions.find(
      (country) => country.name.toLowerCase() === value.trim().toLowerCase() || country.isoCode.toLowerCase() === value.trim().toLowerCase()
    );

    if (exactMatch) {
      handleFlightCountryChange(fieldPrefix, exactMatch.isoCode);
    } else if (!value.trim()) {
      clearFlightCountry(fieldPrefix);
    }
  };
  const selectCountry = (fieldPrefix, country) => {
    handleFlightCountryChange(fieldPrefix, country.isoCode);
    setOpenCountryMenu('');
  };
  const clearCountryCombobox = (fieldPrefix) => {
    if (fieldPrefix === 'from') {
      setFromCountryQuery('');
    } else {
      setToCountryQuery('');
    }
    clearFlightCountry(fieldPrefix);
    setOpenCountryMenu('');
  };
  const renderCountryCombobox = ({ fieldPrefix, label, placeholder, selectedCountry, query }) => {
    const options = getCountryMatches(query);

    return (
      <label className="explore-transport-form-field">
        <span>{label}</span>
        <div className="explore-country-combobox">
          <div className="explore-transport-input-shell">
            <span className="explore-transport-flag" aria-hidden="true">
              {selectedCountry ? getCountryFlag(selectedCountry.isoCode) : ''}
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => handleCountryQueryChange(fieldPrefix, event.target.value)}
              onFocus={() => setOpenCountryMenu(fieldPrefix)}
              placeholder={placeholder}
              role="combobox"
              aria-expanded={openCountryMenu === fieldPrefix}
              aria-controls={`explore-${fieldPrefix}-country-options`}
              autoComplete="off"
            />
            <button
              className="explore-country-chevron"
              type="button"
              aria-label={`Show ${label.toLowerCase()} options`}
              onClick={() => setOpenCountryMenu(openCountryMenu === fieldPrefix ? '' : fieldPrefix)}
            >
              <ChevronDown size={18} aria-hidden="true" />
            </button>
            {(selectedCountry || query) && (
              <button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => clearCountryCombobox(fieldPrefix)}>
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </div>
          {openCountryMenu === fieldPrefix && (
            <div className="explore-country-menu" id={`explore-${fieldPrefix}-country-options`} role="listbox">
              {options.length ? (
                options.map((country) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={country.isoCode === selectedCountry?.isoCode}
                    key={country.isoCode}
                    onClick={() => selectCountry(fieldPrefix, country)}
                  >
                    <span aria-hidden="true">{getCountryFlag(country.isoCode)}</span>
                    <strong>{country.name}</strong>
                    <small>{country.isoCode}</small>
                  </button>
                ))
              ) : (
                <p>No country found</p>
              )}
            </div>
          )}
        </div>
      </label>
    );
  };
  const transportTips =
    activeTransportTab === 'flights'
      ? [
          'Compare departure and arrival timing before saving transport.',
          'Use country and date filters to reduce noisy route matches.',
          'Review estimated prices as guidance rather than confirmed fares.',
        ]
      : [
          'Compare departure and arrival timing before saving transport.',
          'Use station, operator, and date filters to reduce noisy matches.',
          'Review estimated prices as guidance rather than confirmed fares.',
        ];
  const transportBriefing = (
    <section className="explore-briefing explore-transport-briefing" aria-label="Transportation travel briefing">
      {hasActiveTransportSearch && (
        <div className="explore-stats-row" aria-label="Transportation result summary">
          <article>
            <Search size={17} aria-hidden="true" />
            <div>
              <strong>{activeResultCount}</strong>
              <span>{activeTransportTab === 'flights' ? 'Flights loaded' : 'Trains loaded'}</span>
            </div>
          </article>
          <article>
            <Clock size={17} aria-hidden="true" />
            <div>
              <strong>{activeTransportTab === 'flights' ? 'Live' : 'Timetable'}</strong>
              <span>Schedule source</span>
            </div>
          </article>
          <article>
            <DollarSign size={17} aria-hidden="true" />
            <div>
              <strong>{activeResultCount ? 'AI' : '--'}</strong>
              <span>Price estimates</span>
            </div>
          </article>
        </div>
      )}

      <article className="explore-briefing-card explore-quick-tips-card">
        <div className="explore-briefing-title">
          <Sparkles size={17} aria-hidden="true" />
          <div>
            <span>Quick tips</span>
            <strong>Transport planning</strong>
          </div>
        </div>
        <ul className="explore-quick-tips-list">
          {transportTips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </article>
    </section>
  );
  return (
    <div className="explore-workspace">
      <div className="explore-transport-toolbar">
        <div className="travel-guide-tabs explore-transport-tabs" role="tablist" aria-label="Transportation type">
          {transportationTabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                className={activeTransportTab === tab.id ? 'active' : ''}
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTransportTab === tab.id}
                onClick={() => setActiveTransportTab(tab.id)}
              >
                <TabIcon size={15} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
        {activeTransportTab === 'flights' && (
          <form className="explore-transport-search-panel explore-transport-search-panel--flight" onSubmit={handleFlightSearch}>
            <div className="explore-transport-form-heading">
              <div className="explore-transport-heading-copy">
                <Search size={21} aria-hidden="true" />
                <div>
                  <strong>Search flights</strong>
                  <span>Fill in at least one of the fields below to search.</span>
                </div>
              </div>
              <p>
                <Clock size={15} aria-hidden="true" />
                You can search by route, airline, or both.
              </p>
            </div>
            <div className="explore-transport-route-row" ref={countryMenuRef}>
              {renderCountryCombobox({
                fieldPrefix: 'from',
                label: 'From country',
                placeholder: 'Any origin',
                selectedCountry: selectedFromCountry,
                query: fromCountryQuery,
              })}
              <div className="explore-transport-swap" aria-hidden="true">
                <ArrowLeftRight size={19} />
              </div>
              {renderCountryCombobox({
                fieldPrefix: 'to',
                label: 'To country',
                placeholder: 'Any destination',
                selectedCountry: selectedToCountry,
                query: toCountryQuery,
              })}
            </div>
            <div className="explore-transport-secondary-row">
              <label className="explore-transport-form-field">
                <span>Airline <small>(optional)</small></span>
                <div className="explore-transport-input-shell">
                  <Plane size={19} aria-hidden="true" />
                  <input
                    type="text"
                    value={flightSearch.airlineName}
                    onChange={(event) => handleFlightSearchChange('airlineName', event.target.value)}
                    placeholder="Select airline"
                    maxLength="120"
                  />
                  {flightSearch.airlineName && (
                    <button type="button" aria-label="Clear airline" onClick={() => clearFlightSearchField('airlineName')}>
                      <X size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </label>
              <label className="explore-transport-form-field">
                <span>Departure date <small>(optional)</small></span>
                <div className="explore-transport-input-shell">
                  <CalendarDays size={19} aria-hidden="true" />
                  <input
                    type="date"
                    value={flightSearch.departureDate}
                    min={getDateKey()}
                    onChange={(event) => handleFlightSearchChange('departureDate', event.target.value)}
                  />
                  {flightSearch.departureDate && (
                    <button type="button" aria-label="Clear departure date" onClick={() => clearFlightSearchField('departureDate')}>
                      <X size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </label>
              <button className="explore-transport-search-button" type="submit" disabled={isSearching}>
                {isSearching ? <LoaderCircle className="explore-spin" size={20} aria-hidden="true" /> : <Search size={20} aria-hidden="true" />}
                {isSearching ? 'Searching' : 'Search flights'}
              </button>
            </div>
          </form>
        )}
        {activeTransportTab === 'trains' && (
          <form className="explore-transport-search-panel explore-transport-search-panel--train" onSubmit={handleTrainStationSearch}>
            <div className="explore-transport-form-heading">
              <div className="explore-transport-heading-copy">
                <Search size={21} aria-hidden="true" />
                <div>
                  <strong>Search trains</strong>
                  <span>Fill in at least one of the fields below to search.</span>
                </div>
              </div>
              <p>
                <Clock size={15} aria-hidden="true" />
                You can search by station, operator, or both.
              </p>
            </div>
            <div className="explore-transport-route-row">
              <label className="explore-transport-form-field">
                <span>From station</span>
                <div className="explore-transport-input-shell">
                  <MapPin size={19} aria-hidden="true" />
                  <input
                    type="text"
                    value={trainSearch.stationQuery}
                    onChange={(event) => handleTrainSearchChange('stationQuery', event.target.value)}
                    placeholder="Euston or EUS"
                    maxLength="120"
                  />
                  {trainSearch.stationQuery && (
                    <button type="button" aria-label="Clear station search" onClick={() => clearTrainSearchField('stationQuery')}>
                      <X size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </label>
              <div className="explore-transport-swap" aria-hidden="true">
                <ArrowLeftRight size={19} />
              </div>
              <label className="explore-transport-form-field">
                <span>To station <small>(optional)</small></span>
                <div className="explore-transport-input-shell">
                  <MapPin size={19} aria-hidden="true" />
                  <input
                    type="text"
                    value={trainSearch.destinationQuery}
                    onChange={(event) => handleTrainSearchChange('destinationQuery', event.target.value)}
                    placeholder="Destination station"
                    maxLength="120"
                  />
                  {trainSearch.destinationQuery && (
                    <button type="button" aria-label="Clear destination station" onClick={() => clearTrainSearchField('destinationQuery')}>
                      <X size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </label>
            </div>
            <div className="explore-transport-secondary-row">
              <label className="explore-transport-form-field">
                <span>Operator <small>(optional)</small></span>
                <div className="explore-transport-input-shell">
                  <TrainFront size={19} aria-hidden="true" />
                  <input
                    type="text"
                    value={trainSearch.operatorName}
                    onChange={(event) => handleTrainSearchChange('operatorName', event.target.value)}
                    placeholder="Select operator"
                    maxLength="120"
                  />
                  {trainSearch.operatorName && (
                    <button type="button" aria-label="Clear operator search" onClick={() => clearTrainSearchField('operatorName')}>
                      <X size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </label>
              <label className="explore-transport-form-field">
                <span>Departure date <small>(optional)</small></span>
                <div className="explore-transport-input-shell">
                  <CalendarDays size={19} aria-hidden="true" />
                  <input
                    type="date"
                    value={trainSearch.departureDate}
                    onChange={(event) => handleTrainSearchChange('departureDate', event.target.value)}
                  />
                  {trainSearch.departureDate && (
                    <button type="button" aria-label="Clear train departure date" onClick={() => clearTrainSearchField('departureDate')}>
                      <X size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </label>
              <button className="explore-transport-search-button" type="submit" disabled={isSearching}>
                {isSearching ? <LoaderCircle className="explore-spin" size={20} aria-hidden="true" /> : <Search size={20} aria-hidden="true" />}
                {isSearching ? 'Loading' : 'Search trains'}
              </button>
            </div>
          </form>
        )}
      </div>

      {activeTransportTab === 'flights' ? (
        <>
          {error && <p className="form-error explore-status">{error}</p>}
          {status && !error && <p className="form-success explore-status">{status}</p>}
          {transportBriefing}

          {flightResults?.available ? (
            <section className="explore-results-layout explore-results-layout--flight">
              <section className="explore-results-board">
                <div className="explore-results-board-title explore-results-board-title--transport">
                  <div>
                    <h3>{flightResults.items.length} flight{flightResults.items.length === 1 ? '' : 's'} found</h3>
                    <span>Results from {getFlightSearchTitle()}</span>
                  </div>
                  <label className="explore-result-sort">
                    <span>Sort by</span>
                    <select value={flightSort} onChange={(event) => setFlightSort(event.target.value)}>
                      <option value="departure">Departure time</option>
                      <option value="arrival">Arrival time</option>
                      <option value="price">Estimated price</option>
                    </select>
                  </label>
                </div>
                <div className="explore-transport-result-list explore-transport-result-list--flight">
                  {sortedFlightItems.map((flight, index) => {
                    const departureTimeValue = flight.departure.scheduledTime || flight.departure.actualTime;
                    const arrivalTimeValue = flight.arrival.scheduledTime || flight.arrival.actualTime;
                    return (
                      <article className="explore-transport-result-card explore-transport-result-card--flight" key={`${flight.id}-${index}`}>
                        <div className="explore-transport-carrier">
                          <span className="explore-flight-carrier-mark" aria-hidden="true">
                            {getCarrierBadgeLabel(flight)}
                          </span>
                          <div>
                            <span>{getFlightCodeLabel(flight)}</span>
                            <strong>{getAirlineDisplayName(flight)}</strong>
                            <small>Direct</small>
                          </div>
                        </div>
                        <div className="explore-transport-time">
                          <strong>{formatFlightTime(departureTimeValue)}</strong>
                          <span>{getFlightPlaceLabel(flight.departure.airport)}</span>
                          <small>{[formatTransportDate(departureTimeValue), getAirportCodeHelper(flight.departure.airport)].filter(Boolean).join(' - ')}</small>
                        </div>
                        <div className="explore-transport-path explore-transport-path--flight">
                          <span>{formatFlightDuration(flight.durationMinutes)}</span>
                          <div>
                            <Plane size={14} aria-hidden="true" />
                          </div>
                          <small>Direct</small>
                        </div>
                        <div className="explore-transport-time">
                          <strong>{formatFlightTime(arrivalTimeValue)}</strong>
                          <span>{getFlightPlaceLabel(flight.arrival.airport)}</span>
                          <small>{[formatTransportDate(arrivalTimeValue), getAirportCodeHelper(flight.arrival.airport)].filter(Boolean).join(' - ')}</small>
                        </div>
                        <div className="explore-transport-action">
                          <div className="explore-flight-price" tabIndex="0" aria-label="AI estimated ticket price">
                            <span>AI estimate</span>
                            <strong>{flight.priceEstimate?.display || '-'}</strong>
                          </div>
                          <button type="button" onClick={() => setSelectedFlight(flight)}>
                            View details
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </section>
          ) : (
            <section className="explore-results-shell">
              <div className="explore-empty explore-placeholder">
                <Plane size={34} aria-hidden="true" />
                <h3 className={flightResults && !flightResults.available ? 'form-error' : undefined}>
                  {flightResults?.message || 'Search by route'}
                </h3>
                <p>Enter an airline name, choose one or both countries, and optionally set a departure date.</p>
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          {error && <p className="form-error explore-status">{error}</p>}
          {status && !error && <p className="form-success explore-status">{status}</p>}
          {transportBriefing}

          {trainResults?.available ? (
            <section className="explore-results-layout explore-results-layout--train">
              <section className="explore-results-board">
                <div className="explore-results-board-title explore-results-board-title--transport">
                  <div>
                    <h3>{trainResults.items.length} train{trainResults.items.length === 1 ? '' : 's'} found</h3>
                    <span>Results from {trainResults.stationName || trainResults.stationCode || 'selected station'}</span>
                  </div>
                </div>
                <div className="explore-transport-result-list explore-transport-result-list--train">
                  {trainResults.items.map((train, index) => (
                    <article
                      className="explore-transport-result-card explore-transport-result-card--train"
                      key={`${train.id}-${index}`}
                    >
                      <div className="explore-transport-carrier">
                        <span className="explore-train-carrier-mark" aria-hidden="true">
                          <TrainFront size={20} />
                        </span>
                        <div>
                          <span>{getTrainRunLabel(train)}</span>
                          <strong>{train.operatorName || train.operator || 'Operator unavailable'}</strong>
                          <small>{getTrainRouteLabel(train)}</small>
                        </div>
                      </div>
                      <div className="explore-transport-time">
                        <strong>{getTrainDepartureTime(train)}</strong>
                        <span>{train.originName || trainResults.stationName}</span>
                        <small>{getTrainDateLabel(train, 'departure')}</small>
                      </div>
                      <div className="explore-transport-path explore-transport-path--train">
                        <span>{getTrainDistanceLabel(train)}</span>
                        <div>
                          <TrainFront size={14} aria-hidden="true" />
                        </div>
                        <small>Timetable</small>
                      </div>
                      <div className="explore-transport-time">
                        <strong>{getTrainArrivalTime(train)}</strong>
                        <span>{train.destinationName || 'Destination unavailable'}</span>
                        <small>{getTrainDateLabel(train, 'arrival')}</small>
                      </div>
                      <div className="explore-transport-action">
                        <div className="explore-flight-price" tabIndex="0" aria-label="AI estimated train ticket price">
                          <span>AI estimate</span>
                          <strong>{getTrainPriceLabel(train)}</strong>
                        </div>
                        <button type="button" onClick={() => handleTrainSelect(train)} disabled={isSearching}>
                          View stops
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </section>
          ) : (
            <section className="explore-results-shell">
              <div className="explore-empty explore-placeholder">
                <TrainFront size={34} aria-hidden="true" />
                <h3 className={trainResults && !trainResults.available ? 'form-error' : undefined}>
                  {trainResults?.message || 'Load a station timetable'}
                </h3>
                <p>Search by operator, date, station, or leave station empty to use London Euston.</p>
              </div>
            </section>
          )}
        </>
      )}
      {selectedFlight && (
        <div className="explore-flight-dialog-backdrop" role="presentation" onMouseDown={() => setSelectedFlight(null)}>
          <section
            className="explore-flight-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="explore-flight-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="explore-flight-dialog-header">
              <div className="explore-flight-dialog-carrier">
                <span className="explore-flight-carrier-mark" aria-hidden="true">
                  {getCarrierBadgeLabel(selectedFlight)}
                </span>
                <div>
                  <span>{getFlightTypeLabel(selectedFlight)}</span>
                  <h3 id="explore-flight-dialog-title">{getFlightCodeLabel(selectedFlight)}</h3>
                  <p>{getAirlineDisplayName(selectedFlight)}</p>
                </div>
              </div>
              <button type="button" aria-label="Close flight details" onClick={() => setSelectedFlight(null)}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="explore-flight-dialog-summary">
              <article>
                <span>Status</span>
                <strong>{getFlightStatusLabel(selectedFlight)}</strong>
              </article>
              <article>
                <span>Duration</span>
                <strong>{formatFlightDuration(selectedFlight.durationMinutes)}</strong>
              </article>
              <article>
                <span>AI estimate</span>
                <strong>{selectedFlight.priceEstimate?.display || 'Unavailable'}</strong>
              </article>
            </div>

            <div className="explore-flight-dialog-route">
              <article>
                <span>Departure</span>
                <strong>{formatFlightTime(selectedFlight.departure?.scheduledTime || selectedFlight.departure?.actualTime)}</strong>
                <p>{getFlightPlaceLabel(selectedFlight.departure?.airport)}</p>
                <small>{formatFullTransportDateTime(selectedFlight.departure?.scheduledTime || selectedFlight.departure?.actualTime)}</small>
              </article>
              <div className="explore-flight-dialog-route-line" aria-hidden="true">
                <Plane size={16} />
              </div>
              <article>
                <span>Arrival</span>
                <strong>{formatFlightTime(selectedFlight.arrival?.scheduledTime || selectedFlight.arrival?.actualTime)}</strong>
                <p>{getFlightPlaceLabel(selectedFlight.arrival?.airport)}</p>
                <small>{formatFullTransportDateTime(selectedFlight.arrival?.scheduledTime || selectedFlight.arrival?.actualTime)}</small>
              </article>
            </div>

            <div className="explore-flight-detail-grid">
              <section>
                <h4>Departure details</h4>
                <dl>
                  {[
                    ...getAirportDetailRows(selectedFlight.departure?.airport),
                    ['Terminal', selectedFlight.departure?.terminal],
                    ['Gate', selectedFlight.departure?.gate],
                    ['Estimated time', selectedFlight.departure?.estimatedTime],
                    ['Actual time', selectedFlight.departure?.actualTime],
                  ]
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={`departure-${label}`}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                </dl>
              </section>
              <section>
                <h4>Arrival details</h4>
                <dl>
                  {[
                    ...getAirportDetailRows(selectedFlight.arrival?.airport),
                    ['Terminal', selectedFlight.arrival?.terminal],
                    ['Gate', selectedFlight.arrival?.gate],
                    ['Estimated time', selectedFlight.arrival?.estimatedTime],
                    ['Actual time', selectedFlight.arrival?.actualTime],
                  ]
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={`arrival-${label}`}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                </dl>
              </section>
            </div>

            {selectedFlight.live && (
              <section className="explore-flight-live-detail">
                <h4>Live flight data</h4>
                <dl>
                  {[
                    ['Latitude', selectedFlight.live.latitude],
                    ['Longitude', selectedFlight.live.longitude],
                    ['Altitude', selectedFlight.live.altitude],
                    ['Direction', selectedFlight.live.direction],
                    ['Speed', selectedFlight.live.speed],
                  ]
                    .filter(([, value]) => value !== null && value !== undefined && value !== '')
                    .map(([label, value]) => (
                      <div key={`live-${label}`}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                </dl>
              </section>
            )}

            <p className="explore-flight-dialog-note">
              Price is an AI estimate for planning only. Confirm final fare and availability with the airline or booking provider.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
// Default export registers the primary  value.
export default TransportationSubmenu;

