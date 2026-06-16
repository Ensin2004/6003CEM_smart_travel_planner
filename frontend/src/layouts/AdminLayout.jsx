/**
 * Admin Layout module.
 * Exports and local helpers keep related behavior in a single module.
 */
import {
  Home,
  ListTree,
  LogOut,
  Settings,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { sections as settingsSections } from '../features/settings/shared/settings.constants';
import AppLayout from './AppLayout';

// Transforms settings section definitions into navigation child items with appropriate routes
const settingsChildren = settingsSections.map((section) => ({
  to: section.id === 'profile' ? '/admin/settings' : `/admin/settings?section=${section.id}`,
  label: section.adminLabel || section.label,
  icon: section.icon,
}));

// Defines the complete admin navigation menu structure with icons and routing
const adminMenu = [
  { to: '/admin', label: 'Home', icon: Home, end: true },
  { to: '/admin/users', label: 'Manage Users', icon: Users },
  { to: '/admin/categories', label: 'Manage Category', icon: ListTree },
  { to: '/admin/logging-monitoring', label: 'Logging / Monitoring', icon: ShieldAlert },
  { to: '/admin/settings', label: 'Settings', icon: Settings, bottom: true, children: settingsChildren },
  { to: '/login', label: 'Logout', icon: LogOut, bottom: true, action: 'logout' },
];

// AdminLayout renders the main screen and handles nearby interactions.
function AdminLayout() {
  return <AppLayout role="admin" menuItems={adminMenu} />;
}

// Default export registers the primary value.
export default AdminLayout;
