/**
 * Settings module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import SettingsWorkspace from '../shared/SettingsWorkspace';
// UserSettingsPage renders the main screen and handles nearby interactions.
function UserSettingsPage() {
  return <SettingsWorkspace role="user" />;
}
// Default export registers the primary  value.
export default UserSettingsPage;
