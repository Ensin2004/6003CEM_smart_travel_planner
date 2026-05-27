import { ArrowLeftRight, DollarSign, LoaderCircle, Plane, Search, TrainFront, X } from 'lucide-react';
import { getDateKey } from '../explore.helpers';
import './Transportation.css';

const transportationTabs = [
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'trains', label: 'Trains', icon: TrainFront },
];

function TransportationSubmenu({
  activeTransportTab,
  clearFlightCountry,
  clearFlightSearchField,
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
  isSearching,
  setActiveTransportTab,
  status,
}) {
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
          <form className="explore-flight-search-panel" onSubmit={handleFlightSearch}>
            <label className="explore-flight-route-box">
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
            <div className="explore-flight-swap" aria-hidden="true">
              <ArrowLeftRight size={19} />
            </div>
            <label className="explore-flight-route-box">
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
            <label className="explore-flight-route-box">
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
            <label className="explore-flight-route-box">
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
            <button className="explore-flight-search-button" type="submit" disabled={isSearching}>
              {isSearching ? <LoaderCircle className="explore-spin" size={20} aria-hidden="true" /> : <Search size={20} aria-hidden="true" />}
              {isSearching ? 'Searching' : 'Search'}
            </button>
          </form>
        )}
      </div>

      {activeTransportTab === 'flights' ? (
        <>
          {error && <p className="form-error explore-status">{error}</p>}
          {status && <p className="form-success explore-status">{status}</p>}

          {flightResults?.available ? (
            <section className="explore-flight-results-layout">
              <section className="explore-flight-results-board">
                <div className="explore-flight-board-title">
                  <div>
                    <span>1. Departures</span>
                    <h3>{getFlightSearchTitle()}</h3>
                  </div>
                  <strong>{flightResults.items.length} flight{flightResults.items.length === 1 ? '' : 's'} found</strong>
                </div>
                <div className="explore-flight-list">
                  {flightResults.items.map((flight, index) => {
                    const departureLabel = getAirportLocationLabel(flight.departure.airport);
                    const arrivalLabel = getAirportLocationLabel(flight.arrival.airport);

                    return (
                      <article className="explore-flight-card" key={`${flight.id}-${index}`}>
                        <div className="explore-flight-airline">
                          <Plane size={30} aria-hidden="true" />
                          <div>
                            <strong>{flight.airline.name}</strong>
                            <span>{getFlightCodeLabel(flight)}</span>
                          </div>
                        </div>
                        <div className="explore-flight-time">
                          <strong>{formatFlightTime(flight.departure.scheduledTime || flight.departure.actualTime)}</strong>
                          <span>{departureLabel}</span>
                          <small>{getAirportDetailLabel(flight.departure.airport)}</small>
                        </div>
                        <div className="explore-flight-path">
                          <span>{formatFlightDuration(flight.durationMinutes)}</span>
                          <div />
                        </div>
                        <div className="explore-flight-time">
                          <strong>{formatFlightTime(flight.arrival.scheduledTime || flight.arrival.actualTime)}</strong>
                          <span>{arrivalLabel}</span>
                          <small>{getAirportDetailLabel(flight.arrival.airport)}</small>
                        </div>
                        <div className="explore-flight-action">
                          <div className="explore-flight-price-badge" tabIndex="0" aria-label="AI estimated ticket price">
                            <DollarSign size={14} aria-hidden="true" />
                            <strong>{flight.priceEstimate?.display || 'AI estimate unavailable'}</strong>
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
        <div className="explore-empty explore-placeholder">
          <TrainFront size={34} aria-hidden="true" />
          <h3>Trains coming soon</h3>
          <p>Train schedules will be added to this transportation workspace later.</p>
        </div>
      )}
    </div>
  );
}

export default TransportationSubmenu;
