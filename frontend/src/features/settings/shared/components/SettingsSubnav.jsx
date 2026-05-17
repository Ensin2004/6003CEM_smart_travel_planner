import SubmenuPanel from '../../../../components/SubmenuPanel';

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

export default SettingsSubnav;
