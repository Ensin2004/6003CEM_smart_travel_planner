import { Link, useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    localStorage.setItem('accessToken', 'mock-login-token');
    navigate('/dashboard');
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
            <h1>Return to your trips with everything in place.</h1>
            <p>
              Continue planning with saved destinations, weather notes, budgets, and
              checklists ready when you are.
            </p>
          </div>
          <div className="showcase-card">
            <span>Next trip</span>
            <strong>Tokyo itinerary</strong>
            <p>Weather preview, food notes, and packing checklist ready.</p>
          </div>
        </aside>

        <section className="auth-panel" aria-labelledby="login-title">
          <div className="auth-heading">
            <p className="eyebrow">Login</p>
            <h2 id="login-title">Access your planner</h2>
            <p>Mock login is enabled for now and will take you to the dashboard.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email address
              <input type="email" placeholder="you@example.com" autoComplete="email" />
            </label>

            <label>
              Password
              <input type="password" placeholder="Enter your password" autoComplete="current-password" />
            </label>

            <div className="form-row">
              <label className="check-label">
                <input type="checkbox" />
                Remember me
              </label>
              <a href="#reset">Forgot password?</a>
            </div>

            <button className="auth-submit" type="submit">
              Login
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
