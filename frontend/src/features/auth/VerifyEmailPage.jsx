/**
 * Auth module.
 * Page state, event handlers, and render sections define the screen experience.
 * Handles email verification with automatic login and resend functionality.
 */
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resendVerificationEmail, verifyEmail } from '../../api/authApi';
import PublicTopbar from '../../components/PublicTopbar';
import AuthContext from '../../context/authContext';
import './AuthPage.css';

// VerifyEmailPage renders the main screen and handles nearby interactions.
// Main component for email verification with token validation and automatic authentication
function VerifyEmailPage() {
  // Navigation hook for redirecting after successful verification
  const navigate = useNavigate();
  
  // Hook for accessing URL query parameters (token)
  const [searchParams] = useSearchParams();
  
  // Authentication context for setting user state
  const { setUser } = useContext(AuthContext);
  
  // Extracts verification token from URL parameters
  const token = searchParams.get('token');

  // State management for verification status and messages
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('Checking your verification link...');
  const [email, setEmail] = useState(''); // Stores verified email for display

  // State management for resend verification functionality
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [isResending, setIsResending] = useState(false);

  // Effect hook that runs once when component mounts to process verification
  useEffect(() => {
    // Async function to handle the verification process
    const verify = async () => {
      // Validates that a token exists in the URL
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing. Please request a new verification email.');
        return; // Stops execution if token is missing
      }

      try {
        // Calls API to verify the email with the provided token
        const response = await verifyEmail({ token });
        const result = response.data.data;
        // Determines navigation destination based on user role
        const destination = result.user.role === 'admin' ? '/admin' : '/dashboard';

        // Stores authentication tokens and user data in localStorage
        localStorage.setItem('accessToken', result.accessToken);
        localStorage.setItem('refreshToken', result.refreshToken);
        localStorage.setItem('user', JSON.stringify(result.user));
        setUser(result.user); // Updates global authentication state
        setEmail(result.email); // Stores email for display
        setStatus('success'); // Updates status to success
        setMessage(response.data.message || 'Email verified. Taking you to your dashboard...');
        // Navigates to dashboard and replaces the current history entry
        navigate(destination, { replace: true });
      } catch (requestError) {
        // Handles verification failure
        setStatus('error');
        setMessage(
          requestError.response?.data?.message ||
            'Unable to verify this email link. Please request a new verification email.'
        );
      }
    };

    // Executes the verification process
    verify();
    // Dependency array ensures effect runs only once on mount
  }, [navigate, setUser, token]);

  // Handles resending verification email
  const handleResend = async (event) => {
    event.preventDefault(); // Prevents default form submission
    setResendStatus(''); // Clears previous status

    // Validates that an email address is entered
    if (!resendEmail.trim()) {
      setResendStatus('Please enter your email address.');
      return; // Stops submission if email is empty
    }

    setIsResending(true); // Disables button during API call
    try {
      // Calls API to resend verification email
      const response = await resendVerificationEmail({ email: resendEmail });
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

  // Determines if verification was successful
  const isSuccess = status === 'success';

  // Renders the complete email verification interface
  return (
    <main className="auth-page auth-login">
      {/* Top navigation bar with branding and public links */}
      <PublicTopbar />
      
      {/* Simplified authentication card for verification */}
      <section className="auth-card verify-card">
        {/* Single panel verification layout */}
        <section className="auth-panel verify-panel" aria-labelledby="verify-title">
          {/* Status icon with dynamic styling based on verification state */}
          <div className={`verify-status-icon ${isSuccess ? 'success' : status === 'error' ? 'error' : ''}`}>
            {/* Show spinning refresh icon during verification */}
            {status === 'verifying' && <RefreshCw size={34} />}
            {/* Show checkmark on success */}
            {isSuccess && <CheckCircle2 size={34} />}
            {/* Show error icon on failure */}
            {status === 'error' && <XCircle size={34} />}
          </div>
          
          {/* Heading section with dynamic title and message */}
          <div className="auth-heading verify-heading">
            <p className="eyebrow">Email verification</p>
            <h2 id="verify-title">{isSuccess ? 'Your email is verified' : 'Verify your email'}</h2>
            <p>{message}</p>
            {/* Shows verified email address if available */}
            {email && <p className="verify-email">{email}</p>}
          </div>

          {/* Conditional rendering based on verification status */}
          {isSuccess ? (
            // Success state: Show continue button to dashboard
            <Link className="auth-submit auth-link-button" to="/dashboard">
              Continue
            </Link>
          ) : (
            // Error state: Show resend verification form
            <form className="auth-form verify-resend-form" onSubmit={handleResend}>
              <label>
                Email address
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(event) => setResendEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>
              {/* Status message for resend operation */}
              {resendStatus && <p className="form-success">{resendStatus}</p>}
              {/* Resend button with loading state */}
              <button className="auth-submit" type="submit" disabled={isResending}>
                {isResending ? 'Sending...' : 'Send new verification email'}
              </button>
              {/* Navigation link to login page */}
              <p className="auth-switch">
                Already verified? <Link to="/login">Login</Link>
              </p>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}

// Default export registers the primary value for route configuration
export default VerifyEmailPage;
