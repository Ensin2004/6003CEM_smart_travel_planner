import {
  CalendarRange,
  CircleGauge,
  Flag,
  Footprints,
  Globe2,
  MapPinned,
  Route,
  Trophy,
} from 'lucide-react';

function StatisticTile({ detail, icon: Icon, label, value }) {
  return (
    <article className="statistics-tile">
      <span><Icon size={19} aria-hidden="true" /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </div>
    </article>
  );
}

function ProgressRow({ label, value }) {
  return (
    <div className="statistics-progress-row">
      <span>{label}<strong>{value}%</strong></span>
      <div><em style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
    </div>
  );
}

function DashboardStatisticsPanel({
  countryInsights,
  monthlyTripCounts,
  userStatistics,
  visitTypeRows,
}) {
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const maxMonthlyCount = Math.max(...monthlyTripCounts, 1);

  return (
    <section className="dashboard-statistics-panel">
      <div className="statistics-grid">
        <StatisticTile
          detail={`${userStatistics.totalTripDays} total travel day${userStatistics.totalTripDays === 1 ? '' : 's'}`}
          icon={CalendarRange}
          label="Average Trip Length"
          value={`${userStatistics.averageTripDays} days`}
        />
        <StatisticTile
          detail={userStatistics.longestTrip.title}
          icon={Trophy}
          label="Longest Trip"
          value={`${userStatistics.longestTrip.days} days`}
        />
        <StatisticTile
          detail={`${userStatistics.visitedTripDestinationCount} of ${userStatistics.tripDestinationCount} planned destinations visited`}
          icon={Route}
          label="Destination Progress"
          value={`${userStatistics.tripDestinationProgress}%`}
        />
        <StatisticTile
          detail={`${countryInsights?.visitedCountryCount || 0} visited, ${countryInsights?.nextCountryCount || 0} planned`}
          icon={Globe2}
          label="Countries Tracked"
          value={userStatistics.countryTotal}
        />
        <StatisticTile
          detail={`${userStatistics.mostVisitedPlace.visits} visit${userStatistics.mostVisitedPlace.visits === 1 ? '' : 's'}`}
          icon={MapPinned}
          label="Most Visited Place"
          value={userStatistics.mostVisitedPlace.title}
        />
        <StatisticTile
          detail={`${userStatistics.averageVisitsPerPlace} visits per place`}
          icon={Footprints}
          label="Repeat Visit Rate"
          value={userStatistics.averageVisitsPerPlace}
        />
        <StatisticTile
          detail={`${userStatistics.topCategory.value} tracked visit${userStatistics.topCategory.value === 1 ? '' : 's'}`}
          icon={Flag}
          label="Top Category"
          value={userStatistics.topCategory.label}
        />
        <StatisticTile
          detail={`${userStatistics.totalDatedVisits} dated, ${userStatistics.totalUndatedVisits} without dates`}
          icon={CircleGauge}
          label="Visit Date Coverage"
          value={`${userStatistics.datedVisitShare}%`}
        />
      </div>

      <div className="statistics-detail-grid">
        <article className="dashboard-card statistics-breakdown-card">
          <div className="dashboard-card-heading">
            <h3>Travel Health</h3>
          </div>
          <ProgressRow label="Visited vs planned places" value={userStatistics.completionRate} />
          <ProgressRow label="Trip destination completion" value={userStatistics.tripDestinationProgress} />
          <ProgressRow label="Visits with saved dates" value={userStatistics.datedVisitShare} />
          <ProgressRow label="Saved places vs visited places" value={userStatistics.savedPlaceShare} />
        </article>

        <article className="dashboard-card statistics-breakdown-card">
          <div className="dashboard-card-heading">
            <h3>Category Mix</h3>
          </div>
          <div className="statistics-list">
            {visitTypeRows.length ? visitTypeRows.map((row) => (
              <span key={row.label}>
                <em style={{ background: row.color }} />
                {row.label}
                <strong>{row.value}</strong>
              </span>
            )) : <p className="dashboard-muted">No category data yet.</p>}
          </div>
        </article>

        <article className="dashboard-card statistics-breakdown-card">
          <div className="dashboard-card-heading">
            <h3>Trips by Month</h3>
            <small>{userStatistics.busiestMonth.value ? `${userStatistics.busiestMonth.label} is busiest` : 'No trip activity yet'}</small>
          </div>
          <div className="statistics-mini-bars">
            {monthlyTripCounts.map((count, index) => (
              <span key={monthLabels[index]}>
                <em style={{ height: `${count ? Math.max(12, (count / maxMonthlyCount) * 100) : 3}%` }} />
                <small>{monthLabels[index]}</small>
              </span>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

export default DashboardStatisticsPanel;
