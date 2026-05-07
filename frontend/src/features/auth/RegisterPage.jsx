import { Link, useNavigate } from 'react-router-dom';

function RegisterPage() {
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    localStorage.setItem('accessToken', 'mock-signup-token');
    navigate('/admin');
  };

  return (
    <main className="auth-page auth-register">
      <section className="auth-card">
        <aside className="auth-showcase">
          <Link className="auth-brand" to="/">
            <span>ST</span>
            Smart Travel Planner
          </Link>
          <div className="showcase-copy">
            <p className="eyebrow">Start planning</p>
            <h1>Create a calmer way to organize every trip.</h1>
            <p>
              Save destinations, preferences, checklists, and budget notes in a
              workspace made for real travel decisions.
            </p>
          </div>
          <div className="showcase-card">
            <span>Planning board</span>
            <strong>Weather, budget, notes</strong>
            <p>Bring the practical details together before departure.</p>
          </div>
        </aside>

        <section className="auth-panel" aria-labelledby="register-title">
          <div className="auth-heading">
            <p className="eyebrow">Sign up</p>
            <h2 id="register-title">Create your account</h2>
            <p>Mock signup is enabled for now and will take you to the dashboard.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Full name
              <input type="text" placeholder="Alex Tan" autoComplete="name" />
            </label>

            <label>
              Email address
              <input type="email" placeholder="you@example.com" autoComplete="email" />
            </label>

            <label>
              Password
              <input type="password" placeholder="Minimum 8 characters" autoComplete="new-password" />
            </label>

            <label>
              Travel style
              <select defaultValue="balanced">
                <option value="balanced">Balanced</option>
                <option value="culture">Culture focused</option>
                <option value="food">Food explorer</option>
                <option value="budget">Budget aware</option>
              </select>
            </label>

            <button className="auth-submit" type="submit">
              Sign up
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default RegisterPage;
