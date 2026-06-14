/**
 * Dashboard stats component.
 * Summary cards keep high-level trip and place totals scannable.
 */
import { Briefcase, CalendarDays, Footprints, Heart, MapPin } from 'lucide-react';

function DashboardStats({ favoritesCount, totalVisitCount, tripGroups, tripsThisMonth, uniquePlaceCount }) {
  return (
    <section className="dashboard-stat-grid" aria-label="Travel statistics">
      <article>
        <span><Briefcase size={22} aria-hidden="true" /></span>
        <strong>{tripGroups.active.length + tripGroups.upcoming.length}</strong>
        <small>Upcoming Trip</small>
      </article>
      <article>
        <span><MapPin size={22} aria-hidden="true" /></span>
        <strong>{uniquePlaceCount}</strong>
        <small>Places Visited</small>
      </article>
      <article>
        <span><Heart size={22} aria-hidden="true" /></span>
        <strong>{favoritesCount}</strong>
        <small>Saved Places</small>
      </article>
      <article>
        <span><Footprints size={22} aria-hidden="true" /></span>
        <strong>{totalVisitCount}</strong>
        <small>Total Visits</small>
      </article>
      <article>
        <span><CalendarDays size={22} aria-hidden="true" /></span>
        <strong>{tripsThisMonth}</strong>
        <small>Trips This Month</small>
      </article>
    </section>
  );
}

export default DashboardStats;
