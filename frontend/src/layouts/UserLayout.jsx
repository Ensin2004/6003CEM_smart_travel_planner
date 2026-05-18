import {
  Bot,
  BriefcaseBusiness,
  Building2,
  CloudSun,
  Compass,
  FileText,
  Heart,
  Home,
  Languages,
  ListChecks,
  LogOut,
  MapPinned,
  Plane,
  Settings,
  Sparkles,
  Utensils,
} from 'lucide-react';
import AppLayout from './AppLayout';

const userMenu = [
  { to: '/dashboard', label: 'Dashboard', icon: Home, end: true },
  {
    to: '/trips',
    label: 'My Trips',
    icon: Plane,
    children: [
      { to: '/trips', label: 'Self create', icon: ListChecks },
      { to: '/trips?create=ai', label: 'AI create', icon: Bot },
    ],
  },
  {
    to: '/explore',
    label: 'Explore',
    icon: Compass,
    children: [
      { to: '/explore?view=discover', label: 'Discover (AI)', icon: Sparkles },
      { to: '/explore?view=weather', label: 'Weather', icon: CloudSun },
      { to: '/explore?view=attractions', label: 'Attractions', icon: MapPinned },
      { to: '/explore?view=food', label: 'Restaurant / food', icon: Utensils },
      { to: '/explore?view=hotels', label: 'Hotels', icon: Building2 },
      { to: '/explore?view=transport', label: 'Transport', icon: BriefcaseBusiness },
    ],
  },
  { to: '/packing-lists', label: 'Packing List', icon: ListChecks},
  { to: '/dashboard#travel-document', label: 'Travel Document', icon: FileText},
  { to: '/dashboard#favourite', label: 'Favourite', icon: Heart, header: true },
  { to: '/dashboard#language-helper', label: 'Language Helper', icon: Languages},
  { to: '/profile', label: 'Settings', icon: Settings, bottom: true },
  { to: '/login', label: 'Logout', icon: LogOut, bottom: true },
];

function UserLayout() {
  return <AppLayout role="user" menuItems={userMenu} />;
}

export default UserLayout;
