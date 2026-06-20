/**
 * Settings module.
 * Reusable labels, keys, and defaults stay centralized for feature code.
 */

// Imports Lucide icons for the settings navigation sections
import { Bell, CircleHelp, FileText, Lock, ShieldCheck, Star, User } from 'lucide-react';

// Configuration array for all settings sections with unique IDs, display labels, and associated icons
// Each section represents a different settings page or feature area
export const sections = [
  { id: 'profile', label: 'Manage Profile', icon: User },
  { id: 'password', label: 'Change Password', icon: Lock },
  { id: 'notifications', label: 'Manage Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
  { id: 'terms', label: 'Terms and Conditions', icon: FileText },
  { id: 'support', label: 'FAQ', icon: CircleHelp },
  { id: 'feedback', label: 'Rate Us & Feedback', adminLabel: 'Ratings and Feedback', icon: Star },
];

// Notification preference labels organized by user role
// Admin notifications include system alerts, error logs, and feedback monitoring
// User notifications include trip planning and packing reminders
export const notificationCopy = {
  admin: [
    ['errorLogs', 'Error logs'],
    ['systemAlerts', 'System alerts'],
    ['ratingFeedback', 'Ratings and feedback alerts'],
  ],
  user: [
    ['tripAlerts', 'Trip alerts'],
    ['packingReminder', 'Packing reminder'],
  ],
};

// Complete list of all notification preference keys for validation and iteration
// Combines both admin and user notification types
export const allNotificationKeys = [
  'tripAlerts',
  'packingReminder',
  'errorLogs',
  'systemAlerts',
  'ratingFeedback',
];

// Default state for all notification preferences
// All notifications are enabled by default with notificationsOff set to false
export const defaultNotificationPreferences = {
  notificationsOff: false,
  tripAlerts: true,
  packingReminder: true,
  errorLogs: true,
  systemAlerts: true,
  ratingFeedback: true,
};

// Sorting options for feedback/rating display
// Allows filtering feedback items by newest first, oldest first, or showing all
export const feedbackSortOptions = [
  { value: 'all', label: 'All' },
  { value: 'latest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

// Rating filter options for feedback items
// Enables filtering by specific star ratings or showing all ratings
export const feedbackRatingOptions = [
  { value: 'all', label: 'All stars' },
  { value: '5', label: '5 stars' },
  { value: '4', label: '4 stars' },
  { value: '3', label: '3 stars' },
  { value: '2', label: '2 stars' },
  { value: '1', label: '1 star' },
];

// Shared date formatter for Malaysian locale with day, abbreviated month, and full year
// Used consistently across the settings module for date display
export const dateFormatter = new Intl.DateTimeFormat('en-MY', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

// Maximum avatar file size in megabytes (1,000 MB = 1 GB)
export const maxAvatarSizeMegabytes = 1000;

// Maximum avatar file size in bytes, calculated from the megabyte constant
// Used for file size validation before upload
export const maxAvatarSizeBytes = maxAvatarSizeMegabytes * 1024 * 1024;
