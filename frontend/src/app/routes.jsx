import { Route, Routes } from 'react-router-dom';
import LandingPage from '../features/landing/LandingPage';
import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import UserDashboard from '../features/dashboard/UserDashboard';
import TripsPage from '../features/trips/TripsPage';
import TripDetailsPage from '../features/trips/TripDetailsPage';
import ExplorePage from '../features/explore/ExplorePage';
import ProfilePage from '../features/profile/ProfilePage';
import AdminDashboard from '../features/admin/AdminDashboard';
import ApiLogsPage from '../features/admin/ApiLogsPage';
import UserManagementPage from '../features/admin/UserManagementPage';
import SystemErrorsPage from '../features/admin/SystemErrorsPage';
import SystemSettingsPage from '../features/admin/SystemSettingsPage';
import UserLayout from '../layouts/UserLayout';
import AdminLayout from '../layouts/AdminLayout';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<UserLayout />}>
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/:id" element={<TripDetailsPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="api-logs" element={<ApiLogsPage />} />
        <Route path="system-errors" element={<SystemErrorsPage />} />
        <Route path="settings" element={<SystemSettingsPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
