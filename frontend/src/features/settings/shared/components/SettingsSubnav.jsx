/**
 * Settings module.
 * Exports and local helpers keep related behavior in a single module.
 */
import SubmenuPanel from '../../../../components/SubmenuPanel';

// SettingsSubnav renders the main screen and handles nearby interactions.
function SettingsSubnav({ sections, activeSection, onSectionChange }) {
  return (
    <SubmenuPanel
      activeId={activeSection}          // Currently active section identifier for highlighting
      ariaLabel="Settings sections"     // Accessibility label for screen readers
      className="settings-subnav"       // Custom CSS class for styling the navigation
      items={sections}                 // Array of section objects to display in the navigation
      onItemSelect={onSectionChange}   // Callback function triggered when a section is selected
    />
  );
}

// Default export registers the primary value.
export default SettingsSubnav;