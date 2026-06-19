/**
 * Dashboard date range filter.
 * Shared filter controls let the dashboard metrics and lists focus on a travel period.
 */
import { CalendarDays, X } from 'lucide-react';

function DashboardDateRangeFilter({
  dateRangeFilter,
  hasDateRangeFilter,
  onClear,
  onDateChange,
}) {
  return (
    <section className="dashboard-date-filter" aria-label="Dashboard date range filter">
      <div>
        <CalendarDays size={18} aria-hidden="true" />
        <span>
          <strong>Date range</strong>
          <small>{hasDateRangeFilter ? 'Dashboard is filtered by travel date.' : 'Showing all travel dates.'}</small>
        </span>
      </div>
      <div className="date-filter-fields">
        <label>
          <span>From</span>
          <input
            type="date"
            value={dateRangeFilter.startDate}
            max={dateRangeFilter.endDate || undefined}
            onChange={(event) => onDateChange('startDate', event.target.value)}
          />
        </label>
        <label>
          <span>To</span>
          <input
            type="date"
            value={dateRangeFilter.endDate}
            min={dateRangeFilter.startDate || undefined}
            onChange={(event) => onDateChange('endDate', event.target.value)}
          />
        </label>
        {hasDateRangeFilter ? (
          <button type="button" onClick={onClear} aria-label="Clear date range filter">
            <X size={16} aria-hidden="true" />
            Clear
          </button>
        ) : null}
      </div>
    </section>
  );
}

export default DashboardDateRangeFilter;
