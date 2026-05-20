import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import publicNavItems from './publicNavItems';
import './PublicTopbar.css';

function PublicTopbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isLandingPage = pathname === '/';

  const handleSectionClick = (event, sectionId) => {
    event.preventDefault();

    if (isLandingPage) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${sectionId}`);
      return;
    }

    navigate({ pathname: '/', hash: `#${sectionId}` });
  };

  return (
    <nav className="landing-nav public-topbar" aria-label="Main navigation">
      <Link className="brand-mark" to="/" aria-label="Smart Travel Planner home">
        <img className="brand-logo" src={logo} alt="" aria-hidden="true" />
      </Link>
      <div className="nav-links">
        {publicNavItems.map(([Icon, label, sectionId]) => (
          <a
            href={`/#${sectionId}`}
            key={sectionId}
            onClick={(event) => handleSectionClick(event, sectionId)}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </a>
        ))}
      </div>
      <div className="nav-actions">
        <Link to="/login">Login</Link>
        <Link className="nav-button" to="/register">
          Sign up
        </Link>
      </div>
    </nav>
  );
}

export default PublicTopbar;
