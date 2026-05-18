import { Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { checkPasswordResetEmail, resetPassword } from '../../api/authApi';
import PublicTopbar from '../../components/PublicTopbar';
import { passwordRequirements } from './auth.validation';
import './AuthPage.css';

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

  const unmetPasswordRequirements = useMemo(
    () => passwordRequirements.filter((requirement) => !requirement.test(formData.password)),
    [formData.password]
  );
  const isConfirmPasswordFilled = formData.confirmPassword.length > 0;
  const doPasswordsMatch = formData.password === formData.confirmPassword;
  const shouldShowPasswordRequirements = isPasswordFocused && unmetPasswordRequirements.length > 0;
  const shouldShowPasswordMatchMessage = isConfirmPasswordFocused && isConfirmPasswordFilled;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      await checkPasswordResetEmail({ email: formData.email });
      setStep('password');
      setSuccess('Email verified. Enter a new password to continue.');
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        requestError.response?.data?.errors?.[0]?.message ||
        requestError.response?.data?.errors?.[0]?.msg ||
        'Unable to verify that email address.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!doPasswordsMatch) {
      setError('Passwords must match.');
      return;
    }

    if (unmetPasswordRequirements.length > 0) {
      setError('Please meet all password requirements.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(formData);
      setSuccess('Password reset successful. Redirecting to login...');
      setTimeout(() => navigate('/login'), 900);
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        requestError.response?.data?.errors?.[0]?.message ||
        requestError.response?.data?.errors?.[0]?.msg ||
        'Unable to reset your password.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page auth-forgot-password">
      <PublicTopbar />
      <section className="auth-card">
        <aside className="auth-showcase">
          <div className="showcase-copy">
            <p className="eyebrow">Account recovery</p>
            <h1>Get back to your travel plans without losing momentum.</h1>
            <p>
              Confirm your account email, choose a stronger password, and return
              to your saved trips.
            </p>
          </div>
          <div className="showcase-card">
            <span>Password reset</span>
            <strong>Verify, update, continue</strong>
            <p>Your planner stays ready while you refresh account access.</p>
          </div>
        </aside>

        <section className="auth-panel" aria-labelledby="forgot-password-title">
          <div className="auth-heading">
            <p className="eyebrow">Forgot password</p>
            <h2 id="forgot-password-title">Reset your password</h2>
            <p>
              {step === 'email'
                ? 'Enter your email address so we can confirm your account.'
                : 'Create a new password for your account.'}
            </p>
          </div>

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

              {error && <p className="form-error">{error}</p>}

              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Checking email...' : 'Continue'}
              </button>
            </form>
          ) : (
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
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    onClick={() => setIsPasswordVisible((current) => !current)}
                  >
                    {isPasswordVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>
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
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={isConfirmPasswordVisible ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => setIsConfirmPasswordVisible((current) => !current)}
                  >
                    {isConfirmPasswordVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>
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

              {error && <p className="form-error">{error}</p>}
              {success && <p className="form-success">{success}</p>}

              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Resetting password...' : 'Reset password'}
              </button>
            </form>
          )}

          {success && step === 'email' && <p className="form-success auth-status">{success}</p>}

          <p className="auth-switch">
            Remembered your password? <Link to="/login">Login</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default ForgotPasswordPage;
