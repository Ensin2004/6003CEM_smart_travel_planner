/**
 * App Layout module.
 * Exports and local helpers keep related behavior in a single module.
 */
import {
  Bell,
  Bot,
  ChevronDown,
  Heart,
  LoaderCircle,
  LogOut,
  Menu,
  Send,
  Settings,
  User,
  WalletCards,
  X,
} from 'lucide-react';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  changeTranslateLanguage,
  getAvailableLanguages,
  getSavedTranslateLanguage,
  loadTranslateClient,
  refreshTranslatedContent,
} from '../api/languageApi';
import { sendAiChatPrompt } from '../api/aiAssistantApi';
import logo from '../assets/logo.png';
import AppSidebarNav from '../components/AppSidebarNav';
import CompareTray from '../components/compare/CompareTray';
import SubmenuPanel from '../components/SubmenuPanel';
import AuthContext from '../context/authContext';
import CurrencyContext from '../context/currencyContext';
import './AppLayout.css';
// AppLayout renders the main screen and handles nearby interactions.
function AppLayout({ role, menuItems }) {
  const isAdmin = role === 'admin';
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useContext(AuthContext);
  const currency = useContext(CurrencyContext);
  const [collapsedSubmenuTo, setCollapsedSubmenuTo] = useState(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(() => getSavedTranslateLanguage());
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessages, setAiMessages] = useState([]);
  const [aiError, setAiError] = useState('');
  const [isAiSubmitting, setIsAiSubmitting] = useState(false);
  const languagePickerRef = useRef(null);
  const currencyPickerRef = useRef(null);
  const profileMenuRef = useRef(null);
  const availableLanguages = useMemo(() => getAvailableLanguages(), []);
  const activeLanguage =
    availableLanguages.find((language) => language.value === selectedLanguage) ?? availableLanguages[0];
  const availableCurrencies = currency?.currencies ?? [];
  const activeCurrency = currency?.activeCurrency ?? availableCurrencies[0];

  const mainMenuItems = menuItems.filter((item) => !item.bottom && !item.hidden && !item.header);
  const accountSettingsItem = menuItems.find((item) => item.bottom && item.children?.length && !item.hidden);
  const accountLogoutItem = menuItems.find((item) => item.action === 'logout' && !item.hidden);
  const bottomMenuItems = menuItems.filter(
    (item) => item.bottom && !item.hidden && !item.header && item !== accountSettingsItem && item !== accountLogoutItem
  );
  const headerMenuItems = menuItems.filter((item) => item.header && !item.hidden);
  const allMenuItems = [...mainMenuItems, ...bottomMenuItems, accountSettingsItem].filter(Boolean);
  const favouriteItem = headerMenuItems.find((item) => /favou?rite/i.test(item.label));
  const profileItem = accountSettingsItem?.children?.find((item) => /profile/i.test(item.label));
  const settingsDropdownItems = accountSettingsItem?.children?.filter((item) => item !== profileItem) ?? [];

  const displayName = user?.name || user?.email || (isAdmin ? 'Admin user' : 'Traveller');
  const displayRole = isAdmin ? 'Admin' : 'Traveller';
  const avatarUrl = user?.avatarUrl || user?.profileImage;
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
  const isSubmenuCollapsed = activeSubmenu?.to === collapsedSubmenuTo;

  const activeSubmenuItems = activeSubmenu?.children.map((child) => ({
    ...child,
    id: child.to,
  }));

  const activeSubmenuId = activeSubmenuItems?.find((child) => isItemActive(child, true))?.id;
  const closeMobileNav = () => setIsMobileNavOpen(false);
  const handleNavigate = (item, event) => {
    if (item.action === 'logout') {
      event.preventDefault();
      logout();
      navigate('/login', { replace: true });
    }

    closeMobileNav();
  };
  useEffect(() => {
    loadTranslateClient(selectedLanguage).catch(() => {});
  }, [selectedLanguage]);
  useEffect(() => {
    refreshTranslatedContent();
  }, [selectedLanguage, isLanguagePickerOpen]);
  useEffect(() => {
    const handlePointerDown = (event) => {
      const clickedOutsideLanguage =
        !languagePickerRef.current || !languagePickerRef.current.contains(event.target);
      const clickedOutsideCurrency =
        !currencyPickerRef.current || !currencyPickerRef.current.contains(event.target);
      const clickedOutsideProfile =
        !profileMenuRef.current || !profileMenuRef.current.contains(event.target);

      if (clickedOutsideLanguage) {
        setIsLanguagePickerOpen(false);
      }

      if (clickedOutsideCurrency) {
        setIsCurrencyPickerOpen(false);
      }

      if (clickedOutsideProfile) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsLanguagePickerOpen(false);
        setIsCurrencyPickerOpen(false);
        setIsProfileMenuOpen(false);
      }
    };

    if (isLanguagePickerOpen || isCurrencyPickerOpen || isProfileMenuOpen) {
      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
    }

    // Cleanup prevents state updates after component unmount.
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCurrencyPickerOpen, isLanguagePickerOpen, isProfileMenuOpen]);
  const handleLanguageChange = (language) => {
    setSelectedLanguage(language.value);
    setIsLanguagePickerOpen(false);
    changeTranslateLanguage(language.value);
  };
  const handleCurrencyChange = (currencyOption) => {
    currency?.changeCurrency(currencyOption.code);
    setIsCurrencyPickerOpen(false);
  };
  const handleProfileMenuNavigate = (item, event) => {
    handleNavigate(item, event);
    setIsProfileMenuOpen(false);
  };
  const handleSubmenuToggle = () => {
    if (!activeSubmenu) {
      return;
    }

    setCollapsedSubmenuTo((current) => (current === activeSubmenu.to ? null : activeSubmenu.to));
  };
  const openNewAiChat = () => {
    setAiPrompt('');
    setAiMessages([]);
    setAiError('');
    setIsAiChatOpen(true);
  };
  const handleAiFloatingClick = () => {
    if (isAiChatOpen) {
      setIsAiChatOpen(false);
      return;
    }

    openNewAiChat();
  };
  const handleAiChatSubmit = async (event) => {
    event.preventDefault();
    const prompt = aiPrompt.trim();

    if (!prompt || isAiSubmitting) {
      return;
    }

    setAiPrompt('');
    setAiError('');
    setIsAiSubmitting(true);
    const userMessage = { role: 'user', text: prompt };
    setAiMessages((currentMessages) => [...currentMessages, userMessage]);

    try {
      const response = await sendAiChatPrompt({
        prompt,
        page: currentUrl || location.pathname,
      });
      const reply = response.data.data.reply;
      const assistantMessage = {
        role: 'assistant',
        text: reply.answer,
        available: reply.available,
      };

      setAiMessages((currentMessages) => [...currentMessages, assistantMessage]);
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Unable to reach Gemini chat right now.';
      const assistantMessage = { role: 'assistant', text: message, available: false };

      setAiError(message);
      setAiMessages((currentMessages) => [...currentMessages, assistantMessage]);
    } finally {
      setIsAiSubmitting(false);
    }
  };
  return (
    <div
      className={[
        'app-shell',
        activeSubmenu ? 'has-submenu' : '',
        activeSubmenu && isSubmenuCollapsed ? 'submenu-collapsed' : '',
        isMobileNavOpen ? 'mobile-nav-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="topbar">
        {activeSubmenu && (
          <button
            className="header-icon-button menu-toggle"
            type="button"
            aria-label={isSubmenuCollapsed ? 'Expand submenu' : 'Collapse submenu'}
            aria-pressed={isSubmenuCollapsed}
            onClick={handleSubmenuToggle}
          >
            <Menu size={19} aria-hidden="true" />
          </button>
        )}

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
            <div className="currency-picker ignore notranslate" ref={currencyPickerRef} translate="no">
              <button
                className="currency-trigger"
                type="button"
                aria-label="Select currency"
                aria-haspopup="dialog"
                aria-expanded={isCurrencyPickerOpen}
                translate="no"
                onClick={() => {
                  setIsLanguagePickerOpen(false);
                  setIsProfileMenuOpen(false);
                  setIsCurrencyPickerOpen((current) => !current);
                }}
              >
                <WalletCards size={17} aria-hidden="true" />
                <span className="currency-code" translate="no">{activeCurrency?.code || 'USD'}</span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>

              {isCurrencyPickerOpen && (
                <div
                  className="currency-popover ignore notranslate"
                  role="dialog"
                  aria-label="Available currencies"
                  translate="no"
                >
                  <h2 className="currency-popover-title">All Currencies</h2>
                  {currency?.errorMessage && (
                    <p className="currency-helper" translate="no">{currency.errorMessage}</p>
                  )}
                  <div className="currency-options-scroll">
                    <div className="currency-grid">
                      {availableCurrencies.map((currencyOption) => (
                        <button
                          className={`currency-option ignore notranslate ${
                            currency?.selectedCurrency === currencyOption.code ? 'is-active' : ''
                          }`}
                          type="button"
                          key={currencyOption.code}
                          translate="no"
                          onClick={() => handleCurrencyChange(currencyOption)}
                        >
                          <strong translate="no">{currencyOption.code}</strong>
                          <span translate="no">{currencyOption.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="language-picker ignore notranslate" ref={languagePickerRef} translate="no">
            <button
              className="language-trigger"
              type="button"
              aria-label="Select language"
              aria-haspopup="dialog"
              aria-expanded={isLanguagePickerOpen}
              translate="no"
              onClick={() => {
                setIsCurrencyPickerOpen(false);
                setIsProfileMenuOpen(false);
                setIsLanguagePickerOpen((current) => !current);
              }}
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

          {favouriteItem && (
            <Link
              className="header-icon-button"
              to={favouriteItem.to}
              aria-label={favouriteItem.label}
            >
              <Heart size={18} aria-hidden="true" />
            </Link>
          )}

          <button className="header-icon-button" type="button" aria-label="Notifications">
            <Bell size={18} aria-hidden="true" />
          </button>

          <div className="profile-menu" ref={profileMenuRef}>
            <button
              className="profile-menu-trigger"
              type="button"
              aria-label="Open profile menu"
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
              onClick={() => {
                setIsCurrencyPickerOpen(false);
                setIsLanguagePickerOpen(false);
                setIsProfileMenuOpen((current) => !current);
              }}
            >
              <span className="profile-menu-avatar" aria-hidden="true">
                {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
              </span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>

            {isProfileMenuOpen && (
              <div className="profile-menu-popover" role="menu" aria-label="Profile menu">
                <div className="profile-menu-summary">
                  <span className="profile-menu-avatar profile-menu-avatar-large" aria-hidden="true">
                    {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
                  </span>
                  <div>
                    <strong>{displayName}</strong>
                    <small>{displayRole}</small>
                  </div>
                </div>

                <div className="profile-menu-list">
                  <Link
                    className="profile-menu-item"
                    to={profileItem?.to || accountSettingsItem?.to || (isAdmin ? '/admin/settings' : '/profile')}
                    role="menuitem"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    <User size={17} aria-hidden="true" />
                    <span>Profile</span>
                  </Link>

                  {accountSettingsItem && (
                    <Link
                      className="profile-menu-item"
                      to={accountSettingsItem.to}
                      role="menuitem"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <Settings size={17} aria-hidden="true" />
                      <span>Settings</span>
                    </Link>
                  )}

                  {settingsDropdownItems.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        className="profile-menu-subitem"
                        to={item.to}
                        key={item.to}
                        role="menuitem"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <ItemIcon size={15} aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}

                  {accountLogoutItem && (
                    <Link
                      className="profile-menu-item profile-menu-logout"
                      to={accountLogoutItem.to}
                      role="menuitem"
                      onClick={(event) => handleProfileMenuNavigate(accountLogoutItem, event)}
                    >
                      <LogOut size={17} aria-hidden="true" />
                      <span>Logout</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
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
          <div className="sidebar-menu">
            <AppSidebarNav
              ariaLabel={`${role} navigation`}
              isItemActive={isItemActive}
              isMenuItemActive={isMenuItemActive}
              items={mainMenuItems}
              onNavigate={handleNavigate}
            />

            <div className="sidebar-nav-bottom">
              <AppSidebarNav
                ariaLabel={`${role} utility navigation`}
                isItemActive={isItemActive}
                isMenuItemActive={isMenuItemActive}
                items={bottomMenuItems}
                onNavigate={handleNavigate}
              />
            </div>
          </div>
        </aside>

        {activeSubmenu && (
          <div className="sidebar-submenu-panel" aria-hidden={isSubmenuCollapsed}>
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

      {!isAdmin && (
        <>
          <CompareTray />

          <button
            className="app-ai-floating"
            type="button"
            aria-label="Ask AI"
            aria-expanded={isAiChatOpen}
            onClick={handleAiFloatingClick}
          >
            <Bot size={20} aria-hidden="true" />
            <span>Ask AI</span>
          </button>

          {isAiChatOpen && (
            <section className="app-ai-chat" aria-label="Gemini chat prompt">
              <div className="app-ai-chat-header">
                <div>
                  <span>Gemini chat</span>
                  <strong>Ask AI</strong>
                </div>
                <button type="button" onClick={() => setIsAiChatOpen(false)} aria-label="Close AI chat">
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              <div className="app-ai-chat-body" aria-live="polite">
                {aiMessages.length === 0 ? (
                  <p className="app-ai-chat-empty">Ask for help with itineraries, packing, documents, places, transport, or anything else in your trip.</p>
                ) : (
                  aiMessages.map((message, index) => (
                    <article
                      className={`app-ai-message ${message.role === 'user' ? 'is-user' : 'is-assistant'} ${message.available === false ? 'is-muted' : ''}`}
                      key={`${message.role}-${index}`}
                    >
                      <span>{message.role === 'user' ? 'You' : 'Gemini'}</span>
                      <p>{message.text}</p>
                    </article>
                  ))
                )}
                {isAiSubmitting && (
                  <article className="app-ai-message is-assistant">
                    <span>Gemini</span>
                    <p><LoaderCircle className="app-ai-spin" size={15} aria-hidden="true" /> Thinking...</p>
                  </article>
                )}
                {aiError && <p className="app-ai-error">{aiError}</p>}
              </div>

              <form className="app-ai-chat-form" onSubmit={handleAiChatSubmit}>
                <label>
                  <span className="sr-only">AI prompt</span>
                  <textarea
                    value={aiPrompt}
                    rows="3"
                    maxLength={2000}
                    placeholder="Ask Gemini about your trip..."
                    onChange={(event) => setAiPrompt(event.target.value)}
                  />
                </label>
                <button type="submit" disabled={!aiPrompt.trim() || isAiSubmitting}>
                  {isAiSubmitting ? <LoaderCircle className="app-ai-spin" size={17} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
                  Send
                </button>
              </form>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default AppLayout;
