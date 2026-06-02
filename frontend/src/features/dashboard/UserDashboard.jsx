/**
 * Dashboard module.
 * Page state, derived statistics, and render sections define the home dashboard experience.
 */
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudSun,
  LayoutGrid,
  ListFilter,
  LoaderCircle,
  MapPin,
  Plane,
  Search,
  Star,
  Sun,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getTrips, getTripSummary } from '../../api/tripApi';
import { getVisitedCalendar, getVisitedPlaces } from '../../api/visitedPlaceApi';
import './UserDashboard.css';

const formatDateKey = (date) => date.toISOString().slice(0, 10);
const getMonthBounds = (monthDate) => {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  return { start, end };
};
const buildCalendarCells = (monthDate, dayLookup) => {
  const { start, end } = getMonthBounds(monthDate);
  const firstWeekday = start.getDay();
  const cells = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ key: `blank-${index}`, blank: true });
  }

  for (let day = 1; day <= end.getDate(); day += 1) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    const dateKey = formatDateKey(date);
    cells.push({ key: dateKey, dateKey, day, places: dayLookup[dateKey] || [] });
  }

  return cells;
};
const getVisitCount = (place) => (place.visits || []).reduce((total, visit) => total + Number(visit.visitCount || 1), 0);
const getDatedVisitCount = (place) =>
  (place.visits || [])
    .filter((visit) => visit.visitedDate)
    .reduce((total, visit) => total + Number(visit.visitCount || 1), 0);
const getLatestVisitLabel = (place) => {
  const latestDate = place.latestVisitedDate || (place.visits || []).find((visit) => visit.visitedDate)?.visitedDate;
  return latestDate ? new Date(latestDate).toLocaleDateString() : 'No date saved';
};
const getTypeLabel = (type) => String(type || 'place').replace(/-/g, ' ');
const formatShortDate = (date) => (date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date');
const chartColors = ['#0f766e', '#2563eb', '#f59e0b', '#7c3aed', '#dc2626', '#0891b2'];
const getTripStatusGroups = (trips = []) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return trips.reduce(
    (groups, trip) => {
      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);
      if (endDate < today) groups.past.push(trip);
      else if (startDate <= today && endDate >= today) groups.active.push(trip);
      else groups.upcoming.push(trip);
      return groups;
    },
    { active: [], upcoming: [], past: [] }
  );
};
const getDonutSegments = (items) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let offset = 25;

  return items.map((item) => {
    const length = total ? (item.value / total) * 100 : 0;
    const segment = { ...item, dasharray: `${length} ${100 - length}`, dashoffset: offset };
    offset -= length;
    return segment;
  });
};

