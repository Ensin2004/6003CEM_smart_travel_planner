import {
  Home,
  LogOut,
  Settings,
  ShieldAlert,
  Users,
} from 'lucide-react';
import AppLayout from './AppLayout';

const adminMenu = [
  { to: '/admin', label: 'Home', icon: Home, end: true },
  { to: '/admin/users', label: 'Manage Users', icon: Users },
  { to: '/admin/logging-monitoring', label: 'Logging / Monitoring', icon: ShieldAlert },
  { to: '/admin/settings', label: 'Settings', icon: Settings, bottom: true },
  { to: '/login', label: 'Logout', icon: LogOut, bottom: true },
];

function AdminLayout() {
  return <AppLayout role="admin" menuItems={adminMenu} />;
}

export default AdminLayout;
