import {
  Bell,
  HelpCircle,
  LogOut,
  Menu,
  Settings,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

function AppLayout({ role, menuItems }) {
  const isAdmin = role === 'admin';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const mainMenuItems = menuItems.filter((item) => !item.bottom);
  const bottomMenuItems = menuItems.filter((item) => item.bottom);

  return (
    <div className={`app-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <header className="topbar">
        <button
          className="header-icon-button menu-toggle"
          type="button"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={isSidebarCollapsed}
          onClick={() => setIsSidebarCollapsed((current) => !current)}
        >
          <Menu size={19} aria-hidden="true" />
        </button>

        <Link className="topbar-brand" to={isAdmin ? '/admin' : '/dashboard'}>
          <span>ST</span>
          <div>
            <strong>Smart Travel Planner</strong>
            <small>{isAdmin ? 'Admin console' : 'Traveller workspace'}</small>
          </div>
        </Link>

        <div className="topbar-actions">
          <button className="header-icon-button" type="button" aria-label="Notifications">
            <Bell size={18} aria-hidden="true" />
          </button>
          <button className="header-icon-button" type="button" aria-label="Help">
            <HelpCircle size={18} aria-hidden="true" />
          </button>
          <button className="header-icon-button" type="button" aria-label="Settings">
            <Settings size={18} aria-hidden="true" />
          </button>
          <Link className="header-icon-button" to="/login" aria-label="Logout">
            <LogOut size={18} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>ST</span>
          <div>
            <strong>Smart Travel</strong>
            <small>{isAdmin ? 'Admin console' : 'Traveller workspace'}</small>
          </div>
        </div>

        <div className="sidebar-menu">
          <nav className="sidebar-nav" aria-label={`${role} navigation`}>
            {mainMenuItems.map((item) => (
              <NavLink to={item.to} end={item.end} key={item.to}>
                <span>
                  <item.icon size={17} aria-hidden="true" />
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <nav className="sidebar-nav sidebar-nav-bottom" aria-label={`${role} utility navigation`}>
            {bottomMenuItems.map((item) => (
              <NavLink to={item.to} end={item.end} key={item.to}>
                <span>
                  <item.icon size={17} aria-hidden="true" />
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <div className="workspace">
        <main className="main-panel">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
