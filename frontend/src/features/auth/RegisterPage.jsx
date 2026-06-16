/**
 * Auth module.
 * Page state, event handlers, and render sections define the screen experience.
 * Handles user registration with validation, password requirements, and email verification.
 */
import { CalendarDays, ChevronDown, CloudSun, Eye, EyeOff, MailCheck, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, resendVerificationEmail } from '../../api/authApi';
import PublicTopbar from '../../components/PublicTopbar';
import {
  ageGroupOptions,
  countries,
  genderOptions,
  maxNameLength,
  maxPasswordLength,
  passwordRequirements,
} from './auth.validation';
import './AuthPage.css';

// RegisterPage renders the main screen and handles nearby interactions.
// Main component for new user registration with comprehensive form validation
function RegisterPage() {
  // Navigation hook for redirecting after successful registration
  const navigate = useNavigate();

  // State management for form data and UI controls
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    country: 'MY', // Default country: Malaysia
    gender: '',
    ageGroup: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState(''); // Error message display
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevents double submission

  // Password visibility toggles for both password fields
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  // Focus states for password validation feedback
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

  // Dropdown menu open states for country, gender, and age group selectors
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
  const [isGenderMenuOpen, setIsGenderMenuOpen] = useState(false);
  const [isAgeGroupMenuOpen, setIsAgeGroupMenuOpen] = useState(false);

  // Verification notice state for post-registration email confirmation
  const [verificationNotice, setVerificationNotice] = useState(null);
  const [resendStatus, setResendStatus] = useState(''); // Status for resend verification
  const [isResending, setIsResending] = useState(false); // Prevents multiple resend requests

  // Computes unmet password requirements for real-time validation feedback
  const unmetPasswordRequirements = useMemo(
    () => passwordRequirements.filter((requirement) => !requirement.test(formData.password)),
    [formData.password]
  );

  // Password confirmation validation flags
  const isConfirmPasswordFilled = formData.confirmPassword.length > 0;
  const doPasswordsMatch = formData.password === formData.confirmPassword;

  // Conditional display flags for password feedback
  const shouldShowPasswordRequirements = isPasswordFocused && unmetPasswordRequirements.length > 0;
  const shouldShowPasswordMatchMessage = isConfirmPasswordFocused && isConfirmPasswordFilled;

  // Finds selected option objects from arrays using current form values
  const selectedCountry = countries.find(
    ({ countryCode }) => countryCode === formData.country
  );
  const selectedGender = genderOptions.find(({ value }) => value === formData.gender);
  const selectedAgeGroup = ageGroupOptions.find(({ value }) => value === formData.ageGroup);

  // Handles form input changes and updates form data state
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  // Handles country selection from dropdown
  const handleCountrySelect = (countryCode) => {
    setFormData((current) => ({ ...current, country: countryCode }));
    setIsCountryMenuOpen(false); // Closes dropdown after selection
  };

  // Generic handler for option selections (gender and age group)
  const handleOptionSelect = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));

    // Closes appropriate dropdown based on field name
    if (name === 'gender') {
      setIsGenderMenuOpen(false);
    }

    if (name === 'ageGroup') {
      setIsAgeGroupMenuOpen(false);
    }
  };

  // Handles registration form submission with comprehensive validation
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevents default form submission
    setError(''); // Clears previous errors

    // Client-side validation for all required fields
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.country ||
      !formData.gender ||
      !formData.ageGroup ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError('Please complete all signup fields.');
      return; // Stops submission if fields are incomplete
    }
    if (!formData.gender || !formData.ageGroup) {
      setError('Please select your gender and age group.');
      return; // Stops submission if dropdowns not selected
    }
    if (!doPasswordsMatch) {
      setError('Passwords must match.');
      return; // Stops submission if passwords don't match
    }
    if (unmetPasswordRequirements.length > 0) {
      setError('Please meet all password requirements.');
      return; // Stops submission if password doesn't meet requirements
    }

    setIsSubmitting(true); // Disables button during API call
    try {
      // Calls registration API with form data
      const response = await register({
        ...formData,
        country: selectedCountry?.country || formData.country, // Uses full country name
      });
      const result = response.data.data;
      // Stores verification notice for email confirmation modal
      setVerificationNotice({
        email: result.email || formData.email,
        expiresAt: result.verificationExpiresAt,
      });
    } catch (requestError) {
      // Extracts error message from multiple possible response formats
      const message =
        requestError.response?.data?.message ||
        requestError.response?.data?.errors?.[0]?.message ||
        requestError.response?.data?.errors?.[0]?.msg ||
        'Unable to create your account. Please check your details and try again.';
      setError(message); // Displays user-friendly error message
    } finally {
      setIsSubmitting(false); // Re-enables button after API call completes
    }
  };

  // Handles resending verification email for unverified accounts
  const handleResendVerification = async () => {
    if (!verificationNotice?.email) return; // Guards against missing email

    setIsResending(true); // Disables button during API call
    setResendStatus(''); // Clears previous status

    try {
      // Calls API to resend verification email
      const response = await resendVerificationEmail({ email: verificationNotice.email });
      const result = response.data.data;
      // Updates expiration time in the verification notice
      setVerificationNotice((current) => ({
        ...current,
        expiresAt: result.verificationExpiresAt || current.expiresAt,
      }));
      setResendStatus(response.data.message || 'Verification email sent.');
    } catch (requestError) {
      // Handles resend API errors
      setResendStatus(
        requestError.response?.data?.message ||
          'Unable to resend the verification email. Please try again.'
      );
    } finally {
      setIsResending(false); // Re-enables button after API call completes
    }
  };

  // Renders the complete registration interface with form and showcase
  return (
    <main className="auth-page auth-register">
      {/* Top navigation bar with branding and public links */}
      <PublicTopbar />
      
      {/* Main authentication card with showcase and form panel */}
      <section className="auth-card">
        {/* Left showcase panel with brand messaging and feature highlights */}
        <aside className="auth-showcase">
          <div className="showcase-copy">
            <p className="eyebrow">Start planning</p>
            <h1>Set up your travel planner.</h1>
            <p>Create an account to save trips, compare details, and keep preparation organized.</p>
            {/* Feature highlights for new users */}
            <div className="showcase-points" aria-label="Signup highlights">
              <span><CalendarDays size={16} /> Itinerary</span>
              <span><CloudSun size={16} /> Weather</span>
              <span><WalletCards size={16} /> Budget</span>
            </div>
          </div>
          {/* Promotional card about workspace tools */}
          <div className="showcase-card">
            <span>Workspace preview</span>
            <strong>Organize future trips</strong>
            <p>Use one place for destinations, preferences, checklists, and budgets.</p>
          </div>
        </aside>

        {/* Right panel with registration form */}
        <section className="auth-panel" aria-labelledby="register-title">
          <div className="auth-heading">
            <p className="eyebrow">Sign up</p>
            <h2 id="register-title">Create your account</h2>
            <p>Create a user account to start planning your trips.</p>
          </div>

          {/* Registration form with all required fields */}
          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Email field */}
            <label>
              Email address
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            {/* Full name field with character counter */}
            <label>
              <span className="label-with-counter">
                Full name
                <span>{formData.name.length}/{maxNameLength}</span>
              </span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                autoComplete="name"
                maxLength={maxNameLength}
                required
              />
            </label>

            {/* Country selector with dropdown */}
            <label>
              Country
              <div className="country-select-field country-picker">
                <input type="hidden" name="country" value={formData.country} required />
                <button
                  type="button"
                  className="country-picker-button"
                  aria-haspopup="listbox"
                  aria-expanded={isCountryMenuOpen}
                  onClick={() => {
                    setIsGenderMenuOpen(false); // Closes other dropdowns
                    setIsAgeGroupMenuOpen(false);
                    setIsCountryMenuOpen((current) => !current); // Toggles country dropdown
                  }}
                >
                  {/* Displays selected country flag and name */}
                  {selectedCountry && (
                    <img
                      src={selectedCountry.flagUrl}
                      alt=""
                      className="country-select-flag"
                      aria-hidden="true"
                    />
                  )}
                  <span>{selectedCountry?.country || 'Select country'}</span>
                  <ChevronDown className="country-picker-icon" size={18} aria-hidden="true" />
                </button>
                {/* Country dropdown menu */}
                {isCountryMenuOpen && (
                  <div className="country-picker-menu" role="listbox" aria-label="Country">
                    {countries.map(({ country, countryCode, flagUrl }) => (
                      <button
                        key={countryCode}
                        type="button"
                        className={countryCode === formData.country ? 'country-picker-option active' : 'country-picker-option'}
                        role="option"
                        aria-selected={countryCode === formData.country}
                        onClick={() => handleCountrySelect(countryCode)}
                      >
                        <img src={flagUrl} alt="" aria-hidden="true" />
                        <span>{country}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            {/* Two-column row for gender and age group selectors */}
            <div className="auth-form-row">
              {/* Gender selector dropdown */}
              <label>
                Gender
                <div className="country-select-field country-picker">
                  <input type="hidden" name="gender" value={formData.gender} required />
                  <button
                    type="button"
                    className={`country-picker-button ${selectedGender ? '' : 'select-placeholder'}`}
                    aria-haspopup="listbox"
                    aria-expanded={isGenderMenuOpen}
                    onClick={() => {
                      setIsCountryMenuOpen(false); // Closes other dropdowns
                      setIsAgeGroupMenuOpen(false);
                      setIsGenderMenuOpen((current) => !current); // Toggles gender dropdown
                    }}
                  >
                    <span>{selectedGender?.label || 'Select gender'}</span>
                    <ChevronDown className="country-picker-icon" size={18} aria-hidden="true" />
                  </button>
                  {/* Gender dropdown menu */}
                  {isGenderMenuOpen && (
                    <div className="country-picker-menu" role="listbox" aria-label="Gender">
                      {genderOptions.map(({ label, value }) => (
                        <button
                          key={value}
                          type="button"
                          className={value === formData.gender ? 'country-picker-option active' : 'country-picker-option'}
                          role="option"
                          aria-selected={value === formData.gender}
                          onClick={() => handleOptionSelect('gender', value)}
                        >
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>

              {/* Age group selector dropdown */}
              <label>
                Age group
                <div className="country-select-field country-picker">
                  <input type="hidden" name="ageGroup" value={formData.ageGroup} required />
                  <button
                    type="button"
                    className={`country-picker-button ${selectedAgeGroup ? '' : 'select-placeholder'}`}
                    aria-haspopup="listbox"
                    aria-expanded={isAgeGroupMenuOpen}
                    onClick={() => {
                      setIsCountryMenuOpen(false); // Closes other dropdowns
                      setIsGenderMenuOpen(false);
                      setIsAgeGroupMenuOpen((current) => !current); // Toggles age group dropdown
                    }}
                  >
                    <span>{selectedAgeGroup?.label || 'Select age group'}</span>
                    <ChevronDown className="country-picker-icon" size={18} aria-hidden="true" />
                  </button>
                  {/* Age group dropdown menu */}
                  {isAgeGroupMenuOpen && (
                    <div className="country-picker-menu" role="listbox" aria-label="Age group">
                      {ageGroupOptions.map(({ label, value }) => (
                        <button
                          key={value}
                          type="button"
                          className={value === formData.ageGroup ? 'country-picker-option active' : 'country-picker-option'}
                          role="option"
                          aria-selected={value === formData.ageGroup}
                          onClick={() => handleOptionSelect('ageGroup', value)}
                        >
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Password field with requirements validation */}
            <label>
              Password
              <div className="password-field">
                <input
                  type={isPasswordVisible ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  placeholder="Enter a password"
                  autoComplete="new-password"
                  maxLength={maxPasswordLength}
                  required
                />
                {/* Password visibility toggle */}
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                  onClick={() => setIsPasswordVisible((current) => !current)}
                >
                  {isPasswordVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
              {/* Live password requirements checklist */}
              {shouldShowPasswordRequirements && (
                <ul className="password-requirements" aria-live="polite">
                  {unmetPasswordRequirements.map((requirement) => (
                    <li key={requirement.label}>{requirement.label}</li>
                  ))}
                </ul>
              )}
            </label>

            {/* Confirm password field with match validation */}
            <label>
              Confirm password
              <div className="password-field">
                <input
                  type={isConfirmPasswordVisible ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => setIsConfirmPasswordFocused(true)}
                  onBlur={() => setIsConfirmPasswordFocused(false)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  maxLength={maxPasswordLength}
                  required
                />
                {/* Confirm password visibility toggle */}
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={isConfirmPasswordVisible ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setIsConfirmPasswordVisible((current) => !current)}
                >
                  {isConfirmPasswordVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
              {/* Live password match confirmation */}
              {shouldShowPasswordMatchMessage && (
                <p
                  className={`password-match-message ${
                    doPasswordsMatch ? 'password-match-message-success' : 'password-match-message-error'
                  }`}
                  aria-live="polite"
                >
                  {doPasswordsMatch ? 'Password match' : 'Password does not match'}
                </p>
              )}
            </label>

            {/* Error message display */}
            {error && <p className="form-error">{error}</p>}

            {/* Registration submit button with loading state */}
            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          {/* Navigation link to login for existing users */}
          <p className="auth-switch">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </section>
      </section>

      {/* Verification notice modal shown after successful registration */}
      {verificationNotice && (
        <div className="auth-modal-backdrop" role="presentation">
          <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="verify-email-title">
            {/* Success icon indicating email sent */}
            <div className="auth-modal-icon">
              <MailCheck size={30} />
            </div>
            <h3 id="verify-email-title">Verify your email</h3>
            <p>
              We sent a verification link to <strong>{verificationNotice.email}</strong>. Please click that link before logging in.
            </p>
            {/* Shows verification link expiration time if available */}
            {verificationNotice.expiresAt && (
              <p className="auth-modal-note">
                The link expires on {new Date(verificationNotice.expiresAt).toLocaleString()}.
              </p>
            )}
            {/* Status message for resend operation */}
            {resendStatus && <p className="form-success">{resendStatus}</p>}
            
            {/* Modal action buttons */}
            <div className="auth-modal-actions">
              {/* Navigate to login button */}
              <button type="button" className="auth-submit" onClick={() => navigate('/login')}>
                Go to login
              </button>
              {/* Resend verification email button */}
              <button
                type="button"
                className="auth-secondary-button"
                onClick={handleResendVerification}
                disabled={isResending}
              >
                {isResending ? 'Sending...' : 'Resend email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Default export registers the primary value for route configuration
export default RegisterPage;
