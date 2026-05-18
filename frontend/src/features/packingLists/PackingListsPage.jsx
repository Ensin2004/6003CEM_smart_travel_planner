import {
  Bell,
  Bot,
  BriefcaseBusiness,
  Copy,
  Edit3,
  FileText,
  Laptop,
  Luggage,
  Pill,
  Plus,
  Shirt,
  Search,
  Sparkles,
  Utensils,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  addPackingItem,
  createPackingList,
  deletePackingItem,
  deletePackingList,
  duplicatePackingList,
  getPackingLists,
  getPackingListTemplates,
  updatePackingList,
  updatePackingItem,
} from '../../api/packingListApi';
import { getMe } from '../../api/userApi';
import {
  defaultPackingCategory,
  defaultPriorityLevel,
  formatPackingCategory,
  formatPriorityLevel,
  getPriorityClassName,
  packingCategories,
  priorityLevels,
} from './packingList.constants';
import './PackingListsPage.css';

const emptyItemForm = {
  name: '',
  category: defaultPackingCategory,
  priority: defaultPriorityLevel,
  quantity: 1,
};

const getErrorMessage = (error) =>
  error.response?.data?.message || 'Unable to update packing lists right now.';

const categoryIcons = {
  clothes: Shirt,
  toiletries: Luggage,
  electronics: Laptop,
  documents: FileText,
  medicine: Pill,
  food: Utensils,
  'travel essentials': BriefcaseBusiness,
  other: Sparkles,
};

const getCategoryIcon = (category) => categoryIcons[category] || Luggage;

const normalizePackingListForUi = (packingList) => ({
  ...packingList,
  items: (packingList.items || []).map((item) => ({
    ...item,
    priority: formatPriorityLevel(item.priority),
  })),
});

