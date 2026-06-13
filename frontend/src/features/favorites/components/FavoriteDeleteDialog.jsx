/**
 * FavoriteDeleteDialog requires explicit confirmation before destructive actions.
 */
import { LoaderCircle, Trash2, X } from 'lucide-react';

function FavoriteDeleteDialog({ favorite, isDeleting, onCancel, onConfirm }) {
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
        <button className="favorite-dialog-close" type="button" aria-label="Close confirmation" onClick={onCancel}>
          <X size={19} aria-hidden="true" />
        </button>
        <div className="favorite-dialog-icon">
          <Trash2 size={22} aria-hidden="true" />
        </div>
        <div>
          <span>Remove favourite</span>
          <h3 id="favorite-delete-title">Remove {favorite.title}?</h3>
          <p>This item will no longer appear in your saved favourites.</p>
        </div>
        <div className="favorite-dialog-actions">
          <button type="button" onClick={onCancel} disabled={isDeleting}>Cancel</button>
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
