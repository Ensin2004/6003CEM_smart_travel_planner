/**
 * Compare button.
 * Compact action lets cards and map details add places without changing page navigation.
 */
import { Check, GitCompareArrows, Plus } from 'lucide-react';
import useCompare from '../../hooks/useCompare';
import './CompareButton.css';

function CompareButton({ item, label = 'Compare', compact = false, className = '' }) {
  // Accesses the compare context to manage comparison state
  const compare = useCompare();
  
  // Determines whether the current item is already in the comparison basket
  const selected = compare?.isSelected(item);
  
  // Selects the appropriate icon based on selection state and compact mode
  const Icon = selected ? Check : compact ? Plus : GitCompareArrows;

  // Handles click event by adding item to comparison if not already selected
  const handleClick = (event) => {
    event.stopPropagation();
    if (!selected) {
      compare?.addItem(item);
    }
  };

  return (
    <button
      className={['compare-button', compact ? 'compare-button-compact' : '', selected ? 'is-selected' : '', className]
        .filter(Boolean)
        .join(' ')}
      type="button"
      aria-label={selected ? `${item?.name || 'Place'} selected for comparison` : `Add ${item?.name || 'place'} to comparison`}
      data-tooltip={selected ? 'Already selected' : 'Add to compare'}
      onClick={handleClick}
      disabled={selected}
    >
      <Icon size={compact ? 15 : 16} aria-hidden="true" />
      {!compact && <span>{selected ? 'Selected' : label}</span>}
    </button>
  );
}

export default CompareButton;
