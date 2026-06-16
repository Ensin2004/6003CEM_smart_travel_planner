/**
 * App Sidebar Nav module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { Link } from 'react-router-dom';

// AppSidebarLink renders the main screen and handles nearby interactions.
function AppSidebarLink({ item, active, onNavigate, parentActive }) {
  const ItemIcon = item.icon;
  
  // Handles navigation clicks and passes the event to the parent handler
  const handleClick = (event) => {
    onNavigate?.(item, event);
  };
  
  return (
    <Link
      to={item.to}
      className={[
        item.children?.length ? 'sidebar-parent-item' : '',
        (active || parentActive) && 'active',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
    >
      <span>
        <ItemIcon size={17} aria-hidden="true" />
      </span>
      <span className="sidebar-link-label">{item.label}</span>
    </Link>
  );
}

// AppSidebarNav renders the main screen and handles nearby interactions.
function AppSidebarNav({ ariaLabel, items, isItemActive, isMenuItemActive, onNavigate }) {
  return (
    <nav className="sidebar-nav" aria-label={ariaLabel}>
      {items.map((item) => (
        <AppSidebarLink
          active={isItemActive(item)}
          item={item}
          key={item.to}
          onNavigate={onNavigate}
          parentActive={Boolean(item.children?.length && isMenuItemActive(item))}
        />
      ))}
    </nav>
  );
}

// Default export registers the primary value.
export default AppSidebarNav;
