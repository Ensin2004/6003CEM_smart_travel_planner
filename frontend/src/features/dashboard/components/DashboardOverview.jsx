/**
 * Dashboard overview component.
 * Upcoming trip, recent activity, and calendar details share one responsive row.
 */
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  MapPin,
  Sun,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  formatDateRange,
  formatLongDate,
  getPlaceImageStyle,
  getTripDestinationPlaces,
} from '../dashboard.utils';

const activityIcons = {
  trip: CalendarDays,
  visited: CheckCircle2,
  'to-visit': MapPin,
};

function DashboardOverview({
  calendarCells,
  error,
  monthLabel,
  moveMonth,
  nextTrip,
  recentActivity,
  selectToday,
  selectedDateKey,
  selectedDestinations,
  selectedVisits,
  setSelectedDateKey,
  status,
  tripGroups,
  tripStatus,
  weatherPreview,
  weatherTemperature,
}) {
  return (
    <section className="dashboard-overview-grid">
      <article className="dashboard-card dashboard-upcoming-card">
        <div className="dashboard-card-heading">
          <h3><CalendarDays size={18} aria-hidden="true" />Upcoming Trip</h3>
          {nextTrip ? <Link to={`/trips/${nextTrip._id}`}>View Trip</Link> : null}
        </div>
        {tripStatus === 'loading' ? (
          <p className="dashboard-muted"><LoaderCircle className="dashboard-spin" size={16} aria-hidden="true" />Loading trips...</p>
        ) : nextTrip ? (
          <div className="upcoming-trip-body">
            <div className="trip-photo" style={getPlaceImageStyle(nextTrip.destination)} aria-hidden="true" />
            <div>
              <div className="trip-title-row">
                <h4>{nextTrip.title || nextTrip.destination}</h4>
                <span>{tripGroups.active.includes(nextTrip) ? 'Now' : 'Upcoming'}</span>
              </div>
              <p><CalendarDays size={15} aria-hidden="true" />{formatDateRange(nextTrip.startDate, nextTrip.endDate)}</p>
              <p><MapPin size={15} aria-hidden="true" />{[nextTrip.destination, nextTrip.country].filter(Boolean).join(', ') || 'Destination pending'}</p>
              <p><Sun size={15} aria-hidden="true" />{weatherPreview?.weather?.available ? `${weatherPreview.weather.condition}${weatherTemperature ? `, ${weatherTemperature}` : ''}` : 'Weather pending'}</p>
              <p><MapPin size={15} aria-hidden="true" />{getTripDestinationPlaces(nextTrip).length} places planned</p>
            </div>
          </div>
        ) : (
          <p className="dashboard-muted">No upcoming trips yet.</p>
        )}
      </article>

      <article className="dashboard-card dashboard-activity-card">
        <div className="dashboard-card-heading">
          <h3>Recent Activity</h3>
          <Link to="/trips">View All</Link>
        </div>
        {recentActivity.length ? (
          <div className="recent-activity-list">
            {recentActivity.slice(0, 4).map((activity) => {
              const ActivityIcon = activityIcons[activity.type] || CalendarDays;
              return (
                <div key={activity.id}>
                  <span className={`activity-icon ${activity.tone}`}><ActivityIcon size={15} aria-hidden="true" /></span>
                  <p>
                    <strong>{activity.title}</strong>
                    <small>{activity.meta}</small>
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="dashboard-muted">New trip and visit activity will appear here.</p>
        )}
      </article>

      <article className="dashboard-card dashboard-calendar-card">
        <div className="calendar-heading">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">
            <ArrowLeft size={16} aria-hidden="true" />
          </button>
          <h3>{monthLabel}</h3>
          <div>
            <button type="button" onClick={selectToday}>Today</button>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Next month">
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        {status === 'loading' ? (
          <p className="dashboard-muted"><LoaderCircle className="dashboard-spin" size={16} aria-hidden="true" />Loading calendar...</p>
        ) : error ? (
          <p className="form-error">{error}</p>
        ) : (
          <div className="dashboard-calendar-grid" aria-label={`Travel calendar for ${monthLabel}`}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
              <span className="calendar-weekday" key={dayName}>{dayName}</span>
            ))}
            {calendarCells.map((cell) => {
              const hasTrip = Boolean(cell.destinations?.length);
              const hasVisited = Boolean(cell.places?.length);
              return (
                <button
                  className={[
                    'calendar-day',
                    cell.outsideMonth ? 'outside' : '',
                    cell.dateKey === selectedDateKey ? 'selected' : '',
                    hasTrip ? 'has-trip' : '',
                    hasVisited ? 'has-visited' : '',
                  ].filter(Boolean).join(' ')}
                  type="button"
                  key={cell.key}
                  disabled={cell.outsideMonth}
                  onClick={() => cell.dateKey && setSelectedDateKey(cell.dateKey)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        )}
        <div className="calendar-legend">
          <span><em className="trip" />Trip</span>
          <span><em className="visited" />Visited</span>
          <span><em className="to-visit" />To Visit</span>
          <span><em className="saved" />Saved</span>
          <small>Click a date to see details</small>
        </div>
        <div className="selected-date-panel">
          <strong>{formatLongDate(selectedDateKey)}</strong>
          {selectedDestinations.length || selectedVisits.length ? (
            <>
              {selectedDestinations.map((destination) => (
                <p key={`${destination.tripId}-${destination.title}`}>
                  <MapPin size={14} aria-hidden="true" />
                  {destination.title} <span>{destination.tripTitle}</span>
                </p>
              ))}
              {selectedVisits.map((place) => (
                <p key={place.id || `${selectedDateKey}-${place.title}`}>
                  <CheckCircle2 size={14} aria-hidden="true" />
                  {place.title} <span>Visited</span>
                </p>
              ))}
            </>
          ) : (
            <small>No destination or visited places for this date.</small>
          )}
        </div>
      </article>
    </section>
  );
}

export default DashboardOverview;
