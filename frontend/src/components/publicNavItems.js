/**
 * Public Nav Items module.
 * Exports and local helpers keep related behavior in a single module.
 */
import {
  Compass,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const publicNavItems = [
  [Sparkles, 'Features', 'features'],
  [ListChecks, 'How it works', 'how-it-works'],
  [ShieldCheck, 'Safety', 'safety'],
  [Users, 'For travellers', 'travellers'],
  [Compass, 'Demo', 'demo'],
];
// Default export registers the primary  value.
export default publicNavItems;
