/**
 * Settings module.
 * Exports and local helpers keep related behavior in a single module.
 */
import SubmenuPanel from '../../../../components/SubmenuPanel';
// SettingsSubnav renders the main screen and handles nearby interactions.
function SettingsSubnav({ sections, activeSection, onSectionChange }) {
  return (
    <SubmenuPanel
      activeId={activeSection}
      ariaLabel="Settings sections"
      className="settings-subnav"
      items={sections}
      onItemSelect={onSectionChange}
    />
  );
}
// Default export registers the primary  value.
export default SettingsSubnav;