// UserDashboard renders the main screen and handles nearby interactions.
function UserDashboard() {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [activeView, setActiveView] = useState('calendar');
  const [searchTerm, setSearchTerm] = useState('');
  const [days, setDays] = useState([]);
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const [trips, setTrips] = useState([]);
  const [weatherPreview, setWeatherPreview] = useState(null);
  const [tripStatus, setTripStatus] = useState('loading');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const dayLookup = useMemo(
    () => days.reduce((lookup, day) => ({ ...lookup, [day.date]: day.places || [] }), {}),
    [days]
  );
  const calendarCells = useMemo(() => buildCalendarCells(monthDate, dayLookup), [dayLookup, monthDate]);
  const undatedVisits = useMemo(
    () => visitedPlaces.flatMap((place) =>
      (place.visits || [])
        .filter((visit) => !visit.visitedDate)
        .map((visit) => ({
          id: visit._id || `${place._id}-${visit.visitCount}`,
          title: place.title,
          type: place.type,
          address: place.address,
          visitCount: visit.visitCount || 1,
          notes: visit.notes,
        }))
    ),
    [visitedPlaces]
  );
  const placeRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const rows = visitedPlaces.map((place) => ({
      ...place,
      totalVisits: getVisitCount(place),
      datedVisits: getDatedVisitCount(place),
      undatedVisits: (place.visits || [])
        .filter((visit) => !visit.visitedDate)
        .reduce((total, visit) => total + Number(visit.visitCount || 1), 0),
      latestVisitLabel: getLatestVisitLabel(place),
    }));

    if (!normalizedSearch) return rows;

    return rows.filter((place) =>
      [place.title, place.address, place.type, place.source]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [searchTerm, visitedPlaces]);
  const monthLabel = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const datedVisitCount = days.reduce(
    (total, day) => total + (day.places || []).reduce((dayTotal, place) => dayTotal + Number(place.visitCount || 1), 0),
    0
  );
  const undatedVisitCount = undatedVisits.reduce((total, visit) => total + Number(visit.visitCount || 1), 0);
  const totalVisitCount = visitedPlaces.reduce((total, place) => total + getVisitCount(place), 0);
  const uniquePlaceCount = visitedPlaces.length;
  const favoritePlace = placeRows.reduce((topPlace, place) => (
    !topPlace || place.totalVisits > topPlace.totalVisits ? place : topPlace
  ), null);
  const visitedDayCount = days.filter((day) => day.places?.length).length;
  const tripGroups = useMemo(() => getTripStatusGroups(trips), [trips]);
  const sortedUpcomingTrips = useMemo(
    () => [...tripGroups.active, ...tripGroups.upcoming].sort((firstTrip, secondTrip) => new Date(firstTrip.startDate) - new Date(secondTrip.startDate)),
    [tripGroups]
  );
  const sortedPastTrips = useMemo(
    () => [...tripGroups.past].sort((firstTrip, secondTrip) => new Date(secondTrip.endDate) - new Date(firstTrip.endDate)),
    [tripGroups]
  );
  const nextTrip = sortedUpcomingTrips[0] || null;
  const weatherTemperature = weatherPreview?.weather?.temperature?.max || weatherPreview?.weather?.temperature?.mean
    ? `${Math.round(weatherPreview.weather.temperature.max || weatherPreview.weather.temperature.mean)}${weatherPreview.weather.temperature.unit || 'C'}`
    : '';
  const tripDonutSegments = useMemo(() => getDonutSegments([
    { label: 'Active', value: tripGroups.active.length, color: '#0f766e' },
    { label: 'Upcoming', value: tripGroups.upcoming.length, color: '#2563eb' },
    { label: 'Past', value: tripGroups.past.length, color: '#f59e0b' },
  ]), [tripGroups]);
  const visitTypeRows = useMemo(() => {
    const typeCounts = visitedPlaces.reduce((counts, place) => {
      const type = getTypeLabel(place.type);
      return { ...counts, [type]: (counts[type] || 0) + getVisitCount(place) };
    }, {});

    return Object.entries(typeCounts)
      .map(([label, value], index) => ({ label, value, color: chartColors[index % chartColors.length] }))
      .sort((firstRow, secondRow) => secondRow.value - firstRow.value)
      .slice(0, 6);
  }, [visitedPlaces]);
  const maxVisitTypeValue = Math.max(...visitTypeRows.map((row) => row.value), 1);
  const monthActivity = useMemo(() => {
    const { end } = getMonthBounds(monthDate);
    const dayCounts = days.reduce((counts, day) => ({
      ...counts,
      [day.date]: (day.places || []).reduce((total, place) => total + Number(place.visitCount || 1), 0),
    }), {});

    return Array.from({ length: end.getDate() }, (_, index) => {
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), index + 1);
      const dateKey = formatDateKey(date);
      return { day: index + 1, value: dayCounts[dateKey] || 0 };
    });
  }, [days, monthDate]);
  const maxMonthActivity = Math.max(...monthActivity.map((item) => item.value), 1);
  const datedSplitPercent = totalVisitCount ? Math.round((datedVisitCount / totalVisitCount) * 100) : 0;

  useEffect(() => {
    const { start, end } = getMonthBounds(monthDate);
    let isActive = true;

    setStatus('loading');
    setError('');
    getVisitedCalendar({
      startDate: formatDateKey(start),
      endDate: formatDateKey(end),
    })
      .then((response) => {
        if (!isActive) return;
        setDays(response.data?.data?.days || []);
        setStatus('success');
      })
      .catch((requestError) => {
        if (!isActive) return;
        setError(requestError.response?.data?.message || 'Unable to load visited calendar.');
        setStatus('error');
      });

    return () => {
      isActive = false;
    };
  }, [monthDate]);

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

    setTripStatus('loading');
    getTrips()
      .then((response) => {
        if (!isActive) return;
        const loadedTrips = response.data?.data?.trips || [];
        setTrips(loadedTrips);
        setTripStatus('success');
      })
      .catch(() => {
        if (!isActive) return;
        setTrips([]);
        setTripStatus('error');
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!nextTrip?._id) {
      setWeatherPreview(null);
      return () => {
        isActive = false;
      };
    }

    getTripSummary(nextTrip._id)
      .then((response) => {
        if (!isActive) return;
        setWeatherPreview(response.data?.data || null);
      })
      .catch(() => {
        if (isActive) setWeatherPreview(null);
      });

    return () => {
      isActive = false;
    };
  }, [nextTrip?._id]);

  const moveMonth = (direction) => {
    setMonthDate((currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span><BarChart3 size={16} aria-hidden="true" />Travel activity</span>
          <h2>Dashboard</h2>
          <p className="dashboard-heading-copy">Plan what is next, review completed trips, and track places already visited.</p>
        </div>
        <strong>{totalVisitCount} total visit{totalVisitCount === 1 ? '' : 's'}</strong>
      </div>

      <section className="dashboard-stat-grid" aria-label="Visited place statistics">
        <article>
          <span><Plane size={16} aria-hidden="true" />Upcoming</span>
          <strong>{tripGroups.active.length + tripGroups.upcoming.length}</strong>
          <small>Active and future trips</small>
        </article>
        <article>
          <span><Clock3 size={16} aria-hidden="true" />Past trips</span>
          <strong>{tripGroups.past.length}</strong>
          <small>Completed trip plans</small>
        </article>
        <article>
          <span><MapPin size={16} aria-hidden="true" />Visited</span>
          <strong>{uniquePlaceCount}</strong>
          <small>{totalVisitCount} total visits</small>
        </article>
        <article>
          <span><CalendarDays size={16} aria-hidden="true" />This month</span>
          <strong>{datedVisitCount}</strong>
          <small>{undatedVisitCount} undated visits</small>
        </article>
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-panel dashboard-trip-panel">
          <div className="dashboard-panel-heading">
            <div>
              <span>Trips</span>
              <h3>Upcoming plans</h3>
            </div>
            <small>{tripStatus === 'loading' ? 'Loading' : `${sortedUpcomingTrips.length} trip${sortedUpcomingTrips.length === 1 ? '' : 's'}`}</small>
          </div>
          {tripStatus === 'loading' ? (
            <p className="dashboard-muted"><LoaderCircle className="dashboard-spin" size={15} aria-hidden="true" /> Loading trips...</p>
          ) : sortedUpcomingTrips.length ? (
            <div className="dashboard-trip-list">
              {sortedUpcomingTrips.slice(0, 4).map((trip) => (
                <div key={trip._id}>
                  <span>{formatShortDate(trip.startDate)} - {formatShortDate(trip.endDate)}</span>
                  <strong>{trip.title || trip.destination}</strong>
                  <small>{[trip.destination, trip.country].filter(Boolean).join(', ') || 'Destination pending'}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="dashboard-muted">No upcoming trips yet.</p>
          )}
        </article>

        <article className="dashboard-panel dashboard-weather-panel">
          <div className="dashboard-panel-heading">
            <div>
              <span>Weather</span>
              <h3>{nextTrip ? nextTrip.destination : 'No trip selected'}</h3>
            </div>
            <CloudSun size={22} aria-hidden="true" />
          </div>
          {nextTrip ? (
            <>
              <strong>{weatherPreview?.weather?.available ? `${weatherPreview.weather.condition}${weatherTemperature ? `, ${weatherTemperature}` : ''}` : 'Weather pending'}</strong>
              <p>{weatherPreview?.weatherGuidance?.packingTips?.[0] || weatherPreview?.weather?.travelTip || 'Weather advice appears when forecast data is available.'}</p>
              <small>{formatShortDate(nextTrip.startDate)} next trip</small>
            </>
          ) : (
            <p>No upcoming trip weather to show.</p>
          )}
        </article>

        <article className="dashboard-panel dashboard-history-panel">
          <div className="dashboard-panel-heading">
            <div>
              <span>History</span>
              <h3>Past trips</h3>
            </div>
            <small>{sortedPastTrips.length} total</small>
          </div>
          {sortedPastTrips.length ? (
            <div className="dashboard-history-list">
              {sortedPastTrips.slice(0, 3).map((trip) => (
                <span key={trip._id}>
                  <Sun size={13} aria-hidden="true" />
                  {trip.title || trip.destination}
                </span>
              ))}
            </div>
          ) : (
            <p className="dashboard-muted">Past trips will appear after travel dates end.</p>
          )}
        </article>

        <article className="dashboard-panel dashboard-top-place-panel">
          <div className="dashboard-panel-heading">
            <div>
              <span>Favorite</span>
              <h3>Most visited place</h3>
            </div>
            <Star size={20} aria-hidden="true" />
          </div>
          <strong>{favoritePlace?.title || 'No visits yet'}</strong>
          <p>{favoritePlace ? `${favoritePlace.totalVisits} recorded visit${favoritePlace.totalVisits === 1 ? '' : 's'}` : 'Mark places as visited to build this summary.'}</p>
        </article>
      </section>

      <section className="dashboard-chart-grid" aria-label="Travel charts">
        <article className="dashboard-chart-card">
          <div className="dashboard-panel-heading">
            <div>
              <span>Trips</span>
              <h3>Status mix</h3>
            </div>
          </div>
          <div className="dashboard-donut-chart">
            <svg viewBox="0 0 42 42" aria-hidden="true">
              <circle className="dashboard-donut-track" cx="21" cy="21" r="15.9" />
              {tripDonutSegments.map((segment) => (
                <circle
                  className="dashboard-donut-segment"
                  cx="21"
                  cy="21"
                  key={segment.label}
                  r="15.9"
                  stroke={segment.color}
                  strokeDasharray={segment.dasharray}
                  strokeDashoffset={segment.dashoffset}
                />
              ))}
            </svg>
            <div>
              <strong>{trips.length}</strong>
              <span>Total trips</span>
            </div>
          </div>
          <div className="dashboard-chart-legend">
            {tripDonutSegments.map((segment) => (
              <span key={segment.label}><em style={{ background: segment.color }} />{segment.label}: {segment.value}</span>
            ))}
          </div>
        </article>

        <article className="dashboard-chart-card">
          <div className="dashboard-panel-heading">
            <div>
              <span>Places</span>
              <h3>Visit categories</h3>
            </div>
          </div>
          {visitTypeRows.length ? (
            <div className="dashboard-bar-chart">
              {visitTypeRows.map((row) => (
                <div key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                  <em style={{ width: `${Math.max(8, (row.value / maxVisitTypeValue) * 100)}%`, background: row.color }} />
                </div>
              ))}
            </div>
          ) : (
            <p className="dashboard-muted">Visit categories appear after places are marked visited.</p>
          )}
        </article>

        <article className="dashboard-chart-card dashboard-wide-chart">
          <div className="dashboard-panel-heading">
            <div>
              <span>Calendar</span>
              <h3>{monthLabel} activity</h3>
            </div>
            <small>{datedVisitCount} dated visits</small>
          </div>
          <div className="dashboard-activity-chart">
            {monthActivity.map((item) => (
              <span
                key={item.day}
                style={{ height: `${item.value ? Math.max(16, (item.value / maxMonthActivity) * 100) : 8}%` }}
                title={`Day ${item.day}: ${item.value} visit${item.value === 1 ? '' : 's'}`}
              />
            ))}
          </div>
        </article>

        <article className="dashboard-chart-card">
          <div className="dashboard-panel-heading">
            <div>
              <span>Visit records</span>
              <h3>Dated vs undated</h3>
            </div>
          </div>
          <div className="dashboard-split-chart">
            <div>
              <span style={{ width: `${datedSplitPercent}%` }} />
            </div>
            <dl>
              <div>
                <dt>Dated</dt>
                <dd>{datedVisitCount}</dd>
              </div>
              <div>
                <dt>Undated</dt>
                <dd>{undatedVisitCount}</dd>
              </div>
            </dl>
          </div>
        </article>
      </section>

      <section className="visited-dashboard-panel">
        <div className="visited-dashboard-toolbar">
          <div className="visited-view-toggle" role="tablist" aria-label="Visited place view">
            <button
              className={activeView === 'calendar' ? 'active' : ''}
              type="button"
              role="tab"
              aria-selected={activeView === 'calendar'}
              onClick={() => setActiveView('calendar')}
            >
              <LayoutGrid size={15} aria-hidden="true" />
              Calendar
            </button>
            <button
              className={activeView === 'places' ? 'active' : ''}
              type="button"
              role="tab"
              aria-selected={activeView === 'places'}
              onClick={() => setActiveView('places')}
            >
              <ListFilter size={15} aria-hidden="true" />
              Places
            </button>
          </div>

          {activeView === 'calendar' ? (
            <div className="visited-month-switcher">
              <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <h3>{monthLabel}</h3>
              <button type="button" onClick={() => moveMonth(1)} aria-label="Next month">
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <label className="visited-place-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search visited places"
              />
            </label>
          )}
        </div>

        {activeView === 'calendar' ? (
          <>
            {status === 'loading' ? (
              <p className="visited-calendar-status"><LoaderCircle className="dashboard-spin" size={16} aria-hidden="true" /> Loading visited places...</p>
            ) : error ? (
              <p className="form-error">{error}</p>
            ) : (
              <div className="visited-calendar-grid" aria-label={`Visited places in ${monthLabel}`}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
                  <span className="visited-calendar-weekday" key={dayName}>{dayName}</span>
                ))}
                {calendarCells.map((cell) => (
                  <article className={cell.blank ? 'visited-calendar-cell is-blank' : 'visited-calendar-cell'} key={cell.key}>
                    {!cell.blank ? (
                      <>
                        <strong>{cell.day}</strong>
                        {cell.places.slice(0, 3).map((place) => (
                          <span key={place.id || `${cell.dateKey}-${place.title}`}>
                            <MapPin size={11} aria-hidden="true" />
                            {place.title}{place.visitCount > 1 ? ` x${place.visitCount}` : ''}
                          </span>
                        ))}
                        {cell.places.length > 3 ? <small>+{cell.places.length - 3} more</small> : null}
                      </>
                    ) : null}
                  </article>
                ))}
              </div>
            )}

            <div className="undated-visits-strip">
              <div className="visited-section-heading">
                <div>
                  <span>Without date</span>
                  <h3>Undated visits</h3>
                </div>
                <small>{undatedVisitCount} visit{undatedVisitCount === 1 ? '' : 's'}</small>
              </div>
              {undatedVisits.length ? (
                <div className="undated-visits-list">
                  {undatedVisits.slice(0, 6).map((visit) => (
                    <article key={visit.id}>
                      <span><MapPin size={13} aria-hidden="true" />{getTypeLabel(visit.type)}</span>
                      <strong>{visit.title}</strong>
                      <small>{visit.visitCount > 1 ? `${visit.visitCount} visits` : '1 visit'}{visit.notes ? ` - ${visit.notes}` : ''}</small>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="visited-calendar-status">No undated visited places yet.</p>
              )}
            </div>
          </>
        ) : (
          <div className="visited-place-view">
            <div className="visited-place-view-heading">
              <span>{placeRows.length} place{placeRows.length === 1 ? '' : 's'} shown</span>
              <small>Same place appears once with all visits combined.</small>
            </div>
            {placeRows.length ? (
              <div className="visited-place-list">
                {placeRows.map((place) => (
                  <article key={place._id || place.placeKey}>
                    <div>
                      <span>{getTypeLabel(place.type)}</span>
                      <strong>{place.title}</strong>
                      {place.address ? <p>{place.address}</p> : null}
                    </div>
                    <dl>
                      <div>
                        <dt>Total</dt>
                        <dd>{place.totalVisits}</dd>
                      </div>
                      <div>
                        <dt>Dated</dt>
                        <dd>{place.datedVisits}</dd>
                      </div>
                      <div>
                        <dt>Undated</dt>
                        <dd>{place.undatedVisits}</dd>
                      </div>
                    </dl>
                    <small>Latest: {place.latestVisitLabel}</small>
                  </article>
                ))}
              </div>
            ) : (
              <p className="visited-calendar-status">No places match this search.</p>
            )}
          </div>
        )}
      </section>
    </section>
  );
}

export default UserDashboard;
