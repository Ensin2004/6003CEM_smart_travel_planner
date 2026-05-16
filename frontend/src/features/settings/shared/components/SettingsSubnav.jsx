function SettingsSubnav({ sections, activeSection, onSectionChange }) {
  return (
    <aside className="settings-subnav" aria-label="Settings sections">
      {sections.map((section) => {
        const SectionIcon = section.icon;

        return (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? 'active' : ''}
            onClick={() => onSectionChange(section.id)}
          >
            <SectionIcon size={18} />
            {section.label}
          </button>
        );
      })}
    </aside>
  );
}

export default SettingsSubnav;
