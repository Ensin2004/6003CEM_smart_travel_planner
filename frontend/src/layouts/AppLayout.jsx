import {
  Bell,
  ChevronDown,
  Menu,
  WalletCards,
  X,
} from 'lucide-react';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  changeTranslateLanguage,
  DEFAULT_LANGUAGE,
  getAvailableLanguages,
  loadTranslateClient,
  refreshTranslatedContent,
} from '../api/languageApi';
import logo from '../assets/logo.png';
import AppSidebarNav from '../components/AppSidebarNav';
import SubmenuPanel from '../components/SubmenuPanel';
import AuthContext from '../context/authContext';
import './AppLayout.css';

function AppLayout({ role, menuItems }) {
  const isAdmin = role === 'admin';
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE);
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const languagePickerRef = useRef(null);

  const availableLanguages = useMemo(() => getAvailableLanguages(), []);
  const activeLanguage =
    availableLanguages.find((language) => language.value === selectedLanguage) ?? availableLanguages[0];

  const mainMenuItems = menuItems.filter((item) => !item.bottom);
  const bottomMenuItems = menuItems.filter((item) => item.bottom);
  const allMenuItems = [...mainMenuItems, ...bottomMenuItems];

  const displayName = user?.name || user?.email || (isAdmin ? 'Admin user' : 'Traveller');
  const displayRole = isAdmin ? 'Admin' : 'Traveller';

  const initials = useMemo(
    () =>
      displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase(),
    [displayName]
  );

  const currentUrl = `${location.pathname}${location.search}${location.hash}`;

  const isItemActive = (item, isExactMatch = false) => {
    const itemUrl = item.to;
    const [itemPath] = itemUrl.split(/[?#]/);

    if (isExactMatch || itemUrl.includes('?') || itemUrl.includes('#')) {
      if (!location.hash && itemUrl.endsWith('#profile')) {
        return location.pathname === itemPath;
      }

      return currentUrl === itemUrl;
    }

    return item.end ? location.pathname === itemPath : location.pathname.startsWith(itemPath);
  };

  const isMenuItemActive = (item) =>
    isItemActive(item) || item.children?.some((child) => isItemActive(child, true));

  const activeSubmenu = allMenuItems.find(
    (item) => item.children?.length && isMenuItemActive(item)
  );

  const activeSubmenuItems = activeSubmenu?.children.map((child) => ({
    ...child,
    id: child.to,
  }));

  const activeSubmenuId = activeSubmenuItems?.find((child) => isItemActive(child, true))?.id;

  const closeMobileNav = () => setIsMobileNavOpen(false);

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
    <div
      className={[
        'app-shell',
        activeSubmenu ? 'has-submenu' : '',
        isSidebarCollapsed ? 'sidebar-collapsed' : '',
        isMobileNavOpen ? 'mobile-nav-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
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

        <button
          className="header-icon-button mobile-menu-button"
          type="button"
          aria-label={isMobileNavOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileNavOpen}
          onClick={() => setIsMobileNavOpen((current) => !current)}
        >
          {isMobileNavOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
        </button>

        <Link className="topbar-brand" to={isAdmin ? '/admin' : '/dashboard'}>
          <img className="brand-logo app-brand-logo" src={logo} alt="" aria-hidden="true" />
        </Link>

        <div className="topbar-actions">
          {!isAdmin && (
            <button className="header-action-button" type="button">
              <WalletCards size={17} aria-hidden="true" />
              Currency converter
              <ChevronDown size={15} aria-hidden="true" />
            </button>
          )}

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
        </div>
      </header>

      <button
        className="mobile-nav-overlay"
        type="button"
        aria-label="Close menu"
        onClick={closeMobileNav}
      />

      <div className="app-navigation">
        <aside className="sidebar">
          <div className="sidebar-profile">
            <div className="sidebar-avatar" aria-hidden="true">
              {user?.profileImage ? <img src={user.profileImage} alt="" /> : initials}
            </div>
            <div>
              <strong>{displayName}</strong>
              <small>{displayRole}</small>
            </div>
          </div>

          <div className="sidebar-menu">
            <AppSidebarNav
              ariaLabel={`${role} navigation`}
              isSidebarCollapsed={isSidebarCollapsed}
              isItemActive={isItemActive}
              isMenuItemActive={isMenuItemActive}
              items={mainMenuItems}
              onNavigate={closeMobileNav}
            />

            <div className="sidebar-nav-bottom">
              <AppSidebarNav
                ariaLabel={`${role} utility navigation`}
                isSidebarCollapsed={isSidebarCollapsed}
                isItemActive={isItemActive}
                isMenuItemActive={isMenuItemActive}
                items={bottomMenuItems}
                onNavigate={closeMobileNav}
              />
            </div>
          </div>
        </aside>

        {activeSubmenu && (
          <div className="sidebar-submenu-panel">
            <SubmenuPanel
              activeId={activeSubmenuId}
              ariaLabel={`${activeSubmenu.label} submenu`}
              items={activeSubmenuItems}
              mode="link"
              onNavigate={closeMobileNav}
            />
          </div>
        )}
      </div>

      <div className="workspace">
        <main className="main-panel">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
