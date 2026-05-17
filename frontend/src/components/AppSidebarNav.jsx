import { Link } from 'react-router-dom';

function AppSidebarLink({ item, active, onNavigate, parentActive }) {
  const ItemIcon = item.icon;

  return (
    <Link
      to={item.to}
      className={[
        item.children?.length ? 'sidebar-parent-item' : '',
        (active || parentActive) && 'active',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onNavigate}
    >
      <span>
        <ItemIcon size={17} aria-hidden="true" />
      </span>
      {item.label}
    </Link>
  );
}

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

export default AppSidebarNav;
