import {
  Bell,
  HelpCircle,
  LogOut,
  Menu,
  Settings,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  changeTranslateLanguage,
  DEFAULT_LANGUAGE,
  getAvailableLanguages,
  loadTranslateClient,
  refreshTranslatedContent,
} from '../api/languageApi';

function AppLayout({ role, menuItems }) {
  const isAdmin = role === 'admin';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE);
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const languagePickerRef = useRef(null);
  const availableLanguages = useMemo(() => getAvailableLanguages(), []);
  const activeLanguage =
    availableLanguages.find((language) => language.value === selectedLanguage) ?? availableLanguages[0];
  const mainMenuItems = menuItems.filter((item) => !item.bottom);
  const bottomMenuItems = menuItems.filter((item) => item.bottom);

  useEffect(() => {
    loadTranslateClient(DEFAULT_LANGUAGE).catch(() => {});
  }, []);

  useEffect(() => {
    refreshTranslatedContent();
  }, [selectedLanguage, isLanguagePickerOpen]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        languagePickerRef.current &&
        !languagePickerRef.current.contains(event.target)
      ) {
        setIsLanguagePickerOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsLanguagePickerOpen(false);
      }
    };

    if (isLanguagePickerOpen) {
      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLanguagePickerOpen]);

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language.value);
    setIsLanguagePickerOpen(false);
    changeTranslateLanguage(language.value);
  };

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
          <div className="language-picker ignore notranslate" ref={languagePickerRef} translate="no">
            <button
              className="language-trigger"
              type="button"
              aria-label="Select language"
              aria-haspopup="dialog"
              aria-expanded={isLanguagePickerOpen}
              translate="no"
              onClick={() => setIsLanguagePickerOpen((current) => !current)}
            >
              {activeLanguage.flagUrl && (
                <img
                  className="language-flag"
                  src={activeLanguage.flagUrl}
                  alt=""
                  aria-hidden="true"
                />
              )}
              <span className="language-label ignore notranslate" translate="no">
                {activeLanguage.label}
              </span>
            </button>

            {isLanguagePickerOpen && (
              <div
                className="language-popover ignore notranslate"
                role="dialog"
                aria-label="Available languages"
                translate="no"
              >
                <h2 className="language-popover-title">All Languages</h2>
                <div className="language-options-scroll">
                  <div className="language-grid">
                    {availableLanguages.map((language) => (
                      <button
                        className={`language-option ignore notranslate ${
                          selectedLanguage === language.value ? 'is-active' : ''
                        }`}
                        type="button"
                        key={language.value}
                        translate="no"
                        onClick={() => handleLanguageChange(language)}
                      >
                        {language.flagUrl && (
                          <img
                            className="language-flag"
                            src={language.flagUrl}
                            alt=""
                            aria-hidden="true"
                          />
                        )}
                        <span translate="no">{language.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

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
