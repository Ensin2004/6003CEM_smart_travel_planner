import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resendVerificationEmail, verifyEmail } from '../../api/authApi';
import PublicTopbar from '../../components/PublicTopbar';
import AuthContext from '../../context/authContext';
import './AuthPage.css';

function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useContext(AuthContext);
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Checking your verification link...');
  const [email, setEmail] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing. Please request a new verification email.');
        return;
      }

      try {
        const response = await verifyEmail({ token });
        const result = response.data.data;
        const destination = result.user.role === 'admin' ? '/admin' : '/dashboard';

        localStorage.setItem('accessToken', result.accessToken);
        localStorage.setItem('refreshToken', result.refreshToken);
        localStorage.setItem('user', JSON.stringify(result.user));
        setUser(result.user);
        setEmail(result.email);
        setStatus('success');
        setMessage(response.data.message || 'Email verified. Taking you to your dashboard...');
        navigate(destination, { replace: true });
      } catch (requestError) {
        setStatus('error');
        setMessage(
          requestError.response?.data?.message ||
            'Unable to verify this email link. Please request a new verification email.'
        );
      }
    };

    verify();
  }, [navigate, setUser, token]);

  const handleResend = async (event) => {
    event.preventDefault();
    setResendStatus('');

    if (!resendEmail.trim()) {
      setResendStatus('Please enter your email address.');
      return;
    }

    setIsResending(true);

    try {
      const response = await resendVerificationEmail({ email: resendEmail });
      setResendStatus(response.data.message || 'Verification email sent.');
    } catch (requestError) {
      setResendStatus(
        requestError.response?.data?.message ||
          'Unable to resend the verification email. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  const isSuccess = status === 'success';

  return (
    <main className="auth-page auth-login">
      <PublicTopbar />
      <section className="auth-card verify-card">
        <section className="auth-panel verify-panel" aria-labelledby="verify-title">
          <div className={`verify-status-icon ${isSuccess ? 'success' : status === 'error' ? 'error' : ''}`}>
            {status === 'verifying' && <RefreshCw size={34} />}
            {isSuccess && <CheckCircle2 size={34} />}
            {status === 'error' && <XCircle size={34} />}
          </div>
          <div className="auth-heading verify-heading">
            <p className="eyebrow">Email verification</p>
            <h2 id="verify-title">{isSuccess ? 'Your email is verified' : 'Verify your email'}</h2>
            <p>{message}</p>
            {email && <p className="verify-email">{email}</p>}
          </div>

          {isSuccess ? (
            <Link className="auth-submit auth-link-button" to="/dashboard">
              Continue
            </Link>
          ) : (
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
              {resendStatus && <p className="form-success">{resendStatus}</p>}
              <button className="auth-submit" type="submit" disabled={isResending}>
                {isResending ? 'Sending...' : 'Send new verification email'}
              </button>
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

export default VerifyEmailPage;
