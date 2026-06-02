/**
 * Settings module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { Camera, ChevronDown, Edit3 } from 'lucide-react';
import { ageGroupOptions, countries, genderOptions } from '../../../auth/auth.validation';
// ProfileSettings renders the main screen and handles nearby interactions.
function ProfileSettings({
  editableFields,
  onAvatarChange,
  onAvatarRemove,
  onProfileChange,
  onProfileSubmit,
  onSelect,
  openDropdown,
  profile,
  renderStatus,
  selectedAgeGroup,
  selectedCountryCode,
  selectedGender,
  setEditableFields,
  setOpenDropdown,
}) {
  const renderCustomSelect = ({ name, label, options, selectedOption, placeholder, onSelect: handleSelect }) => (
    <label>
      {label}
      <div className="country-select-field country-picker">
        <input type="hidden" name={name} value={selectedOption?.value || ''} required />
        <button
          type="button"
          className={`country-picker-button ${selectedOption ? '' : 'select-placeholder'}`}
          aria-haspopup="listbox"
          aria-expanded={openDropdown === name}
          onClick={() => setOpenDropdown((current) => (current === name ? '' : name))}
        >
          {selectedOption?.flagUrl && (
            <img src={selectedOption.flagUrl} alt="" className="country-select-flag" aria-hidden="true" />
          )}
          <span>{selectedOption?.label || placeholder}</span>
          <ChevronDown className="country-picker-icon" size={18} aria-hidden="true" />
        </button>
        {openDropdown === name && (
          <div className="country-picker-menu" role="listbox" aria-label={label}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={option.value === selectedOption?.value ? 'country-picker-option active' : 'country-picker-option'}
                role="option"
                aria-selected={option.value === selectedOption?.value}
                onClick={() => {
                  handleSelect(option);
                  setOpenDropdown('');
                }}
              >
                {option.flagUrl && <img src={option.flagUrl} alt="" aria-hidden="true" />}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  );
  return (
    <form className="settings-pane settings-form" onSubmit={onProfileSubmit}>
      <h3>Manage Profile</h3>
      <div className="settings-avatar-block">
        <div className="settings-avatar-frame">
          <div className="settings-avatar-preview">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Profile avatar" />
            ) : (
              <span>{profile.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            )}
          </div>
          <label className="settings-avatar-camera" aria-label="Upload profile image">
            <Camera size={18} />
            <input type="file" accept="image/png,image/jpeg" onChange={onAvatarChange} />
          </label>
        </div>
        {profile.avatarUrl && (
          <button className="settings-avatar-remove" type="button" onClick={onAvatarRemove}>
            Remove avatar
          </button>
        )}
      </div>
      <div className="auth-form-row">
        <label>
          Name
          <div className="settings-edit-field">
            <input
              name="name"
              value={profile.name}
              onChange={onProfileChange}
              readOnly={!editableFields.name}
              required
            />
            <button
              type="button"
              className={editableFields.name ? 'settings-field-edit active' : 'settings-field-edit'}
              aria-label="Edit name"
              onClick={() => setEditableFields((current) => ({ ...current, name: !current.name }))}
            >
              <Edit3 size={18} />
            </button>
          </div>
        </label>
        <label>
          Email
          <div className="settings-edit-field">
            <input
              type="email"
              name="email"
              value={profile.email}
              readOnly
              className="settings-disabled-input"
              required
            />
          </div>
        </label>
      </div>
      <div className="auth-form-row">
        {renderCustomSelect({
          name: 'country',
          label: 'Country',
          options: countries.map(({ country, countryCode, flagUrl }) => ({
            label: country,
            value: countryCode,
            flagUrl,
          })),
          selectedOption: {
            label: profile.country,
            value: selectedCountryCode,
            flagUrl: countries.find(({ countryCode }) => countryCode === selectedCountryCode)?.flagUrl,
          },
          placeholder: 'Select country',
          onSelect: (option) => onSelect('country', option.label),
        })}
        {renderCustomSelect({
          name: 'gender',
          label: 'Gender',
          options: genderOptions,
          selectedOption: selectedGender,
          placeholder: 'Select gender',
          onSelect: (option) => onSelect('gender', option.value),
        })}
      </div>
      {renderCustomSelect({
        name: 'ageGroup',
        label: 'Age group',
        options: ageGroupOptions,
        selectedOption: selectedAgeGroup,
        placeholder: 'Select age group',
        onSelect: (option) => onSelect('ageGroup', option.value),
      })}
      <button className="auth-submit settings-action" type="submit">
        Save
      </button>
      {renderStatus('profile')}
    </form>
  );
}
// Default export registers the primary  value.
export default ProfileSettings;
