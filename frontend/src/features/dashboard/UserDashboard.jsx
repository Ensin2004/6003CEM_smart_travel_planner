/**
 * User dashboard page.
 * Feature data comes from a dedicated hook, while each dashboard section renders through a focused component.
 */
import { useState } from 'react';
import DashboardOverview from './components/DashboardOverview';
import DashboardDateRangeFilter from './components/DashboardDateRangeFilter';
import { DashboardOverviewCharts, DashboardPlaceCharts } from './components/DashboardInsightCharts';
import DashboardPlaceLists from './components/DashboardPlaceLists';
import DashboardReports from './components/DashboardReports';
import DashboardStats from './components/DashboardStats';
import DashboardStatisticsPanel from './components/DashboardStatisticsPanel';
import DashboardTabBar from './components/DashboardTabBar';
import DashboardTopbar from './components/DashboardTopbar';
import { useUserDashboard } from './hooks/useUserDashboard';
import './UserDashboard.css';

function UserDashboard() {
  const dashboard = useUserDashboard();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <section className="dashboard-page">
      <DashboardTopbar user={dashboard.user} />

      <DashboardDateRangeFilter
        dateRangeFilter={dashboard.dateRangeFilter}
        hasDateRangeFilter={dashboard.hasDateRangeFilter}
        onClear={dashboard.clearDateRangeFilter}
        onDateChange={dashboard.setDateRangeFilter}
      />

      <DashboardStats
        favoritesCount={dashboard.favoritesCount}
        totalVisitCount={dashboard.totalVisitCount}
        tripGroups={dashboard.tripGroups}
        tripsThisMonth={dashboard.tripsThisMonth}
        uniquePlaceCount={dashboard.uniquePlaceCount}
      />

      <DashboardTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'overview' ? (
        <>
          <DashboardOverview
            calendarCells={dashboard.calendarCells}
            error={dashboard.error}
            monthLabel={dashboard.monthLabel}
            moveMonth={dashboard.moveMonth}
            recentActivity={dashboard.recentActivity}
            selectToday={dashboard.selectToday}
            selectedDateKey={dashboard.selectedDateKey}
            selectedDestinations={dashboard.selectedDestinations}
            selectedVisits={dashboard.selectedVisits}
            setSelectedDateKey={dashboard.setSelectedDateKey}
            status={dashboard.status}
            tripStatus={dashboard.tripStatus}
            upcomingTrips={dashboard.upcomingTrips}
          />
          <DashboardOverviewCharts
            chartData={dashboard.dashboardChartData}
            monthlyTripCounts={dashboard.monthlyTripCounts}
          />
          <DashboardReports
            activeReport={dashboard.activeReport}
            countryInsights={dashboard.countryInsights}
            handleReportClick={dashboard.handleReportClick}
            maxMonthlyTripCount={dashboard.maxMonthlyTripCount}
            monthDate={dashboard.monthDate}
            monthlyTripCounts={dashboard.monthlyTripCounts}
            placeRows={dashboard.placeRows}
            placeToVisitCount={dashboard.placeToVisitCount}
            totalVisitCount={dashboard.totalVisitCount}
            tripGroups={dashboard.tripGroups}
            tripPlaceRows={dashboard.tripPlaceRows}
            uniquePlaceCount={dashboard.uniquePlaceCount}
            visitDonutSegments={dashboard.visitDonutSegments}
            visitedShare={dashboard.visitedShare}
            visitedVsToVisitSegments={dashboard.visitedVsToVisitSegments}
            visitTypeRows={dashboard.visitTypeRows}
          />
        </>
      ) : null}

      {activeTab === 'statistics' ? (
        <>
          <DashboardStatisticsPanel
            chartData={dashboard.dashboardChartData}
            countryInsights={dashboard.countryInsights}
            monthlyTripCounts={dashboard.monthlyTripCounts}
            userStatistics={dashboard.userStatistics}
            visitTypeRows={dashboard.visitTypeRows}
          />
          <DashboardReports
            activeReport={dashboard.activeReport}
            countryInsights={dashboard.countryInsights}
            handleReportClick={dashboard.handleReportClick}
            maxMonthlyTripCount={dashboard.maxMonthlyTripCount}
            monthDate={dashboard.monthDate}
            monthlyTripCounts={dashboard.monthlyTripCounts}
            placeRows={dashboard.placeRows}
            placeToVisitCount={dashboard.placeToVisitCount}
            totalVisitCount={dashboard.totalVisitCount}
            tripGroups={dashboard.tripGroups}
            tripPlaceRows={dashboard.tripPlaceRows}
            uniquePlaceCount={dashboard.uniquePlaceCount}
            visitDonutSegments={dashboard.visitDonutSegments}
            visitedShare={dashboard.visitedShare}
            visitedVsToVisitSegments={dashboard.visitedVsToVisitSegments}
            visitTypeRows={dashboard.visitTypeRows}
          />
        </>
      ) : null}

      {activeTab === 'places' ? (
        <>
          <DashboardPlaceCharts
            chartData={dashboard.dashboardChartData}
            visitTypeRows={dashboard.visitTypeRows}
          />
          <DashboardPlaceLists
            activePlaceMenu={dashboard.activePlaceMenu}
            handleVisitedPlaceAction={dashboard.handleVisitedPlaceAction}
            openCategoryMenu={dashboard.openCategoryMenu}
            placeRows={dashboard.placeRows}
            searchTerm={dashboard.searchTerm}
            setActivePlaceMenu={dashboard.setActivePlaceMenu}
            setOpenCategoryMenu={dashboard.setOpenCategoryMenu}
            setSearchTerm={dashboard.setSearchTerm}
            setVisitedCategory={dashboard.setVisitedCategory}
            visitedCategories={dashboard.visitedCategories}
            visitedCategory={dashboard.visitedCategory}
          />
        </>
      ) : null}
    </section>
  );
}

export default UserDashboard;
