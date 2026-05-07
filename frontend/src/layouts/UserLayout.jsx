import { Compass, LayoutDashboard, LogOut, Plane, Settings } from 'lucide-react';
import AppLayout from './AppLayout';

const userMenu = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/trips', label: 'My Trips', icon: Plane },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/profile', label: 'Settings', icon: Settings, bottom: true },
  { to: '/login', label: 'Logout', icon: LogOut, bottom: true },
];

function UserLayout() {
  return <AppLayout role="user" menuItems={userMenu} />;
}

export default UserLayout;
