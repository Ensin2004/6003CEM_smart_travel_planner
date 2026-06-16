/**
 * Dashboard topbar component.
 * Header actions use existing authenticated routes instead of local placeholder buttons.
 */
import { BookOpen, Compass, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDisplayName, getGreeting } from '../dashboard.utils';

/**
 * DashboardTopbar - Renders the dashboard header with greeting and action buttons
 * Displays personalized welcome message and provides navigation to key features
 */
function DashboardTopbar({ user }) {
  return (
    <header className="dashboard-topbar">
      {/* Greeting section with personalized user welcome */}
      <div>
        <h2>{getGreeting()}, {getDisplayName(user)}!</h2>
        <p>Here's an overview of your travel activity.</p>
      </div>
      
      {/* Action buttons for primary dashboard functions */}
      <div className="dashboard-actions">
        {/* Primary action - Create a new trip */}
        <Link className="dashboard-action primary" to="/trips">
          <Plus size={18} aria-hidden="true" />
          New Trip
        </Link>
        
        {/* Secondary action - Explore places discovery */}
        <Link className="dashboard-action" to="/explore">
          <Compass size={17} aria-hidden="true" />
          Explore Places
        </Link>
        
        {/* Secondary action - Access travel guide resource */}
        <Link className="dashboard-action" to="/travel-guide">
          <BookOpen size={17} aria-hidden="true" />
          Travel Guide
        </Link>
      </div>
    </header>
  );
}

export default DashboardTopbar;
