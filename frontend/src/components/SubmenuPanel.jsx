/**
 * Submenu Panel module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { Link } from 'react-router-dom';

// SubmenuPanel renders the main screen and handles nearby interactions.
function SubmenuPanel({
  activeId,
  ariaLabel,
  className = '',
  items,
  mode = 'button',
  onItemSelect,
  onNavigate,
}) {
  return (
    <aside className={['submenu-panel', className].filter(Boolean).join(' ')} aria-label={ariaLabel}>
      {items.map((item) => {
        const ItemIcon = item.icon;
        const isActive = activeId === item.id;
        
        // Renders the icon and label together as the item content
        const content = (
          <>
            <ItemIcon size={18} aria-hidden="true" />
            {item.label}
          </>
        );

        // Renders as a router link when mode is 'link'
        if (mode === 'link') {
          return (
            <Link key={item.id} to={item.to} className={isActive ? 'active' : ''} onClick={onNavigate}>
              {content}
            </Link>
          );
        }
        
        // Renders as a button when mode is 'button' (default)
        return (
          <button
            key={item.id}
            type="button"
            className={isActive ? 'active' : ''}
            onClick={() => onItemSelect(item.id)}
          >
            {content}
          </button>
        );
      })}
    </aside>
  );
}

// Default export registers the primary value.
export default SubmenuPanel;
