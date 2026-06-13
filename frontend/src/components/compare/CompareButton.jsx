/**
 * Compare button.
 * Compact action lets cards and map details add places without changing page navigation.
 */
import { Check, GitCompareArrows, Plus } from 'lucide-react';
import useCompare from '../../hooks/useCompare';
import './CompareButton.css';

function CompareButton({ item, label = 'Compare', compact = false, className = '' }) {
  const compare = useCompare();
  const selected = compare?.isSelected(item);
  const Icon = selected ? Check : compact ? Plus : GitCompareArrows;

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
