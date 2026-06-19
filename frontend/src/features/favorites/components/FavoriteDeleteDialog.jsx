/**
 * FavoriteDeleteDialog requires explicit confirmation before destructive actions.
 */
import { LoaderCircle, Trash2, X } from 'lucide-react';

/**
 * FavoriteDeleteDialog component renders a confirmation modal for deleting a favorite item.
 * Requires explicit user confirmation before performing the destructive action.
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.favorite - The favorite item to be deleted
 * @param {string} props.favorite.title - The title of the favorite item
 * @param {boolean} props.isDeleting - Whether the delete operation is in progress
 * @param {Function} props.onCancel - Callback function to cancel the deletion
 * @param {Function} props.onConfirm - Callback function to confirm the deletion
 * @returns {JSX.Element|null} The rendered dialog or null if no favorite is provided
 */
function FavoriteDeleteDialog({ favorite, isDeleting, onCancel, onConfirm }) {
  // Return null when no favorite is selected to avoid rendering an empty dialog
  if (!favorite) return null;

  return (
    <div className="favorite-dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="favorite-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorite-delete-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Close button in the top-right corner */}
        <button className="favorite-dialog-close" type="button" aria-label="Close confirmation" onClick={onCancel}>
          <X size={19} aria-hidden="true" />
        </button>
        
        {/* Warning icon section */}
        <div className="favorite-dialog-icon">
          <Trash2 size={22} aria-hidden="true" />
        </div>
        
        {/* Confirmation message section */}
        <div>
          <span>Remove favourite</span>
          <h3 id="favorite-delete-title">Remove {favorite.title}?</h3>
          <p>This item will no longer appear in your saved favourites.</p>
        </div>
        
        {/* Action buttons row */}
        <div className="favorite-dialog-actions">
          {/* Cancel button - dismisses the dialog without deleting */}
          <button type="button" onClick={onCancel} disabled={isDeleting}>Cancel</button>
          
          {/* Confirm delete button - performs the deletion action */}
          <button className="danger" type="button" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? <LoaderCircle className="explore-spin" size={16} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
            {isDeleting ? 'Removing...' : 'Remove favourite'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default FavoriteDeleteDialog;
