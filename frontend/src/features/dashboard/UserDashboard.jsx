/**
 * Dashboard module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import { CalendarDays, ChevronLeft, ChevronRight, LoaderCircle, MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getVisitedCalendar } from '../../api/visitedPlaceApi';
import './UserDashboard.css';

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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

// UserDashboard renders the main screen and handles nearby interactions.
function UserDashboard() {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [days, setDays] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const dayLookup = useMemo(
    () => days.reduce((lookup, day) => ({ ...lookup, [day.date]: day.places || [] }), {}),
    [days]
  );
  const calendarCells = useMemo(() => buildCalendarCells(monthDate, dayLookup), [dayLookup, monthDate]);
  const monthLabel = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const visitedCount = days.reduce((total, day) => total + (day.places?.length || 0), 0);

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

  const moveMonth = (direction) => {
    setMonthDate((currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span><CalendarDays size={16} aria-hidden="true" />Visited calendar</span>
          <h2>Home</h2>
        </div>
        <strong>{visitedCount} place{visitedCount === 1 ? '' : 's'} this month</strong>
      </div>

      <section className="visited-calendar-panel">
        <header>
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <h3>{monthLabel}</h3>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Next month">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </header>

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
      </section>
    </section>
  );
}

export default UserDashboard;
