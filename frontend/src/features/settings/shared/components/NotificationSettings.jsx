/**
 * Settings module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { notificationCopy } from '../settings.constants';

// NotificationSettings renders the main screen and handles nearby interactions.
function NotificationSettings({
  onAllNotificationsOff,
  onNotificationToggle,
  onProfileSubmit,
  profile,
  renderStatus,
  role,
}) {
  return (
    <section className="settings-pane settings-notifications-pane">
      {/* Section heading for the notification management interface */}
      <h3>Manage Notifications</h3>
      
      {/* Container for all notification toggle controls */}
      <div className="settings-toggle-list">
        {/* Master toggle switch for enabling/disabling all notifications */}
        <label className="settings-toggle">
          <span>
            Notifications
            {/* Display current status of all notifications */}
            <small>{profile.notificationPreferences?.notificationsOff ? 'Off' : 'On'}</small>
          </span>
          {/* Checkbox input that controls the master notification state */}
          <input
            type="checkbox"
            checked={!profile.notificationPreferences?.notificationsOff}
            onChange={onAllNotificationsOff}
          />
        </label>
        
        {/* Dynamic generation of individual notification toggles based on user role */}
        {notificationCopy[role].map(([key, label]) => (
          <label className="settings-toggle" key={key}>
            {/* Label text for the specific notification type */}
            <span>{label}</span>
            {/* Individual toggle input for each notification category */}
            <input
              type="checkbox"
              checked={Boolean(profile.notificationPreferences?.[key])}
              // Disable individual toggles when all notifications are turned off
              disabled={Boolean(profile.notificationPreferences?.notificationsOff)}
              onChange={() => onNotificationToggle(key)}
            />
          </label>
        ))}
      </div>
      
      {/* Save button to persist notification preference changes */}
      <button className="auth-submit settings-action" type="button" onClick={onProfileSubmit}>
        Save
      </button>
      
      {/* Status display for notification preference operations */}
      {renderStatus('profile')}
    </section>
  );
}

// Default export registers the primary value.
export default NotificationSettings;
