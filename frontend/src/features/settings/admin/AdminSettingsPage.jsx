/**
 * Settings module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import SettingsWorkspace from '../shared/SettingsWorkspace';
// AdminSettingsPage renders the main screen and handles nearby interactions.
function AdminSettingsPage() {
  return <SettingsWorkspace role="admin" />;
}
// Default export registers the primary  value.
export default AdminSettingsPage;
