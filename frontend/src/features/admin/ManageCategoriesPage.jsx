/**
 * Admin category management page.
 */
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  Save,
  Search,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '../../api/categoryApi';
import './ManageCategoriesPage.css';

const typeOptions = [
  { value: 'hotel', label: 'Hotel', example: 'Boutique hotel' },
  { value: 'attraction', label: 'Attraction', example: 'Art museum' },
  { value: 'food', label: 'Food', example: 'Japanese cuisine' },
];
const categoriesPerPage = 10;

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.response?.data?.errors?.[0]?.message ||
  'Unable to save category changes.';

const formatDateAdded = (value) => {
  if (!value) return 'Date unavailable';

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
  }).format(new Date(value));
};

function ManageCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ type: 'hotel', name: '' });
  const [activeType, setActiveType] = useState('hotel');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getCategories();
      setCategories(response.data?.data?.categories || []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadCategories, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadCategories]);

  const categoryCounts = useMemo(
    () =>
      categories.reduce(
        (counts, category) => ({
          ...counts,
          [category.type]: (counts[category.type] || 0) + 1,
        }),
        {}
      ),
    [categories]
  );
  const activeTypeOption =
    typeOptions.find((type) => type.value === activeType) || typeOptions[0];
  const filteredCategories = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return categories.filter(
      (category) =>
        category.type === activeType &&
        (!normalizedQuery || category.name.toLowerCase().includes(normalizedQuery))
    );
  }, [activeType, categories, searchQuery]);
  const totalPages = Math.max(Math.ceil(filteredCategories.length / categoriesPerPage), 1);
  const activePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (activePage - 1) * categoriesPerPage;
  const paginatedCategories = filteredCategories.slice(
    pageStartIndex,
    pageStartIndex + categoriesPerPage
  );
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  const resetAddForm = () => {
    setForm({ type: activeType, name: '' });
  };

  const selectType = (type) => {
    setActiveType(type);
    setSearchQuery('');
    setCurrentPage(1);
    setForm({ type, name: '' });
    setError('');
    setSuccessMessage('');
    setDeleteMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccessMessage('');
    setDeleteMessage('');
    try {
      await createCategory(form);
      setSuccessMessage('Category added.');
      resetAddForm();
      await loadCategories();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setError('');
    setSuccessMessage('');
    setDeleteMessage('');
  };

  const closeEditDialog = () => {
    if (isEditing) return;
    setEditingCategory(null);
    setEditName('');
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingCategory) return;

    setIsEditing(true);
    setError('');
    setSuccessMessage('');
    setDeleteMessage('');
    try {
      await updateCategory(editingCategory.id || editingCategory._id, {
        type: editingCategory.type,
        name: editName,
      });
      setSuccessMessage('Category updated.');
      setEditingCategory(null);
      setEditName('');
      await loadCategories();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsEditing(false);
    }
  };

  const requestDelete = (category) => {
    setCategoryToDelete(category);
    setError('');
    setSuccessMessage('');
    setDeleteMessage('');
  };

  const closeDeleteDialog = () => {
    if (deletingId) return;
    setCategoryToDelete(null);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    const categoryId = categoryToDelete.id || categoryToDelete._id;
    setDeletingId(categoryId);
    setError('');
    setSuccessMessage('');
    setDeleteMessage('');
    try {
      await deleteCategory(categoryId);
      setCategories((current) =>
        current.filter((item) => (item.id || item._id) !== categoryId)
      );
      setCategoryToDelete(null);
      setDeleteMessage('Category deleted.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDeletingId('');
    }
  };

  return (
    <section className="manage-categories-page" aria-labelledby="manage-categories-title">
      <header className="manage-categories-hero">
        <div>
          <p className="eyebrow">Explore content</p>
          <h2 id="manage-categories-title">Manage Category</h2>
          <p>Add, rename, or remove the categories shown in hotel, attraction, and food searches.</p>
        </div>
        <span><Tags size={22} aria-hidden="true" /> {categories.length} categories</span>
      </header>

      {error && <p className="form-error manage-categories-status">{error}</p>}
      {successMessage && <p className="form-success manage-categories-status">{successMessage}</p>}
      {deleteMessage && (
        <p className="manage-categories-delete-status manage-categories-status">{deleteMessage}</p>
      )}

      <form className="manage-categories-form" onSubmit={handleSubmit}>
        <div className="manage-categories-form-heading">
          <Plus size={20} aria-hidden="true" />
          <div>
            <span>New category</span>
          </div>
        </div>
        <label>
          Category name
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder={`Example: ${activeTypeOption.example}`}
            minLength={2}
            maxLength={80}
            required
          />
        </label>
        <div className="manage-categories-form-actions">
          <button type="submit" className="manage-categories-save" disabled={isSaving}>
            <Save size={16} aria-hidden="true" />
            {isSaving ? 'Saving...' : 'Add category'}
          </button>
        </div>
      </form>

      <section className="manage-categories-group">
        <div className="manage-categories-tabs" role="tablist" aria-label="Category types">
          {typeOptions.map((type) => (
            <button
              className={activeType === type.value ? 'active' : ''}
              key={type.value}
              type="button"
              role="tab"
              aria-selected={activeType === type.value}
              onClick={() => selectType(type.value)}
            >
              {type.label}
              <span>{categoryCounts[type.value] || 0}</span>
            </button>
          ))}
        </div>
        <div className="manage-categories-group-heading">
          <div>
            <span>{activeTypeOption.label}</span>
            <h3>{activeTypeOption.label} categories</h3>
          </div>
          <label className="manage-categories-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search category name</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search category name"
            />
          </label>
        </div>
        {isLoading ? (
          <p className="settings-empty">Loading categories...</p>
        ) : filteredCategories.length === 0 ? (
          <p className="settings-empty">
            {searchQuery.trim() ? 'No matching categories found.' : 'No categories added yet.'}
          </p>
        ) : (
          <>
            <div className="manage-categories-list">
              {paginatedCategories.map((category) => (
                <article key={category.id || category._id}>
                  <div>
                    <strong>{category.name}</strong>
                    <small>Date added: {formatDateAdded(category.createdAt)}</small>
                  </div>
                  <div className="manage-categories-row-actions">
                    <button type="button" onClick={() => startEditing(category)}>
                      <Edit3 size={15} aria-hidden="true" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete(category)}
                      disabled={deletingId === (category.id || category._id)}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      {deletingId === (category.id || category._id) ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <nav className="manage-categories-pagination" aria-label="Category pages">
              <span>
                Showing {pageStartIndex + 1}-
                {Math.min(pageStartIndex + categoriesPerPage, filteredCategories.length)} of{' '}
                {filteredCategories.length}
              </span>
              <div>
                <button
                  type="button"
                  onClick={() => setCurrentPage(activePage - 1)}
                  disabled={activePage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                {pageNumbers.map((pageNumber) => (
                  <button
                    className={pageNumber === activePage ? 'active' : ''}
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    aria-label={`Page ${pageNumber}`}
                    aria-current={pageNumber === activePage ? 'page' : undefined}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage(activePage + 1)}
                  disabled={activePage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </nav>
          </>
        )}
      </section>

      {editingCategory && (
        <div className="manage-categories-dialog-backdrop" role="presentation" onMouseDown={closeEditDialog}>
          <form
            className="manage-categories-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-category-title"
            onSubmit={handleEditSubmit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="manage-categories-dialog-heading">
              <span className="manage-categories-dialog-icon manage-categories-dialog-icon-edit">
                <Edit3 size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="eyebrow">Edit category</p>
                <h3 id="edit-category-title">Update category name</h3>
              </div>
              <button type="button" onClick={closeEditDialog} disabled={isEditing} aria-label="Close">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <label>
              Category name
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                minLength={2}
                maxLength={80}
                required
                autoFocus
              />
            </label>
            <div className="manage-categories-dialog-actions">
              <button type="button" onClick={closeEditDialog} disabled={isEditing}>Cancel</button>
              <button type="submit" disabled={isEditing}>
                {isEditing ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {categoryToDelete && (
        <div className="manage-categories-dialog-backdrop" role="presentation" onMouseDown={closeDeleteDialog}>
          <div
            className="manage-categories-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="manage-categories-dialog-heading">
              <span className="manage-categories-dialog-icon manage-categories-dialog-icon-delete">
                <Trash2 size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="eyebrow">Delete category</p>
                <h3 id="delete-category-title">Delete {categoryToDelete.name}?</h3>
              </div>
              <button type="button" onClick={closeDeleteDialog} disabled={Boolean(deletingId)} aria-label="Close">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="manage-categories-dialog-copy">
              This category will be permanently removed and will no longer appear in Explore filters.
            </p>
            <div className="manage-categories-dialog-actions">
              <button type="button" onClick={closeDeleteDialog} disabled={Boolean(deletingId)}>Cancel</button>
              <button
                className="manage-categories-dialog-delete"
                type="button"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
              >
                {deletingId ? 'Deleting...' : 'Delete category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ManageCategoriesPage;