function PackingListsPage() {
  const [packingLists, setPackingLists] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createMode, setCreateMode] = useState('manual');
  const [createForm, setCreateForm] = useState({
    title: '',
    templateKey: '',
  });
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [itemFormError, setItemFormError] = useState('');
  const [itemModalMode, setItemModalMode] = useState('');
  const [editingItemId, setEditingItemId] = useState('');
  const [isEditingListTitle, setIsEditingListTitle] = useState(false);
  const [listTitleDraft, setListTitleDraft] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [notificationPreferences, setNotificationPreferences] = useState({
    notificationsOff: false,
    packingReminder: true,
  });
  const [reminderDays, setReminderDays] = useState(2);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    packed: '',
    priority: '',
  });

  const selectedList = useMemo(
    () => packingLists.find((list) => list._id === selectedListId) || packingLists[0],
    [packingLists, selectedListId]
  );

  const progress = selectedList?.progress || {
    packedItems: selectedList?.items?.filter((item) => item.isPacked).length || 0,
    totalItems: selectedList?.items?.length || 0,
    percent: 0,
  };

  const unpackedImportantCount = useMemo(
    () =>
      selectedList?.items?.filter(
        (item) => !item.isPacked && item.priority === 'High'
      ).length || 0,
    [selectedList]
  );
  
  const isPackingReminderEnabled =
    !notificationPreferences.notificationsOff && notificationPreferences.packingReminder !== false;

  const filteredItems = useMemo(() => {
    const items = selectedList?.items || [];
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(filters.search.toLowerCase().trim());
      const matchesCategory = !filters.category || item.category === filters.category;
      const matchesPriority = !filters.priority || item.priority === filters.priority;
      const matchesPacked =
        !filters.packed ||
        (filters.packed === 'packed' && item.isPacked) ||
        (filters.packed === 'unpacked' && !item.isPacked);

      return matchesSearch && matchesCategory && matchesPriority && matchesPacked;
    });
  }, [filters, selectedList]);

  useEffect(() => {
    let isMounted = true;

    const loadPackingLists = async () => {
      try {
        const [listsResponse, templatesResponse, profileResponse] = await Promise.all([
          getPackingLists(),
          getPackingListTemplates(),
          getMe().catch(() => ({ data: { data: { user: {} } } })),
        ]);

        if (!isMounted) return;

        const nextLists = (listsResponse.data.data.packingLists || []).map(normalizePackingListForUi);
        const preferences = profileResponse.data.data.user.notificationPreferences || {};

        setPackingLists(nextLists);
        setTemplates(templatesResponse.data.data.templates || []);
        setNotificationPreferences({
          notificationsOff: Boolean(preferences.notificationsOff),
          packingReminder: preferences.packingReminder !== false,
        });
        setReminderDays(nextLists[0]?.reminder?.daysBeforeTrip ?? 2);
        setSelectedListId((current) => current || nextLists[0]?._id || '');
        setError('');
      } catch (requestError) {
        if (isMounted) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPackingLists();

    return () => {
      isMounted = false;
    };
  }, []);

  const replaceList = (updatedList) => {
    const normalizedList = normalizePackingListForUi(updatedList);
    setPackingLists((current) =>
      current.map((list) => (list._id === normalizedList._id ? normalizedList : list))
    );
  };

  const closeItemModal = () => {
    setItemModalMode('');
    setEditingItemId('');
    setItemForm(emptyItemForm);
    setItemFormError('');
  };

  const handleCreateList = async (event) => {
    event.preventDefault();

    if (!createForm.title.trim()) {
      setError('Enter a packing list title.');
      return;
    }

    if (createMode === 'template' && !createForm.templateKey) {
      setError('Choose a template to create this list.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload = {
        title: createForm.title.trim(),
        ...(createMode === 'template' ? { templateKey: createForm.templateKey } : {}),
      };
      const response = await createPackingList(payload);
      const packingList = normalizePackingListForUi(response.data.data.packingList);

      setPackingLists((current) => [packingList, ...current]);
      setSelectedListId(packingList._id);
      setCreateForm({ title: '', templateKey: '' });
      setCreateMode('manual');
      setSuccessMessage('Packing list created.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setCreateMode('template');
    setCreateForm({
      title: template.title,
      templateKey: template.key,
    });
  };

  const handleTemplateDropdownChange = (event) => {
    const templateKey = event.target.value;
    const template = templates.find((candidate) => candidate.key === templateKey);

    setCreateForm((current) => ({
      ...current,
      title: template?.title || current.title,
      templateKey,
    }));
  };

  const handleItemFormChange = (event) => {
    const { name, value } = event.target;
    setItemFormError('');
    setItemForm((current) => ({
      ...current,
      [name]: name === 'quantity' ? Number(value) : value,
    }));
  };

  const handleOpenAddItem = () => {
    setItemForm(emptyItemForm);
    setEditingItemId('');
    setItemModalMode('add');
    setItemFormError('');
    setSuccessMessage('');
  };

  const handleEditItem = (item) => {
    setEditingItemId(item._id);
    setItemForm({
      name: item.name,
      category: item.category,
      priority: item.priority,
      quantity: item.quantity,
    });
    setItemModalMode('edit');
    setItemFormError('');
    setSuccessMessage('');
  };

  const handleSaveItem = async (event) => {
    event.preventDefault();

    if (!itemForm.name.trim()) {
      setItemFormError('Item name is required.');
      return;
    }

    if (!itemForm.category) {
      setItemFormError('Please choose a category.');
      return;
    }

    if (!itemForm.priority) {
      setItemFormError('Please choose a priority.');
      return;
    }

    if (!Number(itemForm.quantity) || Number(itemForm.quantity) < 1) {
      setItemFormError('Quantity must be at least 1.');
      return;
    }

    if (!selectedList) {
      setItemFormError('Please choose a packing list first.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response =
        itemModalMode === 'edit'
          ? await updatePackingItem(selectedList._id, editingItemId, itemForm)
          : await addPackingItem(selectedList._id, itemForm);

      replaceList(response.data.data.packingList);
      setSuccessMessage(itemModalMode === 'edit' ? 'Packing item updated.' : 'Packing item added.');
      closeItemModal();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePacked = async (item) => {
    try {
      const response = await updatePackingItem(selectedList._id, item._id, {
        isPacked: !item.isPacked,
      });
      replaceList(response.data.data.packingList);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const handleStartListTitleEdit = () => {
    if (!selectedList) return;
    setListTitleDraft(selectedList.title);
    setIsEditingListTitle(true);
    setSuccessMessage('');
  };

  const handleCancelListTitleEdit = () => {
    setIsEditingListTitle(false);
    setListTitleDraft('');
  };

  const handleSaveListTitle = async (event) => {
    event.preventDefault();

    if (!selectedList || !listTitleDraft.trim()) {
      setError('Packing list name is required.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await updatePackingList(selectedList._id, {
        title: listTitleDraft.trim(),
      });
      replaceList(response.data.data.packingList);
      setIsEditingListTitle(false);
      setListTitleDraft('');
      setSuccessMessage('Packing list name updated.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReminderDaysChange = async (event) => {
    const daysBeforeTrip = Number(event.target.value);
    setReminderDays(daysBeforeTrip);

    if (!selectedList) return;

    try {
      const response = await updatePackingList(selectedList._id, {
        reminder: {
          enabled: selectedList.reminder?.enabled ?? true,
          daysBeforeTrip,
        },
      });
      replaceList(response.data.data.packingList);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      if (confirmAction.type === 'duplicate-list') {
        const response = await duplicatePackingList(confirmAction.list._id, {
          title: `${confirmAction.list.title} copy`,
        });
        const packingList = normalizePackingListForUi(response.data.data.packingList);
        setPackingLists((current) => [packingList, ...current]);
        setSelectedListId(packingList._id);
        setSuccessMessage('Packing list duplicated.');
      }

      if (confirmAction.type === 'delete-list') {
        await deletePackingList(confirmAction.list._id);
        setPackingLists((current) => {
          const nextLists = current.filter((list) => list._id !== confirmAction.list._id);
          setSelectedListId(nextLists[0]?._id || '');
          return nextLists;
        });
        setError('Packing list deleted.');
      }

      if (confirmAction.type === 'delete-item') {
        const response = await deletePackingItem(confirmAction.list._id, confirmAction.item._id);
        replaceList(response.data.data.packingList);
        setError('Packing item deleted.');
      }

      setConfirmAction(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmTitle =
    confirmAction?.type === 'duplicate-list'
      ? 'Duplicate packing list?'
      : confirmAction?.type === 'delete-list'
        ? 'Delete packing list?'
        : 'Delete packing item?';

  const confirmMessage =
    confirmAction?.type === 'duplicate-list'
      ? `Create a copy of "${confirmAction.list.title}" with all items marked unpacked.`
      : confirmAction?.type === 'delete-list'
        ? `Delete "${confirmAction.list.title}" and all of its packing items.`
        : `Delete "${confirmAction?.item?.name}" from this packing list.`;

  return (
    <section className="packing-page" aria-labelledby="packing-title">
      <div className="packing-hero">
        <div>
          <p className="eyebrow">Trip checklist</p>
          <h2 id="packing-title">Packing List</h2>
          <p>Plan what to bring, tick items as packed, and reuse templates for future trips.</p>
        </div>
        <button className="packing-ai-top" type="button" disabled>
          <Bot size={18} aria-hidden="true" />
          AI suggestions coming soon
        </button>
      </div>

      <form className="packing-create-panel" onSubmit={handleCreateList}>
        <div className="packing-panel-heading">
          <div>
            <h2>Create packing list</h2>
            <span>Select a Method</span>
          </div>
          <button className="secondary-action" type="submit" disabled={isSaving}>
            <Plus size={17} aria-hidden="true" />
            Create
          </button>
        </div>

        <div className="packing-create-mode" role="group" aria-label="Create packing list type">
          <button
            className={createMode === 'manual' ? 'active' : ''}
            type="button"
            onClick={() => {
              setCreateMode('manual');
              setCreateForm((current) => ({ ...current, templateKey: '' }));
            }}
          >
            Manual
          </button>
          <button
            className={createMode === 'template' ? 'active' : ''}
            type="button"
            onClick={() => setCreateMode('template')}
          >
            Use template
          </button>
        </div>

        <div className="packing-form-grid packing-form-grid-compact">
          <label>
            List title
            <input
              name="title"
              value={createForm.title}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="My Packing List"
            />
          </label>
          {createMode === 'template' && (
            <label>
              Template
              <select
                name="templateKey"
                value={createForm.templateKey}
                onChange={handleTemplateDropdownChange}
              >
                <option value="">Choose template</option>
                {templates.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </form>

      {createMode === 'template' && (
        <div className="packing-templates">
          {templates.map((template) => (
            <button
              className={createForm.templateKey === template.key ? 'active' : ''}
              type="button"
              key={template.key}
              onClick={() => handleTemplateSelect(template)}
            >
              <Sparkles size={17} aria-hidden="true" />
              <span>{template.title}</span>
              <small>{template.description}</small>
            </button>
          ))}
        </div>
      )}

      <div className="packing-layout">
        <aside className="packing-list-panel">
          <div className="packing-panel-heading">
            <div>
              <span>View packing lists</span>
              <h3>My lists</h3>
            </div>
            <strong>{packingLists.length}</strong>
          </div>

          {isLoading ? (
            <p className="settings-empty">Loading packing lists...</p>
          ) : packingLists.length === 0 ? (
            <p className="settings-empty">No packing lists yet. Create one manually or start from a template.</p>
          ) : (
            <div className="packing-list-stack">
              {packingLists.map((list) => {
                const listProgress = list.progress || {
                  packedItems: list.items.filter((item) => item.isPacked).length,
                  totalItems: list.items.length,
                };

                return (
                  <button
                    className={`packing-list-card ${selectedList?._id === list._id ? 'active' : ''}`}
                    type="button"
                    key={list._id}
                    onClick={() => setSelectedListId(list._id)}
                  >
                    <span>{list.title}</span>
                    <small>
                      {listProgress.packedItems}/{listProgress.totalItems} packed
                    </small>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <div className="packing-main">
          {selectedList ? (
            <section className="packing-detail">
              <div className="packing-detail-header">
                <div>
                  <p className="eyebrow">Packing workspace</p>
                  {isEditingListTitle ? (
                    <form className="packing-title-edit" onSubmit={handleSaveListTitle}>
                      <input
                        value={listTitleDraft}
                        onChange={(event) => setListTitleDraft(event.target.value)}
                        aria-label="Packing list name"
                        autoFocus
                      />
                      <button type="submit" disabled={isSaving}>Save</button>
                      <button type="button" onClick={handleCancelListTitleEdit}>Cancel</button>
                    </form>
                  ) : (
                    <div className="packing-title-row">
                      <h3>{selectedList.title}</h3>
                      <button type="button" onClick={handleStartListTitleEdit} aria-label="Edit packing list name">
                        <Edit3 size={17} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  <p>
                    {progress.packedItems}/{progress.totalItems} items packed
                  </p>
                </div>
                <div className="packing-list-actions">
                  <button
                    type="button"
                    onClick={() => setConfirmAction({ type: 'duplicate-list', list: selectedList })}
                    disabled={isSaving}
                  >
                    <Copy size={16} aria-hidden="true" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction({ type: 'delete-list', list: selectedList })}
                    disabled={isSaving}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="packing-progress" aria-label="Packing progress">
                <span style={{ width: `${progress.percent || 0}%` }} />
              </div>

              <div className="packing-reminder">
                <span>
                  <Bell size={17} aria-hidden="true" />
                  Packing reminder
                </span>
                <strong className={isPackingReminderEnabled ? 'enabled' : 'disabled'}>
                  {isPackingReminderEnabled ? 'Enabled' : 'Disabled'}
                </strong>
                <label>
                  Notify
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={selectedList.reminder?.daysBeforeTrip ?? reminderDays}
                    onChange={handleReminderDaysChange}
                  />
                  days before trip
                </label>
                {unpackedImportantCount > 0 && (
                  <small>
                    {unpackedImportantCount} High priority item{unpackedImportantCount === 1 ? '' : 's'} still unpacked.
                  </small>
                )}
              </div>

              <div className="packing-filters">
                <span className="packing-search-field">
                  <Search size={16} aria-hidden="true" />
                  <input
                    value={filters.search}
                    onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                    placeholder="Search items"
                  />
                </span>
                <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
                  <option value="">All categories</option>
                  {packingCategories.map((category) => (
                    <option key={category} value={category}>{formatPackingCategory(category)}</option>
                  ))}
                </select>
                <select value={filters.packed} onChange={(event) => setFilters((current) => ({ ...current, packed: event.target.value }))}>
                  <option value="">All status</option>
                  <option value="packed">Packed</option>
                  <option value="unpacked">Unpacked</option>
                </select>
                <select value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
                  <option value="">All priority</option>
                  {priorityLevels.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </div>

              {filteredItems.length === 0 ? (
                <p className="settings-empty">No packing items match the current filters.</p>
              ) : (
                <div className="packing-item-list">
                  {filteredItems.map((item) => (
                    <article className={item.isPacked ? 'packed' : ''} key={item._id}>
                      <label className="packing-check">
                        <input
                          type="checkbox"
                          checked={Boolean(item.isPacked)}
                          onChange={() => handleTogglePacked(item)}
                        />
                        <span className="sr-only">{item.isPacked ? 'Mark unpacked' : 'Mark packed'}</span>
                      </label>
                      <div>
                        <div className="packing-item-title-row">
                          <strong>{item.name}</strong>
                          <span className={getPriorityClassName(item.priority)}>{formatPriorityLevel(item.priority)}</span>
                        </div>
                        <span className="packing-item-category">
                          {(() => {
                            const CategoryIcon = getCategoryIcon(item.category);
                            return <CategoryIcon size={14} aria-hidden="true" />;
                          })()}
                          {formatPackingCategory(item.category)}
                        </span>
                      </div>
                      <div className="packing-item-meta" aria-label="Item quantity and priority">
                        <span className="packing-quantity">Qty {item.quantity}</span>
                      </div>
                      <button type="button" onClick={() => handleEditItem(item)} aria-label="Edit item">
                        <Edit3 size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ type: 'delete-item', list: selectedList, item })}
                        aria-label="Delete item"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </article>
                  ))}
                </div>
              )}

              <div className="packing-add-row">
                <button className="primary-action" type="button" onClick={handleOpenAddItem}>
                  <Plus size={17} aria-hidden="true" />
                  Add item
                </button>
              </div>

              {error && <p className="form-error packing-status">{error}</p>}
              {successMessage && <p className="form-success packing-status">{successMessage}</p>}
            </section>
          ) : (
            <section className="packing-detail packing-empty-detail">
              <Luggage size={34} aria-hidden="true" />
              <h3>Create your first packing list</h3>
              <p>Choose manual creation or start from a ready-made template.</p>
              {error && <p className="form-error packing-status">{error}</p>}
              {successMessage && <p className="form-success packing-status">{successMessage}</p>}
            </section>
          )}
        </div>
      </div>

      <button className="packing-ai-floating" type="button" disabled>
        <Bot size={20} aria-hidden="true" />
        <span>Ask AI</span>
      </button>

      {itemModalMode && (
        <div className="packing-modal-backdrop" role="presentation">
          <form className="packing-modal" onSubmit={handleSaveItem} aria-labelledby="packing-item-modal-title">
            <div className="packing-modal-header">
              <h3 id="packing-item-modal-title">{itemModalMode === 'edit' ? 'Edit item' : 'Add item'}</h3>
              <button type="button" onClick={closeItemModal} aria-label="Close item form">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {itemFormError && <p className="form-error packing-modal-status">{itemFormError}</p>}

            <label>
              Item name
              <input name="name" value={itemForm.name} onChange={handleItemFormChange} placeholder="Passport" autoFocus />
            </label>
            <label>
              Category
              <select name="category" value={itemForm.category} onChange={handleItemFormChange}>
                {packingCategories.map((category) => (
                  <option key={category} value={category}>{formatPackingCategory(category)}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select name="priority" value={itemForm.priority} onChange={handleItemFormChange}>
                {priorityLevels.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </label>
            <label>
              Quantity
              <input name="quantity" type="number" min="1" max="999" value={itemForm.quantity} onChange={handleItemFormChange} />
            </label>

            <div className="packing-modal-actions">
              <button className="secondary-action" type="button" onClick={closeItemModal}>Cancel</button>
              <button className="primary-action" type="submit" disabled={isSaving}>
                {itemModalMode === 'edit' ? 'Save' : 'Add item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmAction && (
        <div className="packing-modal-backdrop" role="presentation">
          <div className="packing-modal packing-confirm" role="dialog" aria-modal="true" aria-labelledby="packing-confirm-title">
            <div className="packing-modal-header">
              <h3 id="packing-confirm-title">{confirmTitle}</h3>
              <button type="button" onClick={() => setConfirmAction(null)} aria-label="Close confirmation">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p>{confirmMessage}</p>
            <div className="packing-modal-actions">
              <button className="secondary-action" type="button" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className="primary-action" type="button" onClick={runConfirmedAction} disabled={isSaving}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default PackingListsPage;
