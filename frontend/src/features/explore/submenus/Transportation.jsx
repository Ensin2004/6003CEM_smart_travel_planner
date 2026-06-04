/**
 * Explore module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { ArrowLeftRight, Clock, DollarSign, LoaderCircle, Plane, Search, Sparkles, TrainFront, X } from 'lucide-react';
import { getDateKey } from '../explore.helpers';
import './Transportation.css';

const transportationTabs = [
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'trains', label: 'Trains', icon: TrainFront },
];
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
  getAirportDetailLabel,
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
  // Format Train Date converts raw values into readable display text.
  const formatTrainDate = (value) => value || 'Date unavailable';
  const getTrainDistanceLabel = (train = {}) => {
    const kilometers = Number(train.distanceEstimate?.kilometers);

    if (Number.isFinite(kilometers) && kilometers > 0) {
      return `${Math.round(kilometers).toLocaleString('en-US')} km`;
    }

    return train.distanceEstimate?.display || 'Distance unavailable';
  };
  const getTrainRunLabel = (train = {}) =>
    [train.trainUid || train.service || trainResults?.stationCode, train.platform ? `Platform ${train.platform}` : '']
      .filter(Boolean)
      .join(' - ') || 'Train service';
  const activeItems = activeTransportTab === 'flights' ? flightResults?.items || [] : trainResults?.items || [];
  const activeResultCount = activeItems.length;
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
      <div className="explore-stats-row" aria-label="Transportation result summary">
        <article>
          <Search size={17} aria-hidden="true" />
          <div>
            <strong>{activeResultCount || '--'}</strong>
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
            <label className="explore-transport-filter-box">
              <span>
                From
                <button
                  type="button"
                  aria-label="Clear from country"
                  onClick={(event) => {
                    event.preventDefault();
                    clearFlightCountry('from');
                  }}
                  disabled={!flightSearch.fromCountryCode}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
              <select value={flightSearch.fromCountryCode} onChange={(event) => handleFlightCountryChange('from', event.target.value)}>
                <option value="">Any origin</option>
                {countryOptions.map((country) => (
                  <option key={country.isoCode} value={country.isoCode}>
                    {country.name}
                  </option>
                ))}
              </select>
              <small>Optional</small>
            </label>
            <div className="explore-transport-swap" aria-hidden="true">
              <ArrowLeftRight size={19} />
            </div>
            <label className="explore-transport-filter-box">
              <span>
                To
                <button
                  type="button"
                  aria-label="Clear to country"
                  onClick={(event) => {
                    event.preventDefault();
                    clearFlightCountry('to');
                  }}
                  disabled={!flightSearch.toCountryCode}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
              <select value={flightSearch.toCountryCode} onChange={(event) => handleFlightCountryChange('to', event.target.value)}>
                <option value="">Any destination</option>
                {countryOptions.map((country) => (
                  <option key={country.isoCode} value={country.isoCode}>
                    {country.name}
                  </option>
                ))}
              </select>
              <small>Optional</small>
            </label>
            <label className="explore-transport-filter-box">
              <span>
                Departure
                <button
                  type="button"
                  aria-label="Clear departure date"
                  onClick={(event) => {
                    event.preventDefault();
                    clearFlightSearchField('departureDate');
                  }}
                  disabled={!flightSearch.departureDate}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
              <input
                type="date"
                value={flightSearch.departureDate}
                min={getDateKey()}
                onChange={(event) => handleFlightSearchChange('departureDate', event.target.value)}
              />
              <small>{flightSearch.departureDate ? 'Selected date' : 'Optional'}</small>
            </label>
            <label className="explore-transport-filter-box">
              <span>
                Airline
                <button
                  type="button"
                  aria-label="Clear airline"
                  onClick={(event) => {
                    event.preventDefault();
                    clearFlightSearchField('airlineName');
                  }}
                  disabled={!flightSearch.airlineName}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
              <input
                type="text"
                value={flightSearch.airlineName}
                onChange={(event) => handleFlightSearchChange('airlineName', event.target.value)}
                placeholder="Any airline"
              />
              <small>Optional</small>
            </label>
            <button className="explore-transport-search-button" type="submit" disabled={isSearching}>
              {isSearching ? <LoaderCircle className="explore-spin" size={20} aria-hidden="true" /> : <Search size={20} aria-hidden="true" />}
              {isSearching ? 'Searching' : 'Search'}
            </button>
          </form>
        )}
        {activeTransportTab === 'trains' && (
          <form className="explore-transport-search-panel explore-transport-search-panel--train" onSubmit={handleTrainStationSearch}>
            <label className="explore-transport-filter-box">
              <span>
                Operator
                <button
                  type="button"
                  aria-label="Clear operator search"
                  onClick={(event) => {
                    event.preventDefault();
                    clearTrainSearchField('operatorName');
                  }}
                  disabled={!trainSearch.operatorName}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
              <input
                type="text"
                value={trainSearch.operatorName}
                onChange={(event) => handleTrainSearchChange('operatorName', event.target.value)}
                placeholder="Any operator"
                maxLength="120"
              />
              <small>Optional</small>
            </label>
            <label className="explore-transport-filter-box">
              <span>
                Station
                <button
                  type="button"
                  aria-label="Clear station search"
                  onClick={(event) => {
                    event.preventDefault();
                    clearTrainSearchField('stationQuery');
                  }}
                  disabled={!trainSearch.stationQuery}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
              <input
                type="text"
                value={trainSearch.stationQuery}
                onChange={(event) => handleTrainSearchChange('stationQuery', event.target.value)}
                placeholder="Euston or EUS"
                maxLength="120"
              />
              <small>{trainSearch.stationQuery ? 'Station name or CRS code' : 'Optional, defaults to London Euston'}</small>
            </label>
            <label className="explore-transport-filter-box">
              <span>
                Departure
                <button
                  type="button"
                  aria-label="Clear train departure date"
                  onClick={(event) => {
                    event.preventDefault();
                    clearTrainSearchField('departureDate');
                  }}
                  disabled={!trainSearch.departureDate}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
              <input
                type="date"
                value={trainSearch.departureDate}
                onChange={(event) => handleTrainSearchChange('departureDate', event.target.value)}
              />
              <small>{trainSearch.departureDate ? 'Selected date' : 'Optional'}</small>
            </label>
            <label className="explore-transport-filter-box">
              <span>
                Arrival
                <button
                  type="button"
                  aria-label="Clear train arrival date"
                  onClick={(event) => {
                    event.preventDefault();
                    clearTrainSearchField('arrivalDate');
                  }}
                  disabled={!trainSearch.arrivalDate}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
              <input
                type="date"
                value={trainSearch.arrivalDate}
                onChange={(event) => handleTrainSearchChange('arrivalDate', event.target.value)}
              />
              <small>{trainSearch.arrivalDate ? 'Selected date' : 'Optional'}</small>
            </label>
            <button className="explore-transport-search-button" type="submit" disabled={isSearching}>
              {isSearching ? <LoaderCircle className="explore-spin" size={20} aria-hidden="true" /> : <Search size={20} aria-hidden="true" />}
              {isSearching ? 'Loading' : 'Search'}
            </button>
          </form>
        )}
      </div>

      {activeTransportTab === 'flights' ? (
        <>
          {error && <p className="form-error explore-status">{error}</p>}
          {status && <p className="form-success explore-status">{status}</p>}
          {transportBriefing}

          {flightResults?.available ? (
            <section className="explore-results-layout explore-results-layout--flight">
              <section className="explore-results-board">
                <div className="explore-results-board-title">
                  <div>
                    <span>1. Departures</span>
                    <h3>{getFlightSearchTitle()}</h3>
                  </div>
                  <strong>{flightResults.items.length} flight{flightResults.items.length === 1 ? '' : 's'} found</strong>
                </div>
                <div className="explore-transport-result-list">
                  {flightResults.items.map((flight, index) => {
                    const departureLabel = getAirportLocationLabel(flight.departure.airport);
                    const arrivalLabel = getAirportLocationLabel(flight.arrival.airport);
                    return (
                      <article className="explore-transport-result-card explore-transport-result-card--flight" key={`${flight.id}-${index}`}>
                        <div className="explore-transport-carrier">
                          <Plane size={30} aria-hidden="true" />
                          <div>
                            <strong>{flight.airline.name}</strong>
                            <span>{getFlightCodeLabel(flight)}</span>
                          </div>
                        </div>
                        <div className="explore-transport-time">
                          <strong>{formatFlightTime(flight.departure.scheduledTime || flight.departure.actualTime)}</strong>
                          <span>{departureLabel}</span>
                          <small>{getAirportDetailLabel(flight.departure.airport)}</small>
                        </div>
                        <div className="explore-transport-path explore-transport-path--flight">
                          <span>{formatFlightDuration(flight.durationMinutes)}</span>
                          <div />
                        </div>
                        <div className="explore-transport-time">
                          <strong>{formatFlightTime(flight.arrival.scheduledTime || flight.arrival.actualTime)}</strong>
                          <span>{arrivalLabel}</span>
                          <small>{getAirportDetailLabel(flight.arrival.airport)}</small>
                        </div>
                        <div className="explore-transport-action">
                          <div className="explore-transport-price-badge" tabIndex="0" aria-label="AI estimated ticket price">
                            <DollarSign size={14} aria-hidden="true" />
                            <span>AI estimate</span>
                            <strong>{flight.priceEstimate?.display || '-'}</strong>
                          </div>
                          <button type="button">View</button>
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
                <h3>{flightResults?.message || 'Search by route'}</h3>
                <p>Enter an airline name, choose one or both countries, and optionally set a departure date.</p>
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          {error && <p className="form-error explore-status">{error}</p>}
          {status && <p className="form-success explore-status">{status}</p>}
          {transportBriefing}

          {trainResults?.available ? (
            <section className="explore-results-layout explore-results-layout--train">
              <section className="explore-results-board">
                <div className="explore-results-board-title">
                  <div>
                    <span>1. Station timetable</span>
                    <h3>{trainResults.stationName || trainResults.stationCode || 'Train departures'}</h3>
                  </div>
                  <strong>{trainResults.items.length} train{trainResults.items.length === 1 ? '' : 's'} found</strong>
                </div>
                <div className="explore-transport-result-list">
                  {trainResults.items.map((train, index) => (
                    <article
                      className="explore-transport-result-card explore-transport-result-card--train"
                      key={`${train.id}-${index}`}
                    >
                      <div className="explore-transport-carrier">
                        <TrainFront size={30} aria-hidden="true" />
                        <div>
                          <strong>{train.operatorName || train.operator || 'Operator unavailable'}</strong>
                          <span>{getTrainRunLabel(train)}</span>
                        </div>
                      </div>
                      <div className="explore-transport-time">
                        <span>{train.originName || trainResults.stationName}</span>
                        <small>Departs {formatTrainDate(train.expectedDepartureDate || train.departureDate)}</small>
                      </div>
                      <div className="explore-transport-path explore-transport-path--train">
                        <span>{getTrainDistanceLabel(train)}</span>
                        <div />
                      </div>
                      <div className="explore-transport-time">
                        <span>{train.destinationName || 'Destination unavailable'}</span>
                        <small>Arrives {formatTrainDate(train.expectedArrivalDate || train.arrivalDate)}</small>
                      </div>
                      <div className="explore-transport-action">
                        <div className="explore-transport-price-badge" tabIndex="0" aria-label="AI estimated train ticket price">
                          <DollarSign size={14} aria-hidden="true" />
                          <span>AI estimate</span>
                          <strong>{train.priceEstimate?.display || '-'}</strong>
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
                <h3>{trainResults?.message || 'Load a station timetable'}</h3>
                <p>Search by operator, date, station, or leave station empty to use London Euston.</p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
// Default export registers the primary  value.
export default TransportationSubmenu;

