/**
 * User dashboard page.
 * Feature data comes from a dedicated hook, while each dashboard section renders through a focused component.
 */
import DashboardOverview from './components/DashboardOverview';
import DashboardPlaceLists from './components/DashboardPlaceLists';
import DashboardReports from './components/DashboardReports';
import DashboardStats from './components/DashboardStats';
import DashboardTopbar from './components/DashboardTopbar';
import { useUserDashboard } from './hooks/useUserDashboard';
import './UserDashboard.css';

function UserDashboard() {
  const dashboard = useUserDashboard();

  return (
    <section className="dashboard-page">
      <DashboardTopbar user={dashboard.user} />
      <DashboardStats
        favoritesCount={dashboard.favoritesCount}
        totalVisitCount={dashboard.totalVisitCount}
        tripGroups={dashboard.tripGroups}
        tripsThisMonth={dashboard.tripsThisMonth}
        uniquePlaceCount={dashboard.uniquePlaceCount}
      />
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
    </section>
  );
}

export default UserDashboard;
