/**
 * Explore module.
 * Exports and local helpers keep related behavior in a single module.
 */
import {
  ArrowLeftRight,
  CalendarDays,
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
import { useEffect, useMemo, useState } from 'react';
import { getDateKey } from '../explore.helpers';
import './Transportation.css';

/**
 * Configuration for transportation tabs
 * Each tab defines an ID, display label, and associated icon
 */
const transportationTabs = [
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'trains', label: 'Trains', icon: TrainFront },
];

/**
 * TransportationSubmenu renders the main screen and handles nearby interactions.
 * Provides search and display functionality for flights and train services.
 * 
 * @param {Object} props - Component properties
 * @param {string} props.activeTransportTab - Currently active tab ID ('flights' or 'trains')
 * @param {Function} props.clearFlightSearchField - Handler to clear a specific flight search field
 * @param {Function} props.clearTrainSearchField - Handler to clear a specific train search field
 * @param {Array} props.countryOptions - Available country options for flight search
 * @param {string} props.error - Error message to display
 * @param {Object} props.flightResults - Flight search results data
 * @param {Object} props.flightSearch - Current flight search parameters
 * @param {Function} props.formatFlightDuration - Formatter for flight duration
 * @param {Function} props.formatFlightTime - Formatter for flight time
 * @param {Function} props.getAirportLocationLabel - Gets airport location label
 * @param {Function} props.getFlightCodeLabel - Gets flight code label
 * @param {Function} props.getFlightSearchTitle - Gets the flight search title
 * @param {Function} props.handleFlightCountryChange - Handler for flight country filter changes
 * @param {Function} props.handleFlightSearch - Handler for flight search submission
 * @param {Function} props.handleFlightSearchChange - Handler for flight search field changes
 * @param {Function} props.handleTrainSearchChange - Handler for train search field changes
 * @param {Function} props.handleTrainSelect - Handler for selecting a train
 * @param {Function} props.handleTrainStationSearch - Handler for train station search submission
 * @param {boolean} props.isSearching - Whether a search is in progress
 * @param {Function} props.setActiveTransportTab - Handler for changing active transport tab
 * @param {string} props.status - Status message to display
 * @param {Object} props.trainResults - Train search results data
 * @param {Object} props.trainSearch - Current train search parameters
 */
