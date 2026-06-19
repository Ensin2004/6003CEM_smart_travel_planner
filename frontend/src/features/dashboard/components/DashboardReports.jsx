/**
 * Dashboard reports component.
 * Report cards display derived summaries and open detailed modal reports.
 */
import { useMemo, useState } from 'react';

// Helper function to format type labels by replacing hyphens with spaces
const getTypeLabel = (type) => String(type || 'place').replace(/-/g, ' ');

/**
 * DonutChart - Renders a circular chart with segmented data
 * Used for visualizing proportional data distributions
 */
function DonutChart({ segments }) {
  return (
    <svg viewBox="0 0 42 42" aria-hidden="true">
      {/* Background track circle */}
      <circle className="donut-track" cx="21" cy="21" r="15.9" />
      {/* Segments rendered as stroke dashes on the circle */}
      {segments.map((segment) => (
        <circle
          className="donut-segment"
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
  );
}

/**
 * DetailList - Renders a list of items within a report modal
 * Displays rows with titles, metadata, and optional details
 */
function DetailList({ emptyText, rows }) {
  return rows.length ? (
    <div className="report-modal-list">
      {rows.map((row) => (
        <article key={row.id}>
          <strong>{row.title}</strong>
          <span>{row.meta}</span>
          {row.detail ? <small>{row.detail}</small> : null}
        </article>
      ))}
    </div>
  ) : <p className="dashboard-muted">{emptyText}</p>;
}

/**
 * ReportModal - Modal dialog displaying detailed report information
 * Includes filterable statistics and filtered list of items
 */
function ReportModal({ report, onClose }) {
  // State for active filter selection within the modal
  const [activeFilter, setActiveFilter] = useState(report?.stats?.[0]?.filter || 'all');
  
  // Memoized filtered rows to optimize performance on filter changes
  const filteredRows = useMemo(() => {
    if (!report || activeFilter === 'all') return report?.rows || [];
    return (report.rows || []).filter((row) => row.filter === activeFilter);
  }, [activeFilter, report]);

  // Early return if no report data is available
  if (!report) return null;

  return (
    <div className="report-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-modal-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>{report.eyebrow}</span>
            <h3 id="report-modal-title">{report.title}</h3>
          </div>
          <button type="button" onClick={onClose}>Close</button>
        </header>
        {/* Statistics filter buttons */}
        <div className="report-modal-summary">
          {report.stats.map((stat) => (
            <button
              className={activeFilter === stat.filter ? 'active' : ''}
              type="button"
              key={stat.label}
              onClick={() => setActiveFilter(stat.filter)}
            >
              <strong>{stat.value}</strong>
              {stat.label}
            </button>
          ))}
        </div>
        {/* Detail list with filtered rows */}
        <DetailList emptyText={report.emptyText} rows={filteredRows} />
      </section>
    </div>
  );
}

function DashboardReports({
  activeReport,
  countryInsights,
  handleReportClick,
  maxMonthlyTripCount,
  monthDate,
  monthlyTripCounts,
  placeRows,
  placeToVisitCount,
  totalVisitCount,
  tripGroups,
  tripPlaceRows,
  uniquePlaceCount,
  visitDonutSegments,
  visitedShare,
  visitedVsToVisitSegments,
  visitTypeRows,
}) {
  // Extract visited and future country data from insights
  const visitedCountries = countryInsights?.visitedCountries || [];
  const nextCountries = countryInsights?.nextCountries || [];
  
  // Combine visited and future countries into a single array with status flags
  const combinedCountryRows = [
    ...visitedCountries.map((row) => ({ ...row, status: 'Visited', filter: 'visited' })),
    ...nextCountries.map((row) => ({ ...row, status: 'To visit', filter: 'to-visit' })),
  ];
  
  // Generate color-coded segments for country donut chart
  const countrySegments = combinedCountryRows.map((row, index) => ({
    ...row,
    label: `${row.status}: ${row.label}`,
    color: row.filter === 'visited' ? '#0f9f89' : ['#2f6fed', '#9b6df3', '#f4a22c'][index % 3],
  }));
  
  // Configuration for different report types with their data and structure
  const reportConfigs = {
    countries: {
      eyebrow: 'Country report',
      title: 'Country Progress Details',
      stats: [
        { label: 'All countries', value: combinedCountryRows.length, filter: 'all' },
        { label: 'Visited countries', value: countryInsights?.visitedCountryCount || 0, filter: 'visited' },
        { label: 'Countries to visit', value: countryInsights?.nextCountryCount || 0, filter: 'to-visit' },
      ],
      rows: [
        ...visitedCountries.map((row) => ({
          id: `visited-country-${row.label}`,
          title: row.label,
          meta: 'Visited country',
          detail: `${row.value} tracked visit${row.value === 1 ? '' : 's'}`,
          filter: 'visited',
        })),
        ...nextCountries.map((row) => ({
          id: `next-country-${row.label}`,
          title: row.label,
          meta: 'Country to visit',
          detail: `${row.value} planned entr${row.value === 1 ? 'y' : 'ies'}`,
          filter: 'to-visit',
        })),
      ],
      emptyText: 'No country data yet.',
    },
    categories: {
      eyebrow: 'Visit category report',
      title: 'Visited Place Details',
      stats: [
        { label: 'All places', value: placeRows.length, filter: 'all' },
        ...visitTypeRows.map((row) => ({ label: row.label, value: row.value, filter: row.label })),
      ],
      rows: placeRows.map((place) => ({
        id: `place-${place._id || place.placeKey}`,
        title: place.title,
        meta: getTypeLabel(place.type),
        detail: `${place.totalVisits || 0} visit${place.totalVisits === 1 ? '' : 's'} • ${place.address || 'No address saved'}`,
        filter: getTypeLabel(place.type),
      })),
      emptyText: 'No visited places yet.',
    },
    split: {
      eyebrow: 'Visited vs to visit report',
      title: 'Tracked Place Details',
      stats: [
        { label: 'All places', value: uniquePlaceCount + placeToVisitCount, filter: 'all' },
        { label: 'Visited places', value: uniquePlaceCount, filter: 'visited' },
        { label: 'Places to visit', value: placeToVisitCount, filter: 'to-visit' },
      ],
      rows: [
        ...placeRows.map((place) => ({
          id: `visited-${place._id || place.placeKey}`,
          title: place.title,
          meta: 'Visited',
          detail: place.address || place.latestVisitLabel,
          filter: 'visited',
        })),
        ...tripPlaceRows.map((place) => ({
          id: `to-visit-${place.tripId}-${place.title}`,
          title: place.title,
          meta: 'To visit',
          detail: place.tripTitle || place.address,
          filter: 'to-visit',
        })),
      ],
      emptyText: 'No tracked places yet.',
    },
    monthly: {
      eyebrow: 'Monthly report',
      title: `${monthDate.getFullYear()} Trip Activity`,
      stats: [
        { label: 'All trips', value: tripGroups.active.length + tripGroups.upcoming.length + tripGroups.past.length, filter: 'all' },
        { label: 'Active trips', value: tripGroups.active.length, filter: 'active' },
        { label: 'Upcoming trips', value: tripGroups.upcoming.length, filter: 'upcoming' },
        { label: 'Past trips', value: tripGroups.past.length, filter: 'past' },
      ],
      rows: [
        ...tripGroups.active.map((trip) => ({ ...trip, reportFilter: 'active' })),
        ...tripGroups.upcoming.map((trip) => ({ ...trip, reportFilter: 'upcoming' })),
        ...tripGroups.past.map((trip) => ({ ...trip, reportFilter: 'past' })),
      ].map((trip) => ({
        id: `trip-${trip._id}`,
        title: trip.title || trip.destination,
        meta: trip.destination || 'Trip',
        detail: [new Date(trip.startDate).toLocaleDateString(), new Date(trip.endDate).toLocaleDateString()].join(' - '),
        filter: trip.reportFilter,
      })),
      emptyText: 'No trip activity yet.',
    },
  };
  
  // Get the configuration for the currently active report
  const activeReportConfig = reportConfigs[activeReport];

  return (
    <>
      <section className="dashboard-report-grid" aria-label="Dashboard reports">
        {/* Country Progress Report Card */}
        <article className="dashboard-card report-card country-report">
          <div className="dashboard-card-heading">
            <h3>Country Progress</h3>
            <button type="button" onClick={() => handleReportClick('countries')}>View Report</button>
          </div>
          <div className="country-report-summary">
            <span>
              <strong>{countryInsights?.visitedCountryCount || 0}</strong>
              Visited
              <small>{countryInsights?.visitedCountryNames?.join(', ') || 'No countries marked visited yet.'}</small>
            </span>
            <span>
              <strong>{countryInsights?.nextCountryCount || 0}</strong>
              To visit
              <small>{countryInsights?.nextCountryNames?.join(', ') || 'No upcoming countries planned yet.'}</small>
            </span>
          </div>
          <div className="country-combined-report">
            <div className="donut-report">
              <DonutChart segments={countrySegments} />
              <strong>{combinedCountryRows.length}<span>Total</span></strong>
            </div>
          </div>
        </article>

        {/* Visit Categories Report Card */}
        <article className="dashboard-card report-card">
          <div className="dashboard-card-heading">
            <h3>Visit Categories</h3>
            <button type="button" onClick={() => handleReportClick('categories')}>View Report</button>
          </div>
          <div className="donut-report">
            <DonutChart segments={visitDonutSegments} />
            <strong>{totalVisitCount}<span>Total</span></strong>
          </div>
          <div className="report-legend">
            {visitTypeRows.length ? visitTypeRows.map((row) => (
              <span key={row.label}><em style={{ background: row.color }} />{row.label}<strong>{row.value}</strong></span>
            )) : <small>No categories yet.</small>}
          </div>
        </article>

        {/* Visited vs To Visit Report Card */}
        <article className="dashboard-card report-card">
          <div className="dashboard-card-heading">
            <h3>Visited vs To Visit</h3>
            <button type="button" onClick={() => handleReportClick('split')}>View Report</button>
          </div>
          <div className="donut-report">
            <DonutChart segments={visitedVsToVisitSegments} />
            <strong>{visitedShare}%</strong>
          </div>
          <div className="report-legend">
            <span><em style={{ background: '#0f9f89' }} />Visited<strong>{uniquePlaceCount}</strong></span>
            <span><em style={{ background: '#9b6df3' }} />To Visit<strong>{placeToVisitCount}</strong></span>
          </div>
        </article>

        {/* Monthly Activity Report Card with bar chart */}
        <article className="dashboard-card report-card monthly-report">
          <div className="dashboard-card-heading">
            <h3>Monthly Activity</h3>
            <button type="button" onClick={() => handleReportClick('monthly')}>View Report</button>
          </div>
          <div className="monthly-bars">
            {monthlyTripCounts.map((count, index) => (
              <span key={index} style={{ height: `${count ? Math.max(14, (count / maxMonthlyTripCount) * 100) : 4}%` }} title={`${count} trip${count === 1 ? '' : 's'}`} />
            ))}
          </div>
          <div className="month-labels">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => <span key={month}>{month}</span>)}
          </div>
        </article>
      </section>
      {/* Render the report modal when a report is active */}
      <ReportModal report={activeReportConfig} onClose={() => handleReportClick(activeReport)} />
    </>
  );
}

export default DashboardReports;
