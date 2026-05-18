import { Bell, CircleHelp, FileText, Lock, ShieldCheck, Star, User } from 'lucide-react';

export const sections = [
  { id: 'profile', label: 'Manage Profile', icon: User },
  { id: 'password', label: 'Change Password', icon: Lock },
  { id: 'notifications', label: 'Manage Notification', icon: Bell },
  { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
  { id: 'terms', label: 'Terms and Condition', icon: FileText },
  { id: 'support', label: 'FAQ', icon: CircleHelp },
  { id: 'feedback', label: 'Rate Us & Feedback', adminLabel: 'Ratings and Feedback', icon: Star },
];

export const notificationCopy = {
  admin: [
    ['errorLogs', 'Error logs'],
    ['systemAlerts', 'System alerts'],
    ['ratingFeedback', 'Ratings and feedback alerts'],
  ],
  user: [
    ['tripAlerts', 'Trip alerts'],
    ['weatherAlerts', 'Weather alerts'],
    ['packingReminder', 'Packing reminder'],
  ],
};

export const allNotificationKeys = [
  'tripAlerts',
  'weatherAlerts',
  'packingReminder',
  'errorLogs',
  'systemAlerts',
  'ratingFeedback',
];

export const defaultNotificationPreferences = {
  notificationsOff: false,
  tripAlerts: true,
  weatherAlerts: true,
  packingReminder: true,
  errorLogs: true,
  systemAlerts: true,
  ratingFeedback: true,
};

export const feedbackSortOptions = [
  { value: 'all', label: 'All' },
  { value: 'latest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

export const feedbackRatingOptions = [
  { value: 'all', label: 'All stars' },
  { value: '5', label: '5 stars' },
  { value: '4', label: '4 stars' },
  { value: '3', label: '3 stars' },
  { value: '2', label: '2 stars' },
  { value: '1', label: '1 star' },
];

export const dateFormatter = new Intl.DateTimeFormat('en-MY', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export const maxAvatarSizeMegabytes = 1000;
export const maxAvatarSizeBytes = maxAvatarSizeMegabytes * 1024 * 1024;
