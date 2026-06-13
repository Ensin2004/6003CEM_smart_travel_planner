/**
 * Admin Layout module.
 * Exports and local helpers keep related behavior in a single module.
 */
import {
  Home,
  LogOut,
  Settings,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { sections as settingsSections } from '../features/settings/shared/settings.constants';
import AppLayout from './AppLayout';

const settingsChildren = settingsSections.map((section) => ({
  to: section.id === 'profile' ? '/admin/settings' : `/admin/settings?section=${section.id}`,
  label: section.adminLabel || section.label,
  icon: section.icon,
}));

const adminMenu = [
  { to: '/admin', label: 'Home', icon: Home, end: true },
  { to: '/admin/users', label: 'Manage Users', icon: Users },
  { to: '/admin/logging-monitoring', label: 'Logging / Monitoring', icon: ShieldAlert },
  { to: '/admin/settings', label: 'Settings', icon: Settings, bottom: true, children: settingsChildren },
  { to: '/login', label: 'Logout', icon: LogOut, bottom: true, action: 'logout' },
];
// AdminLayout renders the main screen and handles nearby interactions.
function AdminLayout() {
  return <AppLayout role="admin" menuItems={adminMenu} />;
}
// Default export registers the primary  value.
export default AdminLayout;
