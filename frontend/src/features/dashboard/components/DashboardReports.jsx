/**
 * Dashboard reports component.
 * Report cards display derived summaries and expose detail toggles.
 */
function DonutChart({ segments }) {
  return (
    <svg viewBox="0 0 42 42" aria-hidden="true">
      <circle className="donut-track" cx="21" cy="21" r="15.9" />
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

function DashboardReports({
  activeReport,
  handleReportClick,
  maxMonthlyTripCount,
  monthDate,
  monthlyTripCounts,
  placeToVisitCount,
  totalVisitCount,
  uniquePlaceCount,
  visitDonutSegments,
  visitedShare,
  visitedVsToVisitSegments,
  visitTypeRows,
}) {
  return (
    <section className="dashboard-report-grid" aria-label="Dashboard reports">
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
        {activeReport === 'categories' ? (
          <p className="report-detail">Top category: {visitTypeRows[0]?.label || 'none yet'} with {visitTypeRows[0]?.value || 0} visits.</p>
        ) : null}
      </article>

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
        {activeReport === 'split' ? (
          <p className="report-detail">{visitedShare}% of tracked places are marked visited.</p>
        ) : null}
      </article>

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
        {activeReport === 'monthly' ? (
          <p className="report-detail">{monthDate.getFullYear()} has {monthlyTripCounts.reduce((sum, count) => sum + count, 0)} month-level trip entries.</p>
        ) : null}
      </article>
    </section>
  );
}

export default DashboardReports;
