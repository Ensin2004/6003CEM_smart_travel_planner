import { CalendarDays, CheckCircle2, CloudSun, Eye, EyeOff } from 'lucide-react';
import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../api/authApi';
import AuthContext from '../../context/authContext';

function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!formData.email.trim() || !formData.password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await login(formData);
      const result = response.data.data;
      const destination = result.user.role === 'admin' ? '/admin' : '/dashboard';

      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      localStorage.setItem('user', JSON.stringify(result.user));
      setUser(result.user);
      navigate(destination);
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        requestError.response?.data?.errors?.[0]?.msg ||
        'Invalid email or password.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page auth-login">
      <section className="auth-card">
        <aside className="auth-showcase">
          <Link className="auth-brand" to="/">
            <span>ST</span>
            Smart Travel Planner
          </Link>
          <div className="showcase-copy">
            <p className="eyebrow">Welcome back</p>
            <h1>Your travel workspace is ready.</h1>
            <p>Continue where you left off with plans, notes, and trip details in one place.</p>
            <div className="showcase-points" aria-label="Planner highlights">
              <span><CalendarDays size={16} /> Trips</span>
              <span><CloudSun size={16} /> Weather</span>
              <span><CheckCircle2 size={16} /> Checklist</span>
            </div>
          </div>
          <div className="showcase-card">
            <span>Workspace preview</span>
            <strong>Plan, compare, prepare</strong>
            <p>A simple overview of the tools available after signing in.</p>
          </div>
        </aside>

        <section className="auth-panel" aria-labelledby="login-title">
          <div className="auth-heading">
            <p className="eyebrow">Login</p>
            <h2 id="login-title">Access your planner</h2>
            <p>Enter your email and password to continue.</p>
          </div>

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

            <div className="form-row">
              <label className="check-label">
                <input type="checkbox" />
                Remember me
              </label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="auth-switch">
            New to Smart Travel Planner? <Link to="/register">Create account</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default LoginPage;
