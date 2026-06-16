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
  // Helper function to render a custom dropdown select input with flag support
  const renderCustomSelect = ({ name, label, options, selectedOption, placeholder, onSelect: handleSelect }) => (
    <label>
      {label}
      <div className="country-select-field country-picker">
        {/* Hidden input to store the selected value for form submission */}
        <input type="hidden" name={name} value={selectedOption?.value || ''} required />
        
        {/* Button that toggles the dropdown menu visibility */}
        <button
          type="button"
          className={`country-picker-button ${selectedOption ? '' : 'select-placeholder'}`}
          aria-haspopup="listbox"
          aria-expanded={openDropdown === name}
          onClick={() => setOpenDropdown((current) => (current === name ? '' : name))}
        >
          {/* Country flag image - conditionally rendered when available */}
          {selectedOption?.flagUrl && (
            <img src={selectedOption.flagUrl} alt="" className="country-select-flag" aria-hidden="true" />
          )}
          {/* Display selected label or placeholder text */}
          <span>{selectedOption?.label || placeholder}</span>
          {/* Dropdown chevron icon */}
          <ChevronDown className="country-picker-icon" size={18} aria-hidden="true" />
        </button>
        
        {/* Dropdown menu - rendered when the dropdown is open for this field */}
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
                {/* Option flag image - conditionally rendered */}
                {option.flagUrl && <img src={option.flagUrl} alt="" aria-hidden="true" />}
                {/* Option label text */}
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
      {/* Section heading for the profile management interface */}
      <h3>Manage Profile</h3>
      
      {/* Avatar management section */}
      <div className="settings-avatar-block">
        {/* Avatar preview frame */}
        <div className="settings-avatar-frame">
          <div className="settings-avatar-preview">
            {/* Display avatar image if available, otherwise show initial letter */}
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Profile avatar" />
            ) : (
              <span>{profile.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            )}
          </div>
          {/* Camera button for uploading a new avatar image */}
          <label className="settings-avatar-camera" aria-label="Upload profile image">
            <Camera size={18} />
            <input type="file" accept="image/png,image/jpeg" onChange={onAvatarChange} />
          </label>
        </div>
        
        {/* Remove avatar button - conditionally rendered when avatar exists */}
        {profile.avatarUrl && (
          <button className="settings-avatar-remove" type="button" onClick={onAvatarRemove}>
            Remove avatar
          </button>
        )}
      </div>
      
      {/* Profile information row - name and email fields */}
      <div className="auth-form-row">
        {/* Name field with edit toggle functionality */}
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
            {/* Edit toggle button for enabling/disabling name field editing */}
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
        
        {/* Email field - always read-only (disabled input) */}
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
      
      {/* Second row - country and gender custom selects */}
      <div className="auth-form-row">
        {/* Country select dropdown with flag support */}
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
        
        {/* Gender select dropdown */}
        {renderCustomSelect({
          name: 'gender',
          label: 'Gender',
          options: genderOptions,
          selectedOption: selectedGender,
          placeholder: 'Select gender',
          onSelect: (option) => onSelect('gender', option.value),
        })}
      </div>
      
      {/* Age group select dropdown - full width */}
      {renderCustomSelect({
        name: 'ageGroup',
        label: 'Age group',
        options: ageGroupOptions,
        selectedOption: selectedAgeGroup,
        placeholder: 'Select age group',
        onSelect: (option) => onSelect('ageGroup', option.value),
      })}
      
      {/* Submit button to save profile changes */}
      <button className="auth-submit settings-action" type="submit">
        Save
      </button>
      
      {/* Status display for profile update operations */}
      {renderStatus('profile')}
    </form>
  );
}

// Default export registers the primary value.
export default ProfileSettings;
