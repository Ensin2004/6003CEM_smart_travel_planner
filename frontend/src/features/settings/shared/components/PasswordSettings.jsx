/**
 * Settings module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { Eye, EyeOff } from 'lucide-react';

// PasswordSettings renders the main screen and handles nearby interactions.
function PasswordSettings({
  doPasswordsMatch,
  onPasswordSubmit,
  passwordData,
  passwordFocus,
  renderStatus,
  setPasswordData,
  setPasswordFocus,
  setVisiblePasswords,
  unmetPasswordRequirements,
  visiblePasswords,
}) {
  // Helper function to render a password input field with toggle visibility button
  const renderPasswordInput = (name, label, placeholder, autoComplete) => (
    <label>
      {label}
      <div className="password-field">
        {/* Input field that toggles between text and password type based on visibility state */}
        <input
          type={visiblePasswords[name] ? 'text' : 'password'}
          name={name}
          value={passwordData[name]}
          onChange={(event) => setPasswordData((current) => ({ ...current, [name]: event.target.value }))}
          onFocus={() => setPasswordFocus(name)}
          onBlur={() => setPasswordFocus('')}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />
        {/* Toggle button for showing/hiding the password text */}
        <button
          type="button"
          className="password-toggle"
          aria-label={visiblePasswords[name] ? `Hide ${label}` : `Show ${label}`}
          onClick={() => setVisiblePasswords((current) => ({ ...current, [name]: !current[name] }))}
        >
          {visiblePasswords[name] ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
      </div>
    </label>
  );

  return (
    <form className="settings-pane settings-form settings-password-form" onSubmit={onPasswordSubmit}>
      {/* Section heading for the password change interface */}
      <h3>Change Password</h3>
      
      {/* Current password input field */}
      {renderPasswordInput('currentPassword', 'Current password', 'Enter current password', 'current-password')}
      
      {/* New password input field */}
      {renderPasswordInput('password', 'New password', 'Enter new password', 'new-password')}
      
      {/* Password requirements validation list - displayed when new password field is focused */}
      {passwordFocus === 'password' && unmetPasswordRequirements.length > 0 && (
        <ul className="password-requirements" aria-live="polite">
          {unmetPasswordRequirements.map((requirement) => (
            <li key={requirement.label}>{requirement.label}</li>
          ))}
        </ul>
      )}
      
      {/* Confirm password input field */}
      {renderPasswordInput('confirmPassword', 'Confirm new password', 'Re-enter new password', 'new-password')}
      
      {/* Password match validation message - displayed when confirm password field is focused and has content */}
      {passwordFocus === 'confirmPassword' && passwordData.confirmPassword && (
        <p className={`password-match-message ${doPasswordsMatch ? 'password-match-message-success' : 'password-match-message-error'}`}>
          {doPasswordsMatch ? 'Password match' : 'Password does not match'}
        </p>
      )}
      
      {/* Submit button to save the password changes */}
      <button className="auth-submit settings-action" type="submit">
        Save
      </button>
      
      {/* Status display for password update operations */}
      {renderStatus('password')}
    </form>
  );
}

// Default export registers the primary value.
export default PasswordSettings;