function TransportationSubmenu({
  activeTransportTab,
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
  // State for flight sorting and selected flight detail view
  const [flightSort, setFlightSort] = useState('departure');
  const [selectedFlight, setSelectedFlight] = useState(null);
  
  /**
   * Format Train Date converts raw values into readable display text.
   * 
   * @param {string} value - Raw date value
   * @returns {string} Formatted date string or placeholder
   */
  const formatTrainDate = (value) => value || 'Date unavailable';
  
  /**
   * Gets the distance label for a train service.
   * 
   * @param {Object} train - Train service object
   * @returns {string} Formatted distance label
   */
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
  
  /**
   * Gets the price label for a train service.
   * 
   * @param {Object} train - Train service object
   * @returns {string} Formatted price label
   */
  const getTrainPriceLabel = (train = {}) =>
    train.priceEstimate?.available && train.priceEstimate?.display
      ? train.priceEstimate.display
      : train.priceEstimate?.display || 'AI estimate unavailable';
  
  /**
   * Gets the run label for a train service.
   * 
   * @param {Object} train - Train service object
   * @returns {string} Train run identifier
   */
  const getTrainRunLabel = (train = {}) => train.trainUid || train.service || trainResults?.stationCode || 'Train service';
  
  /**
   * Gets the platform label for a train service.
   * 
   * @param {Object} train - Train service object
   * @returns {string} Platform label or placeholder
   */
  const getTrainPlatformLabel = (train = {}) => (train.platform ? `Platform ${train.platform}` : 'Platform not provided');
  
  /**
   * Gets the departure time for a train service.
   * 
   * @param {Object} train - Train service object
   * @returns {string} Departure time string
   */
  const getTrainDepartureTime = (train = {}) =>
    train.expectedDepartureTime || train.actualDepartureTime || train.aimedDepartureTime || '--:--';
  
  /**
   * Gets the arrival time for a train service.
   * 
   * @param {Object} train - Train service object
   * @returns {string} Arrival time string
   */
  const getTrainArrivalTime = (train = {}) => train.expectedArrivalTime || train.actualArrivalTime || train.aimedArrivalTime || '--:--';
  
  /**
   * Gets the date label for a train service.
   * 
   * @param {Object} train - Train service object
   * @param {string} kind - Type of date ('departure' or 'arrival')
   * @returns {string} Formatted date string
   */
  const getTrainDateLabel = (train = {}, kind = 'departure') =>
    kind === 'arrival'
      ? formatTrainDate(train.expectedArrivalDate || train.arrivalDate || train.serviceDate || trainResults?.date)
      : formatTrainDate(train.expectedDepartureDate || train.departureDate || train.serviceDate || trainResults?.date);
  
  /**
   * Formats a transport date for display.
   * 
   * @param {string} value - Raw date value
   * @returns {string} Formatted date string
   */
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
  
  /**
   * Gets the airport code label.
   * 
   * @param {Object} airport - Airport object
   * @returns {string} IATA or ICAO code
   */
  const getAirportCodeLabel = (airport = {}) => airport.iata || airport.icao || '';
  
  /**
   * Gets the full place label for an airport.
   * 
   * @param {Object} airport - Airport object
   * @returns {string} Complete airport location label
   */
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
  
  /**
   * Formats full date and time for transport displays.
   * 
   * @param {string} value - Raw date time value
   * @returns {string} Formatted date time string
   */
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
  
  /**
   * Gets detail rows for an airport.
   * 
   * @param {Object} airport - Airport object
   * @returns {Array} Array of [label, value] pairs for display
   */
  const getAirportDetailRows = (airport = {}) =>
    [
      ['Airport', getFlightPlaceLabel(airport)],
      ['IATA code', airport.iata],
      ['ICAO code', airport.icao],
      ['City', airport.city],
      ['Country code', airport.countryCode],
      ['Timezone', airport.timezone],
    ].filter(([, value]) => value);
  
  /**
   * Gets the flight status label.
   * 
   * @param {Object} flight - Flight object
   * @returns {string} Status label
   */
  const getFlightStatusLabel = (flight = {}) => flight.status || (flight.type === 'live' ? 'Live' : 'Scheduled');
  
  /**
   * Gets the flight type label.
   * 
   * @param {Object} flight - Flight object
   * @returns {string} Type label
   */
  const getFlightTypeLabel = (flight = {}) => (flight.type === 'live' ? 'Live flight' : 'Scheduled flight');
  
  /**
   * Gets the carrier badge label for a flight.
   * 
   * @param {Object} flight - Flight object
   * @returns {string} Carrier code for badge display
   */
  const getCarrierBadgeLabel = (flight = {}) =>
    flight.airline?.iata || flight.airline?.icao || getFlightCodeLabel(flight).slice(0, 2) || flight.airline?.name?.slice(0, 2) || 'FL';
  
  /**
   * Gets the airline display name.
   * 
   * @param {Object} flight - Flight object
   * @returns {string} Full airline name or placeholder
   */
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
  
  /**
   * Memoized sorted flight items based on selected sort criterion.
   * Sorts by departure time, arrival time, or estimated price.
   */
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
  
  // Determine active items and result count based on current tab
  const activeItems = activeTransportTab === 'flights' ? sortedFlightItems : trainResults?.items || [];
  const activeResultCount = activeItems.length;
  const hasActiveTransportSearch = activeTransportTab === 'flights' ? Boolean(flightResults) : Boolean(trainResults);
  
  /**
   * Effect hook that handles closing the flight detail dialog with Escape key
   */
  useEffect(() => {
    const closeFlightDialog = (event) => {
      if (event.key === 'Escape') {
        setSelectedFlight(null);
      }
    };

    document.addEventListener('keydown', closeFlightDialog);
    return () => document.removeEventListener('keydown', closeFlightDialog);
  }, []);
  
  /**
   * Renders a country selection dropdown for flight search.
   * 
   * @param {Object} params - Parameters for the country select
   * @param {string} params.fieldPrefix - Prefix for the field name
   * @param {string} params.label - Display label for the field
   * @param {string} params.value - Currently selected value
   * @returns {JSX.Element} Country select component
   */
  const renderCountrySelect = ({ fieldPrefix, label, value }) => (
    <label className="explore-transport-form-field">
      <span>{label}</span>
      <div className="explore-transport-country-field">
        <span className="sr-only">{label}</span>
        <select
          value={value}
          onChange={(event) => handleFlightCountryChange(fieldPrefix, event.target.value)}
        >
          <option value="">Country</option>
          {countryOptions.map((country) => (
            <option key={country.isoCode} value={country.isoCode}>
              {country.name}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
  
  /**
   * Quick tips for transport planning based on active tab
   */
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
  
  /**
   * Transport briefing component with results summary and quick tips
   */
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
      {/* Transportation toolbar with tab switching and search forms */}
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
        
        {/* Flight search form */}
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
                Choose at least one country, then optionally narrow by airline or date.
              </p>
            </div>
            <div className="explore-transport-route-row">
              {renderCountrySelect({
                fieldPrefix: 'from',
                label: 'From country',
                value: flightSearch.fromCountryCode,
              })}
              <div className="explore-transport-swap" aria-hidden="true">
                <ArrowLeftRight size={19} />
              </div>
              {renderCountrySelect({
                fieldPrefix: 'to',
                label: 'To country',
                value: flightSearch.toCountryCode,
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
        
        {/* Train search form */}
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

      {/* Flight results section */}
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
                          <span className="explore-flight-carrier-mark explore-flight-carrier-mark--result" aria-hidden="true">
                            <Plane size={20} />
                          </span>
                          <div>
                            <span>{getFlightCodeLabel(flight)}</span>
                            <strong>{getAirlineDisplayName(flight)}</strong>
                          </div>
                        </div>
                        <div className="explore-transport-time">
                          <strong>{formatFlightTime(departureTimeValue)}</strong>
                          <span>{getFlightPlaceLabel(flight.departure.airport)}</span>
                          <small>{formatTransportDate(departureTimeValue)}</small>
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
                          <small>{formatTransportDate(arrivalTimeValue)}</small>
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
                <p>Choose one or both countries, then optionally add airline name and departure date.</p>
              </div>
            </section>
          )}
        </>
      ) : (
        /* Train results section */
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
                      role="link"
                      tabIndex={isSearching ? -1 : 0}
                      onClick={() => {
                        if (!isSearching) handleTrainSelect(train);
                      }}
                      onKeyDown={(event) => {
                        if (!isSearching && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault();
                          handleTrainSelect(train);
                        }
                      }}
                      aria-label={`View all stops for ${getTrainRunLabel(train)} to ${train.destinationName || 'destination'}`}
                    >
                      <div className="explore-transport-carrier">
                        <span className="explore-train-carrier-mark" aria-hidden="true">
                          <TrainFront size={20} />
                        </span>
                        <div>
                          <span>{getTrainRunLabel(train)}</span>
                          <strong>{train.operatorName || train.operator || 'Operator unavailable'}</strong>
                          <small className="explore-train-platform">{getTrainPlatformLabel(train)}</small>
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
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleTrainSelect(train);
                          }}
                          disabled={isSearching}
                        >
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
      
      {/* Flight detail dialog modal */}
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

// Default export registers the primary value.
export default TransportationSubmenu;
