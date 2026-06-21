import {
  CalendarRange,
  Flag,
  Footprints,
  Route,
} from 'lucide-react';
import { DashboardBarCard, DashboardDonutCard, DashboardRankedBarCard } from './DashboardInsightCharts';

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

function DashboardStatisticsPanel({
  chartData,
  onViewReport,
  monthlyTripCounts,
  userStatistics,
  visitTypeRows,
}) {
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const topCategoryRows = visitTypeRows.slice(0, 5);

  return (
    <section className="dashboard-statistics-panel">
      <div className="statistics-grid">
        <StatisticTile
          detail="Average days per trip"
          icon={CalendarRange}
          label="Trip Length"
          value={`${userStatistics.averageTripDays} days`}
        />
        <StatisticTile
          detail={`${userStatistics.visitedTripDestinationCount} of ${userStatistics.tripDestinationCount} planned destinations visited`}
          icon={Route}
          label="Places Visited"
          value={`${userStatistics.tripDestinationProgress}%`}
        />
        <StatisticTile
          detail={`${userStatistics.averageVisitsPerPlace} visits per place`}
          icon={Footprints}
          label="Total Visits"
          value={userStatistics.totalVisitCount}
        />
        <StatisticTile
          detail={`${userStatistics.topCategory.value} tracked visit${userStatistics.topCategory.value === 1 ? '' : 's'}`}
          icon={Flag}
          label="Favorite Category"
          value={userStatistics.topCategory.label}
        />
      </div>

      <div className="statistics-analytics-grid">
        <DashboardDonutCard
          detail="Active, upcoming, and completed"
          onViewReport={onViewReport}
          reportKey="monthly"
          rows={chartData.tripStatusRows}
          title="Trip Status"
        />
        <DashboardBarCard
          detail={userStatistics.busiestMonth.value ? `${userStatistics.busiestMonth.label} has the most trips` : 'Trips by month'}
          labels={monthLabels}
          onViewReport={onViewReport}
          reportKey="monthly"
          rows={monthlyTripCounts}
          title="Trips by Month"
        />
        <DashboardRankedBarCard
          detail="Most common visit types"
          emptyText="No categories yet."
          onViewReport={onViewReport}
          reportKey="categories"
          rows={topCategoryRows}
          title="Top Categories"
        />
      </div>
    </section>
  );
}

export default DashboardStatisticsPanel;
