/**
 * Dashboard stats component.
 * Summary cards keep high-level trip and place totals scannable.
 */
import { Briefcase, CalendarDays, Footprints, Heart, MapPin } from 'lucide-react';

/**
 * DashboardStats - Renders a grid of summary statistic cards
 * Displays key metrics about trips, places visited, favorites, and visits
 * Provides at-a-glance overview of travel activity
 */
function DashboardStats({ favoritesCount, totalVisitCount, tripGroups, tripsThisMonth, uniquePlaceCount }) {
  return (
    <section className="dashboard-stat-grid" aria-label="Travel statistics">
      {/* Upcoming Trip count card - combines active and upcoming trips */}
      <article>
        <span><Briefcase size={22} aria-hidden="true" /></span>
        <strong>{tripGroups.active.length + tripGroups.upcoming.length}</strong>
        <small>Upcoming Trip</small>
      </article>
      
      {/* Places Visited count card - unique places visited */}
      <article>
        <span><MapPin size={22} aria-hidden="true" /></span>
        <strong>{uniquePlaceCount}</strong>
        <small>Places Visited</small>
      </article>
      
      {/* Saved Places count card - favorite locations bookmarked */}
      <article>
        <span><Heart size={22} aria-hidden="true" /></span>
        <strong>{favoritesCount}</strong>
        <small>Saved Places</small>
      </article>
      
      {/* Total Visits count card - cumulative visit count including repeats */}
      <article>
        <span><Footprints size={22} aria-hidden="true" /></span>
        <strong>{totalVisitCount}</strong>
        <small>Total Visits</small>
      </article>
      
      {/* Trips This Month card - trips occurring in current month */}
      <article>
        <span><CalendarDays size={22} aria-hidden="true" /></span>
        <strong>{tripsThisMonth}</strong>
        <small>Trips This Month</small>
      </article>
    </section>
  );
}

export default DashboardStats;
