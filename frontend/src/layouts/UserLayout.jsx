import {
  Bot,
  BriefcaseBusiness,
  Building2,
  Compass,
  FileText,
  Heart,
  Home,
  Languages,
  ListChecks,
  LogOut,
  Map,
  MapPinned,
  Plane,
  Settings,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { sections as settingsSections } from '../features/settings/shared/settings.constants';
import AppLayout from './AppLayout';

const settingsChildren = settingsSections.map((section) => ({
  to: section.id === 'profile' ? '/profile' : `/profile?section=${section.id}`,
  label: section.label,
  icon: section.icon,
}));

const userMenu = [
  { to: '/dashboard', label: 'Dashboard', icon: Home, end: true },
  {
    to: '/trips',
    label: 'My Trips',
    icon: Plane,
    children: [
      { to: '/trips', label: 'Create Manually', icon: ListChecks },
      { to: '/trips?create=ai', label: 'Create with AI', icon: Bot },
    ],
  },
  {
    to: '/explore',
    label: 'Explore',
    icon: Compass,
    children: [
      { to: '/explore?view=discover', label: 'AI Discovery', icon: Sparkles },
      { to: '/explore?view=attractions', label: 'Attractions', icon: MapPinned },
      { to: '/explore?view=food', label: 'Restaurants / Food', icon: Utensils },
      { to: '/explore?view=hotels', label: 'Hotels / Rooms', icon: Building2 },
      { to: '/explore?view=transport', label: 'Transportation', icon: BriefcaseBusiness },
    ],
  },
  {
    to: '/packing-lists',
    label: 'Travel Tools',
    icon: ListChecks,
    children: [
      { to: '/packing-lists', label: 'Packing Lists', icon: ListChecks },
      { to: '/travel-documents', label: 'Travel Documents', icon: FileText },
    ],
  },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/dashboard#favourite', label: 'Favourite', icon: Heart, header: true },
  { to: '/dashboard#language-helper', label: 'Language Helper', icon: Languages},
  { to: '/profile', label: 'Settings', icon: Settings, bottom: true, children: settingsChildren },
  { to: '/login', label: 'Logout', icon: LogOut, bottom: true, action: 'logout' },
];

function UserLayout() {
  return <AppLayout role="user" menuItems={userMenu} />;
}

export default UserLayout;
