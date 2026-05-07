import {
  Activity,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldAlert,
  Users,
} from 'lucide-react';
import AppLayout from './AppLayout';

const adminMenu = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'User Management', icon: Users },
  { to: '/admin/api-logs', label: 'API Logs', icon: Activity },
  { to: '/admin/system-errors', label: 'System Errors', icon: ShieldAlert },
  { to: '/admin/settings', label: 'Settings', icon: Settings, bottom: true },
  { to: '/login', label: 'Logout', icon: LogOut, bottom: true },
];

function AdminLayout() {
  return <AppLayout role="admin" menuItems={adminMenu} />;
}

export default AdminLayout;
