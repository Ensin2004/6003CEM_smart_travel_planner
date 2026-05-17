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
  { to: '/dashboard', label: 'Home', icon: Home, end: true },
  {
    to: '/trips',
    label: 'Trips',
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
  { to: '/dashboard#packing-list-template', label: 'Packing list template', icon: ListChecks },
  { to: '/dashboard#document-list-template', label: 'Document list template', icon: FileText },
  { to: '/dashboard#favourite', label: 'Favourite', icon: Heart, bottom: true },
  { to: '/dashboard#language-helper', label: 'Language helper', icon: Languages, bottom: true },
  { to: '/profile', label: 'Settings', icon: Settings, bottom: true },
  { to: '/login', label: 'Logout', icon: LogOut, bottom: true },
];

function UserLayout() {
  return <AppLayout role="user" menuItems={userMenu} />;
}

export default UserLayout;
