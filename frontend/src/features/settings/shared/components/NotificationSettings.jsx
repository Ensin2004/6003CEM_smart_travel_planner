import { notificationCopy } from '../settings.constants';

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
      <h3>Manage Notification</h3>
      <div className="settings-toggle-list">
        <label className="settings-toggle">
          <span>
            Notifications
            <small>{profile.notificationPreferences?.notificationsOff ? 'Off' : 'On'}</small>
          </span>
          <input
            type="checkbox"
            checked={!profile.notificationPreferences?.notificationsOff}
            onChange={onAllNotificationsOff}
          />
        </label>
        {notificationCopy[role].map(([key, label]) => (
          <label className="settings-toggle" key={key}>
            <span>{label}</span>
            <input
              type="checkbox"
              checked={Boolean(profile.notificationPreferences?.[key])}
              disabled={Boolean(profile.notificationPreferences?.notificationsOff)}
              onChange={() => onNotificationToggle(key)}
            />
          </label>
        ))}
      </div>
      <button className="auth-submit settings-action" type="button" onClick={onProfileSubmit}>
        Save
      </button>
      {renderStatus('profile')}
    </section>
  );
}

export default NotificationSettings;
