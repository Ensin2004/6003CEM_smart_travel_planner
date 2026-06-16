/**
 * Login screen for returning users.
 * Handles local form validation, token storage, role-based navigation, and
 * email-verification recovery from the same submit flow.
 */
import { CalendarDays, CheckCircle2, CloudSun, Eye, EyeOff, MailWarning } from 'lucide-react';
import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, resendVerificationEmail } from '../../api/authApi';
import PublicTopbar from '../../components/PublicTopbar';
import AuthContext from '../../context/authContext';
import './AuthPage.css';

// LoginPage renders the main login interface and handles authentication
// Manages credential submission, token storage, and post-login navigation
function LoginPage() {
  // Navigation hook for redirecting after successful authentication
  const navigate = useNavigate();
  
  // Authentication context for setting user state across the application
  const { setUser } = useContext(AuthContext);

  // Form state is kept small because login needs only credentials plus verification-resend feedback.
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState(''); // Error message display
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevents double submission
  const [isPasswordVisible, setIsPasswordVisible] = useState(false); // Password visibility toggle
  const [verificationPrompt, setVerificationPrompt] = useState(null); // Email verification state
  const [resendStatus, setResendStatus] = useState(''); // Resend verification status message
  const [isResending, setIsResending] = useState(false); // Prevents multiple resend requests

  // Handles form input changes and updates form data state
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  // Handles login form submission with validation and API call
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevents default form submission
    setError(''); // Clears previous errors

    // Client-side validation for empty fields
    if (!formData.email.trim() || !formData.password) {
      setError('Please enter your email and password.');
      return; // Stops submission if fields are empty
    }

    setIsSubmitting(true); // Disables button during API call
    try {
      // Calls login API with email and password
      const response = await login(formData);
      const result = response.data.data;
      // Determines navigation destination based on user role
      const destination = result.user.role === 'admin' ? '/admin' : '/dashboard';

      // Tokens are stored after a successful login so axios interceptors can refresh later requests.
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      localStorage.setItem('user', JSON.stringify(result.user));
      setUser(result.user); // Updates global authentication state
      navigate(destination); // Redirects to appropriate dashboard
    } catch (requestError) {
      // Handles unverified email scenario - prompts for verification instead of generic error
      if (requestError.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        // Unverified accounts stay on the login page with a resend option instead of showing a generic error.
        setVerificationPrompt({
          email: requestError.response.data.email || formData.email,
          expiresAt: requestError.response.data.verificationExpiresAt,
          message: requestError.response.data.message,
        });
        setIsSubmitting(false); // Resets submission state before returning
        return;
      }

      // Extracts error message from multiple possible response formats
      const message =
        requestError.response?.data?.message ||
        requestError.response?.data?.errors?.[0]?.message ||
        requestError.response?.data?.errors?.[0]?.msg ||
        'Invalid email or password.';
      setError(message); // Displays user-friendly error message
    } finally {
      setIsSubmitting(false); // Re-enables button after API call completes
    }
  };

  // Handles resending verification email for unverified accounts
  const handleResendVerification = async () => {
    if (!verificationPrompt?.email) return; // Guards against missing email

    setIsResending(true); // Disables button during API call
    setResendStatus(''); // Clears previous status
    try {
      // Calls API to resend verification email
      const response = await resendVerificationEmail({ email: verificationPrompt.email });
      const result = response.data.data;
      // Updates expiration time in the verification prompt
      setVerificationPrompt((current) => ({
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

  // Renders the complete login interface with form and showcase
  return (
    <main className="auth-page auth-login">
      {/* Top navigation bar with branding and public links */}
      <PublicTopbar />
      
      {/* Main authentication card with showcase and form panel */}
      <section className="auth-card">
        {/* Left showcase panel with brand messaging and feature highlights */}
        <aside className="auth-showcase">
          <div className="showcase-copy">
            <p className="eyebrow">Welcome back</p>
            <h1>Your travel workspace is ready.</h1>
            <p>Continue where you left off with plans, notes, and trip details in one place.</p>
            {/* Feature highlights for returning users */}
            <div className="showcase-points" aria-label="Planner highlights">
              <span><CalendarDays size={16} /> Trips</span>
              <span><CloudSun size={16} /> Weather</span>
              <span><CheckCircle2 size={16} /> Checklist</span>
            </div>
          </div>
          {/* Promotional card about workspace tools */}
          <div className="showcase-card">
            <span>Workspace preview</span>
            <strong>Plan, compare, prepare</strong>
            <p>A simple overview of the tools available after signing in.</p>
          </div>
        </aside>

        {/* Right panel with login form */}
        <section className="auth-panel" aria-labelledby="login-title">
          <div className="auth-heading">
            <p className="eyebrow">Login</p>
            <h2 id="login-title">Access your planner</h2>
            <p>Enter your email and password to continue.</p>
          </div>

          {/* Login form with email and password fields */}
          <form className="auth-form" onSubmit={handleSubmit}>
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

            <label>
              Password
              <div className="password-field">
                <input
                  type={isPasswordVisible ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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
            </label>

            {/* Form row with remember me checkbox and forgot password link */}
            <div className="form-row">
              <label className="check-label">
                <input type="checkbox" />
                Remember me
              </label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            {/* Error message display */}
            {error && <p className="form-error">{error}</p>}

            {/* Login submit button with loading state */}
            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Navigation link to registration page for new users */}
          <p className="auth-switch">
            New to Smart Travel Planner? <Link to="/register">Create account</Link>
          </p>
        </section>
      </section>

      {/* Verification prompt modal for unverified email accounts */}
      {verificationPrompt && (
        <div className="auth-modal-backdrop" role="presentation">
          <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="login-verify-title">
            {/* Warning icon indicating verification needed */}
            <div className="auth-modal-icon warning">
              <MailWarning size={30} />
            </div>
            <h3 id="login-verify-title">Email verification needed</h3>
            <p>
              {verificationPrompt.message ||
                'Please verify your email before logging in. We sent a new verification link to your inbox.'}
            </p>
            <p>
              Check <strong>{verificationPrompt.email}</strong> and click the verification link.
            </p>
            {/* Shows verification link expiration time if available */}
            {verificationPrompt.expiresAt && (
              <p className="auth-modal-note">
                The newest link expires on {new Date(verificationPrompt.expiresAt).toLocaleString()}.
              </p>
            )}
            {/* Status message for resend operation */}
            {resendStatus && <p className="form-success">{resendStatus}</p>}
            
            {/* Modal action buttons */}
            <div className="auth-modal-actions">
              {/* Dismiss button */}
              <button
                type="button"
                className="auth-submit"
                onClick={() => {
                  setVerificationPrompt(null); // Closes modal
                  setResendStatus(''); // Clears resend status
                }}
              >
                OK
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
export default LoginPage;
