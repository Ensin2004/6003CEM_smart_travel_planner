/**
 * Public Nav Items module.
 * Exports and local helpers keep related behavior in a single module.
 */
import {
  ListChecks,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

// Defines the public navigation items with their icons, labels, and anchor identifiers
const publicNavItems = [
  [Sparkles, 'Features', 'features'],
  [ListChecks, 'How it works', 'how-it-works'],
  [ShieldCheck, 'Safety', 'safety'],
  [Users, 'For travellers', 'travellers'],
];

// Default export registers the primary  value.
export default publicNavItems;
