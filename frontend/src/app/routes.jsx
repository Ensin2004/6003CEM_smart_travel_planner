import { Route, Routes } from 'react-router-dom';
import LandingPage from '../features/landing/LandingPage';
import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage';
import UserDashboard from '../features/dashboard/UserDashboard';
import TripsPage from '../features/trips/TripsPage';
import TripDetailsPage from '../features/trips/TripDetailsPage';
import ExplorePage from '../features/explore/ExplorePage';
import MapPage from '../features/map/MapPage';
import PackingListsPage from '../features/packingLists/PackingListsPage';
import UserSettingsPage from '../features/settings/user/UserSettingsPage';
import AdminDashboard from '../features/admin/AdminDashboard';
import ApiLogsPage from '../features/admin/ApiLogsPage';
import ManageUsersPage from '../features/admin/ManageUsersPage';
import SystemErrorsPage from '../features/admin/SystemErrorsPage';
import AdminSettingsPage from '../features/settings/admin/AdminSettingsPage';
import UserLayout from '../layouts/UserLayout';
import AdminLayout from '../layouts/AdminLayout';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<UserLayout />}>
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/:id" element={<TripDetailsPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/packing-lists" element={<PackingListsPage />} />
        <Route path="/profile" element={<UserSettingsPage />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<ManageUsersPage />} />
        <Route path="api-logs" element={<ApiLogsPage />} />
        <Route path="logging-monitoring" element={<SystemErrorsPage />} />
        <Route path="system-errors" element={<SystemErrorsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
