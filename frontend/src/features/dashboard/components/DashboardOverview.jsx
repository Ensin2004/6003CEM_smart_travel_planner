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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  formatDateRange,
  formatLongDate,
  getTripDestinationPlaces,
} from '../dashboard.utils';

// Mapping of activity types to their corresponding icon components
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
  recentActivity,
  selectToday,
  selectedDateKey,
  selectedDestinations,
  selectedVisits,
  setSelectedDateKey,
  status,
  tripStatus,
  upcomingTrips,
}) {
  return (
    <section className="dashboard-overview-grid">
      {/* Upcoming Trip Card - Displays next scheduled trips */}
      <article className="dashboard-card dashboard-upcoming-card">
        <div className="dashboard-card-heading">
          <div>
            <h3><CalendarDays size={18} aria-hidden="true" />Upcoming Trip</h3>
            <small>Showing up to 3 upcoming trips.</small>
          </div>
          {/* Conditional link to view all trips when trips exist */}
          {upcomingTrips.length ? <Link to="/trips">View All</Link> : null}
        </div>
        {/* Loading state for trip data */}
        {tripStatus === 'loading' ? (
          <p className="dashboard-muted"><LoaderCircle className="dashboard-spin" size={16} aria-hidden="true" />Loading trips...</p>
        ) : upcomingTrips.length ? (
          // Render list of upcoming trips with navigation links
          <div className="upcoming-trip-list">
            {upcomingTrips.map((trip, index) => (
              <Link to={`/trips/${trip._id}`} key={trip._id}>
                <span className="upcoming-trip-number">{index + 1}</span>
                <span className="upcoming-trip-details">
                  <strong>{trip.title || trip.destination}</strong>
                  <small><CalendarDays size={13} aria-hidden="true" />{formatDateRange(trip.startDate, trip.endDate)}</small>
                  <small><MapPin size={13} aria-hidden="true" />{[trip.destination, trip.country].filter(Boolean).join(', ')}</small>
                </span>
                {/* Display count of places associated with the trip */}
                <span className="upcoming-trip-count">{getTripDestinationPlaces(trip).length} place{getTripDestinationPlaces(trip).length === 1 ? '' : 's'}</span>
              </Link>
            ))}
          </div>
        ) : (
          // Empty state when no upcoming trips exist
          <p className="dashboard-muted">No upcoming trips yet.</p>
        )}
      </article>

      {/* Recent Activity Card - Shows latest user actions */}
      <article className="dashboard-card dashboard-activity-card">
        <div className="dashboard-card-heading">
          <h3>Recent Activity</h3>
          <Link to="/trips">View All</Link>
        </div>
        {recentActivity.length ? (
          // Render list of recent activities with icons
          <div className="recent-activity-list">
            {recentActivity.slice(0, 4).map((activity) => {
              // Select appropriate icon based on activity type
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
          // Empty state when no recent activity exists
          <p className="dashboard-muted">New trip and visit activity will appear here.</p>
        )}
      </article>

      {/* Calendar Card - Interactive date picker with trip/visit indicators */}
      <article className="dashboard-card dashboard-calendar-card">
        <div className="calendar-heading">
          {/* Month navigation controls */}
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
        {/* Loading state for calendar data */}
        {status === 'loading' ? (
          <p className="dashboard-muted"><LoaderCircle className="dashboard-spin" size={16} aria-hidden="true" />Loading calendar...</p>
        ) : error ? (
          // Error state for calendar data fetching
          <p className="form-error">{error}</p>
        ) : (
          // Calendar grid rendering
          <div className="dashboard-calendar-grid" aria-label={`Travel calendar for ${monthLabel}`}>
            {/* Weekday headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
              <span className="calendar-weekday" key={dayName}>{dayName}</span>
            ))}
            {/* Calendar cells with trip/visit indicators */}
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
        {/* Legend explaining calendar color indicators */}
        <div className="calendar-legend">
          <span><em className="trip" />Trip</span>
          <span><em className="visited" />Visited</span>
          <span><em className="to-visit" />To Visit</span>
          <span><em className="saved" />Saved</span>
          <small>Click a date to see details</small>
        </div>
        {/* Details panel for selected date */}
        <div className="selected-date-panel">
          <strong>{formatLongDate(selectedDateKey)}</strong>
          {selectedDestinations.length || selectedVisits.length ? (
            <>
              {/* Display destinations for selected date */}
              {selectedDestinations.map((destination) => (
                <p key={`${destination.tripId}-${destination.title}`}>
                  <MapPin size={14} aria-hidden="true" />
                  {destination.title} <span>{destination.tripTitle}</span>
                </p>
              ))}
              {/* Display visited places for selected date */}
              {selectedVisits.map((place) => (
                <p key={place.id || `${selectedDateKey}-${place.title}`}>
                  <CheckCircle2 size={14} aria-hidden="true" />
                  {place.title} <span>Visited</span>
                </p>
              ))}
            </>
          ) : (
            // Empty state when no data exists for selected date
            <small>No destination or visited places for this date.</small>
          )}
        </div>
      </article>
    </section>
  );
}

export default DashboardOverview;
