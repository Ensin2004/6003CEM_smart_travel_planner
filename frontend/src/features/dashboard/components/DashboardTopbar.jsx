/**
 * Dashboard topbar component.
 * Header actions use existing authenticated routes instead of local placeholder buttons.
 */
import { BookOpen, Compass, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDisplayName, getGreeting } from '../dashboard.utils';

function DashboardTopbar({ user }) {
  return (
    <header className="dashboard-topbar">
      <div>
        <h2>{getGreeting()}, {getDisplayName(user)}!</h2>
        <p>Here's an overview of your travel activity.</p>
      </div>
      <div className="dashboard-actions">
        <Link className="dashboard-action primary" to="/trips">
          <Plus size={18} aria-hidden="true" />
          New Trip
        </Link>
        <Link className="dashboard-action" to="/explore">
          <Compass size={17} aria-hidden="true" />
          Explore Places
        </Link>
        <Link className="dashboard-action" to="/travel-guide">
          <BookOpen size={17} aria-hidden="true" />
          Travel Guide
        </Link>
      </div>
    </header>
  );
}

export default DashboardTopbar;
