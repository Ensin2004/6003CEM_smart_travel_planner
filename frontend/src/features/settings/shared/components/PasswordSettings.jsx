import { Eye, EyeOff } from 'lucide-react';

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
  const renderPasswordInput = (name, label, placeholder, autoComplete) => (
    <label>
      {label}
      <div className="password-field">
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
      <h3>Change Password</h3>
      {renderPasswordInput('currentPassword', 'Current password', 'Enter current password', 'current-password')}
      {renderPasswordInput('password', 'New password', 'Enter new password', 'new-password')}
      {passwordFocus === 'password' && unmetPasswordRequirements.length > 0 && (
        <ul className="password-requirements" aria-live="polite">
          {unmetPasswordRequirements.map((requirement) => (
            <li key={requirement.label}>{requirement.label}</li>
          ))}
        </ul>
      )}
      {renderPasswordInput('confirmPassword', 'Confirm new password', 'Re-enter new password', 'new-password')}
      {passwordFocus === 'confirmPassword' && passwordData.confirmPassword && (
        <p className={`password-match-message ${doPasswordsMatch ? 'password-match-message-success' : 'password-match-message-error'}`}>
          {doPasswordsMatch ? 'Password match' : 'Password does not match'}
        </p>
      )}
      <button className="auth-submit settings-action" type="submit">
        Save
      </button>
      {renderStatus('password')}
    </form>
  );
}

export default PasswordSettings;
