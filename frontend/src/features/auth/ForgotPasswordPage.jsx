/**
 * Auth module.
 * Page state, event handlers, and render sections define the screen experience.
 * Handles the two-step password reset flow: email verification followed by password update.
 */
import { Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { checkPasswordResetEmail, resetPassword } from '../../api/authApi';
import PublicTopbar from '../../components/PublicTopbar';
import { passwordRequirements } from './auth.validation';
import './AuthPage.css';

// ForgotPasswordPage renders the main screen and handles nearby interactions.
// Main component for password recovery with email verification and password reset
// Implements a two-step flow: Step 1 - Email verification, Step 2 - Password reset
function ForgotPasswordPage() {
  // Navigation hook for redirecting after successful password reset
  const navigate = useNavigate();

  // State management for multi-step flow and form data
  const [step, setStep] = useState('email'); // Tracks current step: 'email' or 'password'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState(''); // Error message display
  const [success, setSuccess] = useState(''); // Success message display
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevents double submission

  // Password visibility toggles for both password fields
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  // Focus states for password requirement and match validation
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

  // Computes which password requirements are not yet met
  // Filters through the passwordRequirements array and returns unmet validations
  const unmetPasswordRequirements = useMemo(
    () => passwordRequirements.filter((requirement) => !requirement.test(formData.password)),
    [formData.password]
  );

  // Validation flags for password confirmation
  const isConfirmPasswordFilled = formData.confirmPassword.length > 0; // Checks if confirm field has content
  const doPasswordsMatch = formData.password === formData.confirmPassword; // Compares both password fields

  // Conditional display flags for password feedback
  // Shows requirements only when password field is focused and there are unmet requirements
  const shouldShowPasswordRequirements = isPasswordFocused && unmetPasswordRequirements.length > 0;
  // Shows match message only when confirm field is focused and has content
  const shouldShowPasswordMatchMessage = isConfirmPasswordFocused && isConfirmPasswordFilled;

  // Handles form input changes and updates form data state
  // Uses functional update to merge changes with existing form data
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  // Submits email for verification and advances to password reset step
  // Step 1: Validates email existence and moves to password creation step
  const handleEmailSubmit = async (event) => {
    event.preventDefault(); // Prevents default form submission
    setError(''); // Clears previous errors
    setSuccess(''); // Clears previous success messages
    setIsSubmitting(true); // Disables button during API call
    try {
      // Calls API to check if email exists and is valid for password reset
      await checkPasswordResetEmail({ email: formData.email });
      setStep('password'); // Moves to password reset step
      setSuccess('Email verified. Enter a new password to continue.');
    } catch (requestError) {
      // Extracts error message from multiple possible response formats
      const message =
        requestError.response?.data?.message ||
        requestError.response?.data?.errors?.[0]?.message ||
        requestError.response?.data?.errors?.[0]?.msg ||
        'Unable to verify that email address.';
      setError(message); // Displays user-friendly error message
    } finally {
      setIsSubmitting(false); // Re-enables button after API call completes
    }
  };

  // Submits new password after validation and completes the reset process
  // Step 2: Validates password requirements and updates password
  const handlePasswordSubmit = async (event) => {
    event.preventDefault(); // Prevents default form submission
    setError(''); // Clears previous errors
    setSuccess(''); // Clears previous success messages
    
    // Client-side validation checks
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
      // Calls API to reset password with new credentials
      await resetPassword(formData);
      setSuccess('Password reset successful. Redirecting to login...');
      // Delayed navigation to show success message before redirect
      setTimeout(() => navigate('/login'), 900);
    } catch (requestError) {
      // Extracts error message from multiple possible response formats
      const message =
        requestError.response?.data?.message ||
        requestError.response?.data?.errors?.[0]?.message ||
        requestError.response?.data?.errors?.[0]?.msg ||
        'Unable to reset your password.';
      setError(message); // Displays user-friendly error message
    } finally {
      setIsSubmitting(false); // Re-enables button after API call completes
    }
  };

  // Renders the complete forgot password interface with two-step flow
  // Conditional rendering based on current step (email or password)
  return (
    <main className="auth-page auth-forgot-password">
      {/* Top navigation bar with branding and public links */}
      <PublicTopbar />
      
      {/* Main authentication card with showcase and form panel */}
      <section className="auth-card">
        {/* Left showcase panel with brand messaging and visual appeal */}
        <aside className="auth-showcase">
          <div className="showcase-copy">
            <p className="eyebrow">Account recovery</p>
            <h1>Get back to your travel plans without losing momentum.</h1>
            <p>
              Confirm your account email, choose a stronger password, and return
              to your saved trips.
            </p>
          </div>
          {/* Promotional card highlighting the password reset process */}
          <div className="showcase-card">
            <span>Password reset</span>
            <strong>Verify, update, continue</strong>
            <p>Your planner stays ready while you refresh account access.</p>
          </div>
        </aside>

        {/* Right panel with form content and authentication flow */}
        <section className="auth-panel" aria-labelledby="forgot-password-title">
          {/* Heading section with step-specific instructions */}
          <div className="auth-heading">
            <p className="eyebrow">Forgot password</p>
            <h2 id="forgot-password-title">Reset your password</h2>
            {/* Dynamic description based on current step */}
            <p>
              {step === 'email'
                ? 'Enter your email address so we can confirm your account.'
                : 'Create a new password for your account.'}
            </p>
          </div>

          {/* Conditional rendering: Email verification step */}
          {step === 'email' ? (
            <form className="auth-form" onSubmit={handleEmailSubmit}>
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

              {/* Error message display */}
              {error && <p className="form-error">{error}</p>}

              {/* Submit button with loading state */}
              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Checking email...' : 'Continue'}
              </button>
            </form>
          ) : (
            // Conditional rendering: Password reset step
            <form className="auth-form" onSubmit={handlePasswordSubmit}>
              <label>
                New password
                <div className="password-field">
                  <input
                    type={isPasswordVisible ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    placeholder="Enter a new password"
                    autoComplete="new-password"
                    required
                  />
                  {/* Password visibility toggle button */}
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

              <label>
                Confirm new password
                <div className="password-field">
                  <input
                    type={isConfirmPasswordVisible ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onFocus={() => setIsConfirmPasswordFocused(true)}
                    onBlur={() => setIsConfirmPasswordFocused(false)}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    required
                  />
                  {/* Confirm password visibility toggle button */}
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={isConfirmPasswordVisible ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => setIsConfirmPasswordVisible((current) => !current)}
                  >
                    {isConfirmPasswordVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>
                {/* Live password match confirmation message */}
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

              {/* Status messages for password reset attempt */}
              {error && <p className="form-error">{error}</p>}
              {success && <p className="form-success">{success}</p>}

              {/* Password reset submit button with loading state */}
              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Resetting password...' : 'Reset password'}
              </button>
            </form>
          )}

          {/* Success message shown after email verification */}
          {success && step === 'email' && <p className="form-success auth-status">{success}</p>}

          {/* Navigation link back to login page */}
          <p className="auth-switch">
            Remembered your password? <Link to="/login">Login</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

// Default export registers the primary value for route configuration
export default ForgotPasswordPage;
