/**
 * Travel Tools module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  Download,
  Edit3,
  FileText,
  ListChecks,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getTrips } from '../../api/tripApi';
import {
  addTravelDocumentItem,
  createTravelDocumentTemplate,
  createTravelDocument,
  deleteTravelDocument,
  deleteTravelDocumentFile,
  deleteTravelDocumentItem,
  deleteTravelDocumentTemplate,
  duplicateTravelDocument,
  getTravelDocumentTemplates,
  getTravelDocuments,
  updateTravelDocument,
  updateTravelDocumentTemplate,
  uploadTravelDocumentItemFiles,
  uploadTravelDocumentFiles,
} from '../../api/travelToolsApi';
import {
  defaultPackingCategory,
  formatPackingCategory,
  packingCategories,
} from './travelTools.constants';
import { useTravelToolsPage } from './hooks/useTravelToolsPage';
import { getCategoryIcon, getErrorMessage, mapTemplateForEdit } from './travelTools.utils';
import './TravelToolsPage.css';

const documentItemTypes = ['Passport', 'Visa', 'Insurance', 'Ticket', 'Booking', 'Transport', 'Health', 'Contact', 'Custom'];
const acceptedTravelDocumentTypes = [
  'image/png',
  'image/jpeg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const acceptedTravelDocumentExtensions = ['.png', '.jpg', '.jpeg', '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
const acceptedTravelDocumentInput = [...acceptedTravelDocumentTypes, ...acceptedTravelDocumentExtensions].join(',');
// TravelToolsPageFrame renders the main screen and handles nearby interactions.
function TravelToolsPageFrame({ labelledBy, children, className = '' }) {
  return (
    <section className={`travel-tools-page ${className}`.trim()} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}
const getTripOptionLabel = (trip) => {
  const title = trip.title || trip.destination || 'Untitled trip';
  return trip.destination && trip.destination !== title ? `${title} - ${trip.destination}` : title;
};
const renderTip = (text) => (
  <span className="travel-tools-tip-anchor" tabIndex="0" aria-label={text}>
    <CircleHelp size={15} aria-hidden="true" />
    <span className="travel-tools-create-tip" role="tooltip">{text}</span>
  </span>
);
const getVisibleTemplateItems = (items = []) => {
  const visibleItems = items.slice(0, 5);
  return items.length > visibleItems.length ? [...visibleItems, { name: '...' }] : visibleItems;
};
const getFileExtension = (fileName = '') => {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
};
const getTravelDocumentPreviewType = (file) => {
  const extension = getFileExtension(file.name);
  if (['.png', '.jpg', '.jpeg'].includes(extension) || ['image/png', 'image/jpeg'].includes(file.type)) return 'image';
  if (extension === '.pdf' || file.type === 'application/pdf') return 'pdf';
  return 'office';
};
const getTravelDocumentMimeType = (file) => {
  if (file.type) return file.type;
  const extension = getFileExtension(file.name);
  const mimeTypesByExtension = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return mimeTypesByExtension[extension] || '';
};
const isAcceptedTravelDocumentFile = (file) => {
  const extension = getFileExtension(file.name);
  return acceptedTravelDocumentTypes.includes(file.type) || acceptedTravelDocumentExtensions.includes(extension);
};
const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read selected file.'));
    reader.readAsDataURL(file);
  });
// Normalize Travel Document For Ui prepares incoming data for consistent storage.
const normalizeTravelDocumentForUi = (document) => ({
  ...document,
  id: document._id || document.id,
  type: document.type || document.documentType || 'Custom',
  tripId: document.tripId || '',
  items: (document.items || []).map((item) => ({
    ...item,
    id: item._id || item.id,
    documentType: item.documentType || 'Custom',
    uploadLabel: item.uploadLabel || `Upload ${item.name || 'file'}`,
    files: (item.files || []).map((file) => ({
      ...file,
      id: file._id || file.id,
      type: file.mimeType || file.type || 'Unknown file',
      url: file.dataUrl || file.fileUrl || file.url,
      size: file.size || file.fileSize || 0,
      previewType: file.previewType || getTravelDocumentPreviewType({
        name: file.name,
        type: file.mimeType || file.type,
      }),
    })),
  })),
  files: (document.files || []).map((file) => ({
    ...file,
    id: file._id || file.id,
    type: file.mimeType || file.type || 'Unknown file',
    url: file.dataUrl || file.fileUrl || file.url,
    size: file.size || file.fileSize || 0,
    previewType: file.previewType || getTravelDocumentPreviewType({
      name: file.name,
      type: file.mimeType || file.type,
    }),
  })),
});

const closeOpenTravelToolsMenus = (exceptMenu = null) => {
  document
    .querySelectorAll('.travel-tools-item-actions-menu[open], .travel-tools-actions-menu[open]')
    .forEach((menu) => {
      if (menu !== exceptMenu) {
        menu.removeAttribute('open');
      }
    });
};

const useCloseTravelToolsMenusOnOutsideClick = () => {
  useEffect(() => {
    const handlePointerDown = (event) => {
      const activeMenu = event.target.closest?.('.travel-tools-item-actions-menu, .travel-tools-actions-menu');
      closeOpenTravelToolsMenus(activeMenu || null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);
};

// PackingListTools renders the main screen and handles nearby interactions.
function PackingListTools() {
  useCloseTravelToolsMenusOnOutsideClick();

  const [packingListSearch, setPackingListSearch] = useState('');
  const [packingView, setPackingView] = useState('create');
  const [previousPackingView, setPreviousPackingView] = useState('create');
  const [openPackingTemplateMenuId, setOpenPackingTemplateMenuId] = useState('');
  const [packingTemplateEditStep, setPackingTemplateEditStep] = useState('details');
  const [packingTemplateBaseline, setPackingTemplateBaseline] = useState('');
  const {
    categoryOptions,
    closeItemModal,
    closeTemplateModal,
    confirmAction,
    confirmMessage,
    confirmTitle,
    createForm,
    createFormError,
    createMode,
    error,
    filteredItems,
    filters,
    handleCancelListTitleEdit,
    handleCreateList,
    handleEditItem,
    handleItemFormChange,
    handleOpenAddItem,
    handleOpenSaveTemplateModal,
    handleReminderDaysChange,
    handleSaveCurrentListAsTemplate,
    handleSaveItem,
    handleSaveListTitle,
    handleStartListTitleEdit,
    handleTemplateSaveFormChange,
    handleTemplateSelect,
    handleTemplateWorkspaceSelect,
    handleTogglePacked,
    isEditingListTitle,
    isLoading,
    isPackingReminderEnabled,
    isSaving,
    isTemplateModalOpen,
    itemForm,
    itemFormError,
    itemModalMode,
    listTitleDraft,
    listTripDraft,
    packingLists,
    progress,
    reminderDays,
    runConfirmedAction,
    saveTemplateDraft,
    selectedList,
    selectedTemplate,
    setConfirmAction,
    setCreateForm,
    setCreateFormError,
    setCreateMode,
    setFilters,
    setListTitleDraft,
    setListTripDraft,
    setSelectedListId,
    setSelectedTemplateId,
    setTemplateEditForm,
    setTemplateEditError,
    statusScope,
    successMessage,
    templateEditError,
    templateEditForm,
    templateSaveError,
    templateSaveForm,
    templates,
    trips,
  } = useTravelToolsPage();

  const linkedTrip = selectedList?.tripId
    ? trips.find((trip) => String(trip._id) === String(selectedList.tripId))
    : null;
  const linkedTripName = selectedList?.tripId
    ? (linkedTrip ? getTripOptionLabel(linkedTrip) : selectedList.destination || 'Linked trip unavailable')
    : 'Not linked';
  const isPackingDetailsDirty = Boolean(
    selectedList
      && (
        listTitleDraft.trim() !== selectedList.title
        || String(listTripDraft || '') !== String(selectedList.tripId || '')
      )
  );
  const isTripLinkedToOtherPackingList = (tripId, excludedListId = '') =>
    packingLists.some(
      (list) =>
        String(list.tripId || '') === String(tripId) &&
        (!excludedListId || String(list._id) !== String(excludedListId))
    );
  const filteredPackingLists = packingLists.filter((list) => {
    const normalizedSearch = packingListSearch.toLowerCase().trim();
    if (!normalizedSearch) return true;
    return [list.title, list.destination].some((value) => value?.toLowerCase().includes(normalizedSearch));
  });
  const orderedPackingTemplates = useMemo(
    () => [
      ...templates.filter((template) => template.source !== 'custom'),
      ...templates.filter((template) => template.source === 'custom'),
    ],
    [templates]
  );
  const handleOpenPackingTemplateEdit = (template) => {
    setPreviousPackingView(packingView);
    setPackingView('all');
    setOpenPackingTemplateMenuId('');
    setPackingTemplateEditStep('details');
    setPackingTemplateBaseline(JSON.stringify(mapTemplateForEdit(template)));
    handleTemplateWorkspaceSelect(template);
  };
  const handleClosePackingTemplateEdit = () => {
    setSelectedTemplateId('');
    setPackingTemplateEditStep('details');
    setPackingTemplateBaseline('');
    setPackingView(previousPackingView);
  };
  const isPackingTemplateDirty = JSON.stringify(templateEditForm) !== packingTemplateBaseline;
  const handlePackingTemplateFieldChange = (field, value) => {
    setTemplateEditError('');
    setTemplateEditForm((current) => ({ ...current, [field]: value }));
  };
  const handlePackingTemplateItemChange = (itemIndex, field, value) => {
    setTemplateEditError('');
    setTemplateEditForm((current) => ({
      ...current,
      items: current.items.map((item, index) => (
        index === itemIndex
          ? { ...item, [field]: field === 'quantity' ? Number(value) || 1 : value }
          : item
      )),
    }));
  };
  const handleAddPackingTemplateItem = () => {
    setTemplateEditForm((current) => ({
      ...current,
      items: [
        ...current.items,
        { id: `new-${Date.now()}`, name: '', category: defaultPackingCategory, quantity: 1, isPacked: false },
      ],
    }));
  };
  const handleRemovePackingTemplateItem = (itemIndex) => {
    setTemplateEditForm((current) => ({
      ...current,
      items: current.items.filter((_, index) => index !== itemIndex),
    }));
  };
  const handleSavePackingTemplateEdit = async () => {
    if (!isPackingTemplateDirty) return;
    const incompleteItemIndex = templateEditForm.items.findIndex((item) => !item.name.trim());
    if (incompleteItemIndex >= 0) {
      setPackingTemplateEditStep('items');
      setTemplateEditError(`Complete or delete packing item ${incompleteItemIndex + 1} before saving.`);
      return;
    }
    const didSave = await saveTemplateDraft(templateEditForm, 'Packing template updated.');
    if (didSave) handleClosePackingTemplateEdit();
  };

  return (
    <TravelToolsPageFrame labelledBy="packing-title" className="travel-tools-enhanced-page packing-redesign">
      <header className="document-command-header">
        <div className="document-command-title">
          <span className="document-command-icon" aria-hidden="true">
            <ListChecks size={23} />
          </span>
          <div>
            <p>Trip checklist control</p>
            <h2 id="packing-title">Packing Lists</h2>
            <span>Plan what to bring, track packed items, and reuse templates for future trips.</span>
          </div>
        </div>
        <div className="document-view-actions" role="group" aria-label="Packing list view">
          <button className={packingView === 'create' ? 'active' : ''} type="button" onClick={() => setPackingView('create')}>
            <Plus size={15} aria-hidden="true" />
            Create Packing
          </button>
          <button className={packingView === 'all' ? 'active' : ''} type="button" onClick={() => setPackingView('all')}>
            <ListChecks size={15} aria-hidden="true" />
            All Packings
            <span>{packingLists.length}</span>
          </button>
        </div>
      </header>

      <datalist id="packing-category-options">
        {categoryOptions.map((category) => (
          <option key={category} value={category}>
            {formatPackingCategory(category)}
          </option>
        ))}
      </datalist>

      {packingView === 'create' && (
      <form className="travel-tools-create-panel packing-create-panel document-create-deck" onSubmit={handleCreateList}>
        <div className="travel-tools-panel-heading">
          <div>
            <span>Create a packing list</span>
            <h3>Create a list manually or start from a packing template.</h3>
          </div>
          <div className="document-create-mode-actions" role="group" aria-label="Create packing list type">
            <button
              className={createMode === 'manual' ? 'active' : ''}
              type="button"
              onClick={() => {
                setCreateFormError('');
                setCreateMode('manual');
                setCreateForm((current) => ({ ...current, templateKey: '' }));
              }}
            >
              <Edit3 size={15} aria-hidden="true" />
              Create manually
            </button>
            <button
              className={createMode === 'template' ? 'active' : ''}
              type="button"
              onClick={() => {
                setCreateFormError('');
                setCreateMode('template');
              }}
            >
              <ListChecks size={15} aria-hidden="true" />
              Use template
            </button>
          </div>
        </div>

        <div className="document-create-fields-row">
          <div className="travel-tools-form-grid travel-tools-form-grid-compact">
            <div className="travel-tools-create-field">
            <label>
              <span className="travel-tools-field-label">
                List title
                {renderTip('Create a simple name for your packing list.')}
              </span>
              <input
                name="title"
                value={createForm.title}
                onChange={(event) => {
                  setCreateFormError('');
                  setCreateForm((current) => ({ ...current, title: event.target.value }));
                }}
                placeholder="My Packing List"
              />
            </label>
            </div>
            <div className="travel-tools-create-field">
            <label>
              <span className="travel-tools-field-label">
                Link trip
                {renderTip('Link your packing list to an existing trip.')}
              </span>
              <select
                name="tripId"
                value={createForm.tripId}
                onChange={(event) => {
                  setCreateFormError('');
                  setCreateForm((current) => ({ ...current, tripId: event.target.value }));
                }}
              >
                <option value="">None</option>
                {trips.map((trip) => {
                  const isUnavailable = isTripLinkedToOtherPackingList(trip._id);
                  return (
                    <option key={trip._id} value={trip._id} disabled={isUnavailable}>
                      {getTripOptionLabel(trip)}{isUnavailable ? ' (Already linked)' : ''}
                    </option>
                  );
                })}
              </select>
            </label>
            </div>
          </div>
          <button
            className="secondary-action document-create-submit"
            type="submit"
            disabled={isSaving || !createForm.title.trim() || (createMode === 'template' && !createForm.templateKey)}
          >
            <Plus size={17} aria-hidden="true" />
            Create
          </button>
        </div>

        {createMode === 'template' && (
          <div className="document-template-library">
            <div className="document-template-picker" aria-label="Packing list templates">
              {orderedPackingTemplates.map((template) => {
                const isSelectedTemplate = createForm.templateKey === template.key;
                return (
                  <article className={`document-template-card ${isSelectedTemplate ? 'active' : ''}`} key={template.key}>
                    <button
                      className="document-template-select"
                      type="button"
                      onClick={() => {
                        setCreateFormError('');
                        handleTemplateSelect(template);
                      }}
                    >
                      <span>{template.source === 'custom' ? 'Saved custom template' : 'Standard template'}</span>
                      <strong>{template.title}</strong>
                      <small>{template.description || 'Reusable packing list template.'}</small>
                      <div>
                        {getVisibleTemplateItems(template.items || []).map((item, index) => (
                          <em key={`${template.key}-${item.name}-${index}`}>{item.name}</em>
                        ))}
                      </div>
                    </button>
                    {template.source === 'custom' && (
                      <div className="document-template-menu">
                        <button
                          type="button"
                          onClick={() => setOpenPackingTemplateMenuId((current) => (current === template.key ? '' : template.key))}
                          aria-label={`Open actions for ${template.title}`}
                        >
                          <MoreVertical size={17} aria-hidden="true" />
                        </button>
                        {openPackingTemplateMenuId === template.key && (
                          <div className="document-template-menu-panel">
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenPackingTemplateEdit(template);
                              }}
                            >
                              <Edit3 size={15} aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmAction({ type: 'delete-template', template });
                                setOpenPackingTemplateMenuId('');
                              }}
                            >
                              <Trash2 size={15} aria-hidden="true" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}
        {createFormError && <p className="form-error travel-tools-status">{createFormError}</p>}
        {error && <p className="form-error travel-tools-status">{error}</p>}
        {successMessage && <p className="form-success travel-tools-status">{successMessage}</p>}
      </form>
      )}

      {packingView === 'all' && (
      <div className="travel-tools-layout packing-dashboard-layout document-workbench">
        <aside className="travel-tools-list-panel packing-side-panel">
          <div className="travel-tools-side-section packing-list-side-section">
            <div className="travel-tools-panel-heading">
              <div>
                <span>View Packing Lists</span>
                <h3>My Packing Lists</h3>
              </div>
              <strong>{packingLists.length}</strong>
            </div>

            <div className="travel-tools-filters travel-tools-template-filters packing-side-search">
              <span className="travel-tools-search-field">
                <Search size={16} aria-hidden="true" />
                <input
                  value={packingListSearch}
                  onChange={(event) => setPackingListSearch(event.target.value)}
                  placeholder="Search packing lists"
                />
              </span>
            </div>

            {isLoading ? (
              <p className="settings-empty">Loading packing lists...</p>
            ) : packingLists.length === 0 ? (
              <div className="packing-side-empty">
                <p>No packing lists yet.</p>
                <small>Create one manually or start from a template.</small>
                <span aria-hidden="true">
                  <ListChecks size={28} />
                </span>
              </div>
            ) : filteredPackingLists.length === 0 ? (
              <p className="settings-empty">No packing lists match the current search.</p>
            ) : (
              <div className="travel-tools-list-stack">
                {filteredPackingLists.map((list) => {
                  const listProgress = list.progress || {
                    packedItems: list.items.filter((item) => item.isPacked).length,
                    totalItems: list.items.length,
                  };
                  return (
                    <button
                      className={`travel-tools-list-card ${!selectedTemplate && selectedList?._id === list._id ? 'active' : ''}`}
                      type="button"
                      key={list._id}
                      onClick={() => {
                        setSelectedListId(list._id);
                        setSelectedTemplateId('');
                      }}
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
          </div>

        </aside>

        <div className="travel-tools-main">
          {selectedTemplate ? (
            <div className="travel-tools-modal-backdrop packing-template-edit-backdrop" role="presentation">
            <section className="travel-tools-modal packing-workspace-detail template-workspace-detail packing-template-popup" role="dialog" aria-modal="true" aria-labelledby="packing-template-edit-title">
              <div className="travel-tools-detail-header">
                <div>
                  <span className="travel-tools-workspace-label">Edit template · Step {packingTemplateEditStep === 'details' ? '1' : '2'} of 2</span>
                  <div className="travel-tools-title-row">
                    <h3 id="packing-template-edit-title">{templateEditForm.title || 'Untitled template'}</h3>
                  </div>
                  <p>{packingTemplateEditStep === 'details' ? 'Update the reusable template details.' : 'Edit every packing item before saving.'}</p>
                </div>
                <button className="document-template-close" type="button" onClick={handleClosePackingTemplateEdit} aria-label="Close template editor">
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              {(templateEditError || (statusScope === 'template' && error)) && (
                <div className="document-template-modal-status" aria-live="polite">
                  {templateEditError && <p className="form-error travel-tools-status">{templateEditError}</p>}
                  {statusScope === 'template' && error && <p className="form-error travel-tools-status">{error}</p>}
                </div>
              )}

              {packingTemplateEditStep === 'details' ? (
                <div className="document-template-step document-template-details-step">
                  <label>
                    <span>Template name</span>
                    <input
                      value={templateEditForm.title}
                      onChange={(event) => handlePackingTemplateFieldChange('title', event.target.value)}
                      placeholder="Weekend essentials"
                      autoFocus
                    />
                  </label>
                  <label>
                    <span>Linked trip</span>
                    <select
                      value={createForm.tripId}
                      onChange={(event) => setCreateForm((current) => ({ ...current, tripId: event.target.value }))}
                    >
                      <option value="">None</option>
                      {trips.map((trip) => {
                        const isUnavailable = isTripLinkedToOtherPackingList(trip._id);
                        return (
                          <option key={trip._id} value={trip._id} disabled={isUnavailable}>
                            {getTripOptionLabel(trip)}{isUnavailable ? ' (Already linked)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <small>This trip will be selected when creating a packing list from the template.</small>
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea
                      value={templateEditForm.description}
                      onChange={(event) => handlePackingTemplateFieldChange('description', event.target.value)}
                      placeholder="Reusable packing list template"
                      rows="5"
                    />
                  </label>
                </div>
              ) : (
                <div className="document-template-step document-template-items-step">
                  <div className="document-template-items-heading">
                    <div>
                      <span>Packing items</span>
                      <strong>{templateEditForm.items.length} item{templateEditForm.items.length === 1 ? '' : 's'}</strong>
                    </div>
                    <button className="secondary-action" type="button" onClick={handleAddPackingTemplateItem} disabled={isSaving}>
                      <Plus size={16} aria-hidden="true" />
                      Add item
                    </button>
                  </div>
                  {templateEditForm.items.length === 0 ? (
                    <p className="settings-empty packing-template-empty">No packing items yet. Add an item before saving.</p>
                  ) : (
                    <div className="document-template-edit-list packing-template-inline-edit-list">
                      {templateEditForm.items.map((item, index) => (
                        <article className="document-template-edit-item packing-template-inline-edit-item" key={item.id || index}>
                          <label>
                            <span>Category</span>
                            <select
                              value={item.category}
                              onChange={(event) => handlePackingTemplateItemChange(index, 'category', event.target.value)}
                            >
                              {packingCategories.map((category) => (
                                <option key={category} value={category}>{formatPackingCategory(category)}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Name</span>
                            <input
                              value={item.name}
                              onChange={(event) => handlePackingTemplateItemChange(index, 'name', event.target.value)}
                              placeholder="Passport"
                            />
                          </label>
                          <label>
                            <span>Quantity</span>
                            <input
                              type="number"
                              min="1"
                              max="999"
                              value={item.quantity}
                              onChange={(event) => handlePackingTemplateItemChange(index, 'quantity', event.target.value)}
                            />
                          </label>
                          <button type="button" onClick={() => handleRemovePackingTemplateItem(index)} aria-label={`Delete ${item.name || 'packing item'}`}>
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="document-template-step-actions">
                <button className="secondary-action" type="button" onClick={handleClosePackingTemplateEdit}>Cancel</button>
                {packingTemplateEditStep === 'details' ? (
                  <button className="primary-action" type="button" onClick={() => setPackingTemplateEditStep('items')} disabled={!templateEditForm.title.trim()}>
                    Next
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                ) : (
                  <>
                    <button className="secondary-action" type="button" onClick={() => setPackingTemplateEditStep('details')}>
                      <ChevronLeft size={16} aria-hidden="true" />
                      Back
                    </button>
                    <button
                      className="primary-action"
                      type="button"
                      onClick={handleSavePackingTemplateEdit}
                      disabled={isSaving || !isPackingTemplateDirty}
                      title={!isPackingTemplateDirty ? 'Make a change before saving' : 'Save template changes'}
                    >
                      Save
                    </button>
                  </>
                )}
              </div>
            </section>
            </div>
          ) : selectedList ? (
            <section className="travel-tools-detail packing-workspace-detail">
              <div className="travel-tools-detail-header">
                <div>
                  <span className="travel-tools-workspace-label">Packing Workspace</span>
                  <div className="travel-tools-title-row">
                    <h3>{selectedList.title}</h3>
                  </div>
                  <p>
                    {progress.packedItems}/{progress.totalItems} items packed
                  </p>
                  <div className="travel-tools-workspace-meta" aria-label="Packing list trip details">
                    <span>Trip linked: {linkedTripName}</span>
                  </div>
                </div>
                <details className="travel-tools-actions-menu">
                  <summary>
                    <MoreVertical size={17} aria-hidden="true" />
                    More
                  </summary>
                  <div>
                    <button type="button" onClick={handleStartListTitleEdit} disabled={isSaving}>
                      <Edit3 size={16} aria-hidden="true" />
                      Edit
                    </button>
                    <button type="button" onClick={handleOpenSaveTemplateModal} disabled={isSaving}>
                      <Sparkles size={16} aria-hidden="true" />
                      Save as Template
                    </button>
                    <button type="button" onClick={() => setConfirmAction({ type: 'duplicate-list', list: selectedList })} disabled={isSaving}>
                      <Copy size={16} aria-hidden="true" />
                      Duplicate
                    </button>
                    <button type="button" onClick={() => setConfirmAction({ type: 'delete-list', list: selectedList })} disabled={isSaving}>
                      <Trash2 size={16} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </details>
              </div>

              {(statusScope === 'packing' && (error || successMessage)) && (
                <div className="document-workspace-status" aria-live="polite">
                  {error && <p className="form-error travel-tools-status">{error}</p>}
                  {successMessage && <p className="form-success travel-tools-status">{successMessage}</p>}
                </div>
              )}

              <div className="packing-workspace-controls">
                <div className="packing-reminder">
                  <span>
                    <Bell size={17} aria-hidden="true" />
                    Packing reminder
                  </span>
                  <strong className={isPackingReminderEnabled ? 'enabled' : 'disabled'}>
                    {isPackingReminderEnabled ? 'Enabled' : 'Disabled'}
                  </strong>
                  {renderTip(
                    isPackingReminderEnabled
                      ? 'Packing reminders are currently enabled in your notification settings.'
                      : 'Packing reminders are currently disabled in your notification settings.'
                  )}
                  <label>
                    {renderTip('Choose how many days before the trip you want to be reminded.')}
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
                </div>

                <div className="travel-tools-filters packing-item-filters">
                  <span className="travel-tools-search-field">
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
                  <button className="secondary-action travel-tools-filter-action" type="button" onClick={handleOpenAddItem}>
                    <Plus size={16} aria-hidden="true" />
                    Add item
                  </button>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="packing-items-empty">
                    <span aria-hidden="true">
                      <ListChecks size={28} />
                    </span>
                    <div>
                      <strong>{selectedList.items.length === 0 ? 'No packing items yet' : 'No packing items match'}</strong>
                      <p>
                        {selectedList.items.length === 0
                          ? 'Add items to your list to get organized for your trip.'
                          : 'Try changing the current filters.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="travel-tools-item-list packing-workspace-item-list">
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
                          <div className="travel-tools-item-title-row">
                            <strong>{item.name}</strong>
                          </div>
                          <span className="travel-tools-item-category">
                            {(() => {
                              const CategoryIcon = getCategoryIcon(item.category);
                              return <CategoryIcon size={14} aria-hidden="true" />;
                            })()}
                            {formatPackingCategory(item.category)}
                          </span>
                        </div>
                        <div className="travel-tools-item-meta" aria-label="Item quantity">
                          <span className="travel-tools-quantity">Qty {item.quantity}</span>
                        </div>
                        <div className="packing-item-direct-actions">
                          <button
                            className="packing-item-icon-action"
                            type="button"
                            onClick={() => handleEditItem(item)}
                            aria-label={`Edit ${item.name}`}
                            title={`Edit ${item.name}`}
                          >
                            <Edit3 size={16} aria-hidden="true" />
                          </button>
                          <button
                            className="packing-item-icon-action packing-item-delete-action"
                            type="button"
                            onClick={() => setConfirmAction({ type: 'delete-item', list: selectedList, item })}
                            aria-label={`Delete ${item.name}`}
                            title={`Delete ${item.name}`}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

            </section>
          ) : (
            <section className="travel-tools-detail travel-tools-empty-detail packing-empty-detail">
              <span className="packing-empty-illustration" aria-hidden="true">
                <ListChecks size={64} />
              </span>
              <h3>Create your first packing list</h3>
              <p>Choose manual creation or start from a ready-made template.</p>
              {statusScope === 'packing' && error && <p className="form-error travel-tools-status">{error}</p>}
              {statusScope === 'packing' && successMessage && <p className="form-success travel-tools-status">{successMessage}</p>}
            </section>
          )}
        </div>
      </div>
      )}

      {isEditingListTitle && selectedList && (
        <div className="travel-tools-modal-backdrop packing-edit-backdrop" role="presentation">
          <form className="travel-tools-modal packing-details-edit-modal" onSubmit={handleSaveListTitle} aria-labelledby="packing-details-edit-title">
            <div className="travel-tools-modal-header">
              <div>
                <span className="travel-tools-workspace-label">Packing settings</span>
                <h3 id="packing-details-edit-title">Edit packing list</h3>
              </div>
              <button type="button" onClick={handleCancelListTitleEdit} aria-label="Close packing list edit form">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {statusScope === 'packing' && error && <p className="form-error travel-tools-modal-status">{error}</p>}
            <label>
              Packing list name
              <input
                value={listTitleDraft}
                onChange={(event) => setListTitleDraft(event.target.value)}
                placeholder="My Packing List"
                autoFocus
              />
            </label>
            <label>
              Linked trip
              <select value={listTripDraft} onChange={(event) => setListTripDraft(event.target.value)}>
                <option value="">None</option>
                {trips.map((trip) => {
                  const isUnavailable = isTripLinkedToOtherPackingList(trip._id, selectedList._id);
                  return (
                    <option key={trip._id} value={trip._id} disabled={isUnavailable}>
                      {getTripOptionLabel(trip)}{isUnavailable ? ' (Already linked)' : ''}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="travel-tools-modal-actions">
              <button className="secondary-action" type="button" onClick={handleCancelListTitleEdit}>Cancel</button>
              <button
                className="primary-action"
                type="submit"
                disabled={isSaving || !listTitleDraft.trim() || !isPackingDetailsDirty}
                title={!isPackingDetailsDirty ? 'Make a change before saving' : 'Save packing list changes'}
              >
                Save changes
              </button>
            </div>
          </form>
        </div>
      )}

      {itemModalMode && (
        <div className="travel-tools-modal-backdrop" role="presentation">
          <form className="travel-tools-modal" onSubmit={handleSaveItem} aria-labelledby="packing-item-modal-title">
            <div className="travel-tools-modal-header">
              <h3 id="packing-item-modal-title">
                {itemModalMode === 'edit' || itemModalMode === 'template-edit' ? 'Edit item' : 'Add item'}
              </h3>
              <button type="button" onClick={closeItemModal} aria-label="Close item form">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {itemFormError && <p className="form-error travel-tools-modal-status">{itemFormError}</p>}

            <label>
              Item name
              <input name="name" value={itemForm.name} onChange={handleItemFormChange} placeholder="Passport" autoFocus />
            </label>
            <label>
              Category
              <select name="category" value={itemForm.category} onChange={handleItemFormChange}>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{formatPackingCategory(category)}</option>
                ))}
              </select>
            </label>
            <label>
              Quantity
              <input name="quantity" type="number" min="1" max="999" value={itemForm.quantity} onChange={handleItemFormChange} />
            </label>

            <div className="travel-tools-modal-actions">
              <button className="secondary-action" type="button" onClick={closeItemModal}>Cancel</button>
              <button className="primary-action" type="submit" disabled={isSaving}>
                {itemModalMode === 'edit' || itemModalMode === 'template-edit' ? 'Save' : 'Add item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isTemplateModalOpen && (
        <div className="travel-tools-modal-backdrop" role="presentation">
          <form className="travel-tools-modal" onSubmit={handleSaveCurrentListAsTemplate} aria-labelledby="packing-template-modal-title">
            <div className="travel-tools-modal-header">
              <h3 id="packing-template-modal-title">Save as template</h3>
              <button type="button" onClick={closeTemplateModal} aria-label="Close template form">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {templateSaveError && <p className="form-error travel-tools-modal-status">{templateSaveError}</p>}

            <label>
              Template title
              <input
                name="title"
                value={templateSaveForm.title}
                onChange={handleTemplateSaveFormChange}
                placeholder="Weekend essentials"
                autoFocus
              />
            </label>
            <label>
              Description
              <input
                name="description"
                value={templateSaveForm.description}
                onChange={handleTemplateSaveFormChange}
                placeholder="Reusable checklist for short city breaks"
              />
            </label>

            <div className="travel-tools-modal-actions">
              <button className="secondary-action" type="button" onClick={closeTemplateModal}>Cancel</button>
              <button className="primary-action" type="submit" disabled={isSaving}>
                Save template
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmAction && (
        <div className="travel-tools-modal-backdrop" role="presentation">
          <div className="travel-tools-modal travel-tools-confirm" role="dialog" aria-modal="true" aria-labelledby="travel-tools-confirm-title">
            <div className="travel-tools-modal-header">
              <h3 id="travel-tools-confirm-title">{confirmTitle}</h3>
              <button type="button" onClick={() => setConfirmAction(null)} aria-label="Close confirmation">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p>{confirmMessage}</p>
            <div className="travel-tools-modal-actions">
              <button className="secondary-action" type="button" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className="primary-action" type="button" onClick={runConfirmedAction} disabled={isSaving}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {isSaving && (
        <div className="travel-tools-busy-overlay" role="status" aria-live="polite">
          <span className="travel-tools-spinner" aria-hidden="true" />
          <strong>Processing...</strong>
        </div>
      )}
    </TravelToolsPageFrame>
  );
}

function TravelDocumentTools() {
  useCloseTravelToolsMenusOnOutsideClick();

  const [documents, setDocuments] = useState([]);
  const [documentTemplates, setDocumentTemplates] = useState([]);
  const [documentView, setDocumentView] = useState('create');
  const [previousDocumentView, setPreviousDocumentView] = useState('create');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [trips, setTrips] = useState([]);
  const [filters, setFilters] = useState({ search: '' });
  const [documentItemFilters, setDocumentItemFilters] = useState({ search: '', type: '' });
  const [createMode, setCreateMode] = useState('manual');
  const [createForm, setCreateForm] = useState({ name: '', tripId: '', templateKey: '' });
  const [itemForm, setItemForm] = useState({ name: '', documentType: 'Passport', uploadLabel: '' });
  const [templateSaveForm, setTemplateSaveForm] = useState({ name: '', description: '' });
  const [templateSaveError, setTemplateSaveError] = useState('');
  const [documentCreateError, setDocumentCreateError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isDocumentItemModalOpen, setIsDocumentItemModalOpen] = useState(false);
  const [expandedFile, setExpandedFile] = useState(null);
  const [isEditingDocumentName, setIsEditingDocumentName] = useState(false);
  const [documentNameDraft, setDocumentNameDraft] = useState('');
  const [documentTripDraft, setDocumentTripDraft] = useState('');
  const [openTemplateMenuId, setOpenTemplateMenuId] = useState('');
  const [editingDocumentTemplate, setEditingDocumentTemplate] = useState(null);
  const [templateEditDraft, setTemplateEditDraft] = useState({ name: '', description: '', items: [] });
  const [templateEditBaseline, setTemplateEditBaseline] = useState('');
  const [previousDocumentId, setPreviousDocumentId] = useState('');
  const [templateEditStep, setTemplateEditStep] = useState('details');

  useEffect(() => {
    let isMounted = true;

    const loadTravelDocuments = async () => {
      try {
        const [documentsResponse, templatesResponse, tripsResponse] = await Promise.all([
          getTravelDocuments(),
          getTravelDocumentTemplates().catch(() => ({ data: { data: { templates: [] } } })),
          getTrips().catch(() => ({ data: { data: { trips: [] } } })),
        ]);

        if (!isMounted) return;

        const nextDocuments = (documentsResponse.data.data.documents || []).map(normalizeTravelDocumentForUi);
        const nextTemplates = templatesResponse.data.data.templates || [];
        setDocuments(nextDocuments);
        setDocumentTemplates(nextTemplates);
        setSelectedDocumentId((current) => current || nextDocuments[0]?.id || '');
        setTrips(tripsResponse.data.data.trips || []);
        setFormError('');
      } catch (requestError) {
        if (isMounted) setFormError(getErrorMessage(requestError));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadTravelDocuments();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) || documents[0],
    [documents, selectedDocumentId]
  );
  const selectedDocumentTrip = selectedDocument?.tripId
    ? trips.find((trip) => String(trip._id) === String(selectedDocument.tripId))
    : null;
  const selectedDocumentTripName = selectedDocument?.tripId
    ? (selectedDocumentTrip ? getTripOptionLabel(selectedDocumentTrip) : 'Linked trip unavailable')
    : 'Not linked';
  const isTripLinkedToOtherDocument = (tripId, excludedDocumentId = '') =>
    documents.some(
      (document) =>
        String(document.tripId || '') === String(tripId) &&
        (!excludedDocumentId || String(document.id) !== String(excludedDocumentId))
    );

  const filteredDocuments = documents.filter((document) => {
    const matchesSearch = document.name.toLowerCase().includes(filters.search.toLowerCase().trim());
    return matchesSearch;
  });
  const filteredDocumentItems = (selectedDocument?.items || []).filter((item) => {
    const normalizedSearch = documentItemFilters.search.toLowerCase().trim();
    const matchesSearch =
      item.name.toLowerCase().includes(normalizedSearch) ||
      item.uploadLabel.toLowerCase().includes(normalizedSearch);
    const matchesType = !documentItemFilters.type || item.documentType === documentItemFilters.type;
    return matchesSearch && matchesType;
  });
  const orderedDocumentTemplates = useMemo(
    () => [
      ...documentTemplates.filter((template) => template.source !== 'custom'),
      ...documentTemplates.filter((template) => template.source === 'custom'),
    ],
    [documentTemplates]
  );
  const isEditingTemplateDirty = JSON.stringify(templateEditDraft) !== templateEditBaseline;
  const isDocumentDetailsDirty = Boolean(
    selectedDocument &&
    (
      documentNameDraft.trim() !== selectedDocument.name.trim() ||
      String(documentTripDraft || '') !== String(selectedDocument.tripId || '')
    )
  );

  const hasDuplicateDocumentName = (name) => {
    const normalizedName = name.trim().replace(/\s+/g, ' ').toLowerCase();
    return documents.some((document) => document.name.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedName);
  };

  const getDuplicateDocumentName = (name) => {
    const baseName = `${name} copy`;
    let candidateName = baseName;
    let copyNumber = 2;

    while (hasDuplicateDocumentName(candidateName)) {
      candidateName = `${baseName} ${copyNumber}`;
      copyNumber += 1;
    }

    return candidateName;
  };

  const replaceDocument = (updatedDocument) => {
    const normalizedDocument = normalizeTravelDocumentForUi(updatedDocument);
    setDocuments((current) =>
      current.map((document) => (document.id === normalizedDocument.id ? normalizedDocument : document))
    );
    return normalizedDocument;
  };

  const handleCreateDocument = async (event) => {
    event.preventDefault();

    if (!createForm.name.trim()) {
      setDocumentCreateError('Document list name is required.');
      return;
    }

    if (createMode === 'template' && !createForm.templateKey) {
      setDocumentCreateError('Choose a template to create this document list.');
      return;
    }

    setIsSaving(true);
    setDocumentCreateError('');
    setSuccessMessage('');

    try {
      const response = await createTravelDocument({
        name: createForm.name.trim(),
        tripId: createForm.tripId || undefined,
        ...(createMode === 'template' ? { templateKey: createForm.templateKey } : {}),
      });
      const nextDocument = normalizeTravelDocumentForUi(response.data.data.document);

      setDocuments((current) => [nextDocument, ...current]);
      setSelectedDocumentId(nextDocument.id);
      setCreateForm({ name: '', tripId: '', templateKey: '' });
      setCreateMode('manual');
      setSuccessMessage('Document list created.');
    } catch (requestError) {
      setDocumentCreateError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (event, itemId = '') => {
    const uploadedFiles = Array.from(event.target.files || []);
    if (!selectedDocument || uploadedFiles.length === 0) return;

    const acceptedFiles = uploadedFiles.filter(isAcceptedTravelDocumentFile);
    const rejectedCount = uploadedFiles.length - acceptedFiles.length;

    if (acceptedFiles.length === 0) {
      setFormError('Upload PNG, JPG, JPEG, PDF, Word, PowerPoint, or Excel files only.');
      event.target.value = '';
      return;
    }

    setIsSaving(true);
    setFormError('');
    setSuccessMessage('');

    try {
      const nextFiles = await Promise.all(
        acceptedFiles.map(async (file) => {
          const mimeType = getTravelDocumentMimeType(file);
          const dataUrl = await readFileAsDataUrl(file);
          return {
            name: file.name,
            size: file.size,
            mimeType,
            dataUrl: String(dataUrl).replace(/^data:[^;]+;base64,/, `data:${mimeType};base64,`),
            previewType: getTravelDocumentPreviewType(file),
          };
        })
      );
      const response = itemId
        ? await uploadTravelDocumentItemFiles(selectedDocument.id, itemId, nextFiles)
        : await uploadTravelDocumentFiles(selectedDocument.id, nextFiles);
      replaceDocument(response.data.data.document);
      setFormError(rejectedCount ? `${rejectedCount} unsupported file${rejectedCount === 1 ? '' : 's'} skipped.` : '');
      setSuccessMessage(`${nextFiles.length} file${nextFiles.length === 1 ? '' : 's'} added to travel document.`);
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
      event.target.value = '';
    }
  };

  const handleRemoveFile = async (fileId) => {
    if (!selectedDocument) return;
    if (expandedFile?.id === fileId) setExpandedFile(null);
    setIsSaving(true);
    setFormError('');
    setSuccessMessage('');

    try {
      const response = await deleteTravelDocumentFile(selectedDocument.id, fileId);
      replaceDocument(response.data.data.document);
      setSuccessMessage('Travel document file deleted.');
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDocumentItem = async (event) => {
    event.preventDefault();
    if (!selectedDocument) return;

    if (!itemForm.name.trim()) {
      setFormError('Document file name is required.');
      return;
    }

    setIsDocumentItemModalOpen(false);
    setIsSaving(true);
    setFormError('');
    setSuccessMessage('');

    try {
      const response = await addTravelDocumentItem(selectedDocument.id, {
        name: itemForm.name.trim(),
        documentType: itemForm.documentType,
        uploadLabel: itemForm.uploadLabel.trim() || `Upload ${itemForm.name.trim()}`,
      });
      replaceDocument(response.data.data.document);
      setItemForm({ name: '', documentType: 'Passport', uploadLabel: '' });
      setSuccessMessage('Document list item added.');
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDocumentItemModal = () => {
    setItemForm({ name: '', documentType: 'Passport', uploadLabel: '' });
    setFormError('');
    setSuccessMessage('');
    setIsDocumentItemModalOpen(true);
  };

  const handleCloseDocumentItemModal = () => {
    setIsDocumentItemModalOpen(false);
    setItemForm({ name: '', documentType: 'Passport', uploadLabel: '' });
    setFormError('');
  };

  const handleStartDocumentNameEdit = () => {
    if (!selectedDocument) return;
    setDocumentNameDraft(selectedDocument.name);
    setDocumentTripDraft(selectedDocument.tripId || '');
    setIsEditingDocumentName(true);
    setFormError('');
    setSuccessMessage('');
  };

  const handleCancelDocumentNameEdit = () => {
    setIsEditingDocumentName(false);
    setDocumentNameDraft('');
    setDocumentTripDraft('');
  };

  const handleSaveDocumentName = async (event) => {
    event.preventDefault();
    if (!selectedDocument || !isDocumentDetailsDirty) return;

    if (!documentNameDraft.trim()) {
      setFormError('Document list name is required.');
      return;
    }

    if (
      documentNameDraft.trim().toLowerCase() !== selectedDocument.name.trim().toLowerCase() &&
      hasDuplicateDocumentName(documentNameDraft)
    ) {
      setFormError('A travel document with this name already exists.');
      return;
    }

    setIsEditingDocumentName(false);
    setIsSaving(true);
    setFormError('');
    setSuccessMessage('');

    try {
      const response = await updateTravelDocument(selectedDocument.id, {
        name: documentNameDraft.trim(),
        tripId: documentTripDraft || null,
      });
      replaceDocument(response.data.data.document);
      setDocumentNameDraft('');
      setDocumentTripDraft('');
      setSuccessMessage('Document list details updated.');
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const mapTemplateForWorkspaceEdit = (template) => ({
    name: template.name || template.title || '',
    description: template.description || '',
    items: (template.items || []).map((item, index) => ({
      id: item._id || item.id || `${item.name}-${index}`,
      name: item.name || '',
      documentType: item.documentType || 'Custom',
      uploadLabel: item.uploadLabel || '',
    })),
  });

  const handleStartDocumentTemplateEdit = (template) => {
    const draft = mapTemplateForWorkspaceEdit(template);
    setPreviousDocumentView(documentView);
    setDocumentView('all');
    setPreviousDocumentId(selectedDocumentId);
    setEditingDocumentTemplate(template);
    setTemplateEditDraft(draft);
    setTemplateEditBaseline(JSON.stringify(draft));
    setTemplateEditStep('details');
    setOpenTemplateMenuId('');
    setFormError('');
    setSuccessMessage('');
  };

  const handleBackFromDocumentTemplateEdit = () => {
    setEditingDocumentTemplate(null);
    setTemplateEditDraft({ name: '', description: '', items: [] });
    setTemplateEditBaseline('');
    setTemplateEditStep('details');
    setSelectedDocumentId(previousDocumentId || selectedDocumentId);
    setPreviousDocumentId('');
    setDocumentView(previousDocumentView);
  };

  const handleTemplateDraftItemChange = (itemIndex, field, value) => {
    setTemplateEditDraft((current) => ({
      ...current,
      items: current.items.map((item, index) => (index === itemIndex ? { ...item, [field]: value } : item)),
    }));
  };

  const handleAddTemplateDraftItem = () => {
    setTemplateEditDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        { id: `new-${Date.now()}`, name: '', documentType: 'Custom', uploadLabel: '' },
      ],
    }));
  };

  const handleRemoveTemplateDraftItem = (itemIndex) => {
    setTemplateEditDraft((current) => ({
      ...current,
      items: current.items.filter((_, index) => index !== itemIndex),
    }));
  };

  const handleSaveDocumentTemplateEdit = async () => {
    if (!editingDocumentTemplate || !isEditingTemplateDirty) return;

    const incompleteItemIndex = templateEditDraft.items.findIndex((item) => !item.name.trim());
    if (incompleteItemIndex >= 0) {
      setTemplateEditStep('items');
      setFormError(`Complete or delete document item ${incompleteItemIndex + 1} before saving.`);
      return;
    }

    const items = templateEditDraft.items
      .map((item) => ({
        name: item.name.trim(),
        documentType: item.documentType,
        uploadLabel: item.uploadLabel.trim(),
      }))
      .filter((item) => item.name);

    if (!templateEditDraft.name.trim()) {
      setFormError('Template name is required.');
      return;
    }

    if (items.length === 0) {
      setFormError('Add at least one document item before saving this template.');
      return;
    }

    handleBackFromDocumentTemplateEdit();
    setIsSaving(true);
    setFormError('');
    setSuccessMessage('');

    try {
      const response = await updateTravelDocumentTemplate(editingDocumentTemplate.key, {
        name: templateEditDraft.name.trim(),
        description: templateEditDraft.description.trim(),
        documentType: editingDocumentTemplate.documentType || 'Custom',
        items,
      });
      const template = response.data.data.template;
      const nextTemplate = {
        ...template,
        key: template._id || template.id || editingDocumentTemplate.key,
        source: 'custom',
      };

      setDocumentTemplates((current) =>
        current.map((candidate) => (candidate.key === editingDocumentTemplate.key ? nextTemplate : candidate))
      );
      setSuccessMessage('Document template updated.');
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenSaveDocumentTemplate = () => {
    if (!selectedDocument) return;
    setTemplateSaveForm({
      name: selectedDocument.name,
      description: selectedDocument.items.length
        ? `Reusable document list with ${selectedDocument.items.length} document item${selectedDocument.items.length === 1 ? '' : 's'}.`
        : 'Reusable document list template.',
    });
    setTemplateSaveError('');
    setFormError('');
    setSuccessMessage('');
    setIsTemplateModalOpen(true);
  };

  const handleSaveDocumentTemplate = async (event) => {
    event.preventDefault();
    if (!selectedDocument) return;

    if (!templateSaveForm.name.trim()) {
      setTemplateSaveError('Template name is required.');
      return;
    }

    setIsTemplateModalOpen(false);
    setIsSaving(true);
    setFormError('');
    setSuccessMessage('');

    try {
      const response = await createTravelDocumentTemplate({
        name: templateSaveForm.name.trim(),
        description: templateSaveForm.description.trim(),
        documentType: 'Custom',
        documentId: selectedDocument.id,
      });
      const template = response.data.data.template;
      setDocumentTemplates((current) => [{
        ...template,
        key: template._id || template.id,
        source: 'custom',
      }, ...current]);
      setTemplateSaveForm({ name: '', description: '' });
      setSuccessMessage('Travel document saved as template.');
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const confirmedAction = confirmAction;
    setConfirmAction(null);
    if (
      confirmedAction.type === 'delete-document-template' &&
      editingDocumentTemplate?.key === confirmedAction.template.key
    ) {
      handleBackFromDocumentTemplateEdit();
    }
    setIsSaving(true);
    setDocumentCreateError('');
    setFormError('');
    setSuccessMessage('');

    try {
      if (confirmedAction.type === 'duplicate-document') {
        const response = await duplicateTravelDocument(confirmedAction.document.id, {
          name: getDuplicateDocumentName(confirmedAction.document.name),
        });
        const nextDocument = normalizeTravelDocumentForUi(response.data.data.document);
        setDocuments((current) => [nextDocument, ...current]);
        setSelectedDocumentId(nextDocument.id);
        setSuccessMessage('Travel document duplicated.');
      }

      if (confirmedAction.type === 'delete-document') {
        await deleteTravelDocument(confirmedAction.document.id);
        setExpandedFile(null);
        setDocuments((current) => {
          const nextDocuments = current.filter((document) => document.id !== confirmedAction.document.id);
          setSelectedDocumentId(nextDocuments[0]?.id || '');
          return nextDocuments;
        });
        setFormError('Travel document deleted.');
      }

      if (confirmedAction.type === 'delete-document-item') {
        const response = await deleteTravelDocumentItem(confirmedAction.document.id, confirmedAction.item.id);
        replaceDocument(response.data.data.document);
        setFormError('Document item deleted.');
      }

      if (confirmedAction.type === 'delete-document-template') {
        await deleteTravelDocumentTemplate(confirmedAction.template.key);
        setDocumentTemplates((current) => current.filter((template) => template.key !== confirmedAction.template.key));
        setSuccessMessage('Document template deleted successfully.');
      }

    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmTitle =
    confirmAction?.type === 'duplicate-document'
      ? 'Duplicate travel document?'
      : confirmAction?.type === 'delete-document-item'
        ? 'Delete document item?'
        : confirmAction?.type === 'delete-document-template'
          ? 'Delete document template?'
        : 'Delete travel document?';

  const confirmMessage =
    confirmAction?.type === 'duplicate-document'
      ? `Create a copy of "${confirmAction.document.name}" with the same uploaded files.`
      : confirmAction?.type === 'delete-document-item'
        ? `Delete "${confirmAction?.item?.name}" and its uploaded files from this document list.`
        : confirmAction?.type === 'delete-document-template'
          ? `Delete "${confirmAction?.template?.name || confirmAction?.template?.title}" from saved custom templates.`
        : `Delete "${confirmAction?.document?.name}" and all of its uploaded files.`;

  const renderFilePreview = (file, isExpanded = false) => {
    if (file.previewType === 'image') {
      return <img src={file.url} alt={file.name} />;
    }

    if (file.previewType === 'pdf') {
      return <object data={file.url} type="application/pdf" aria-label={`${file.name} preview`} />;
    }

    return (
      <object data={file.url} type={file.type} aria-label={`${file.name} preview`}>
        <div className="travel-document-preview-fallback">
          <FileText size={isExpanded ? 44 : 26} aria-hidden="true" />
          <strong>{getFileExtension(file.name).replace('.', '').toUpperCase() || 'File'}</strong>
          <span>Preview depends on browser support for this file type.</span>
        </div>
      </object>
    );
  };

  return (
    <TravelToolsPageFrame labelledBy="travel-document-title" className="travel-tools-enhanced-page travel-documents-redesign">
      <header className="document-command-header">
        <div className="document-command-title">
          <span className="document-command-icon" aria-hidden="true">
            <FileText size={23} />
          </span>
          <div>
            <p>Trip file control</p>
            <h2 id="travel-document-title">Travel Documents</h2>
            <span>Organize required records and keep every uploaded file close to its trip.</span>
          </div>
        </div>
        <div className="document-view-actions" role="group" aria-label="Document view">
          <button className={documentView === 'create' ? 'active' : ''} type="button" onClick={() => setDocumentView('create')}>
            <Plus size={15} aria-hidden="true" />
            Create Document
          </button>
          <button className={documentView === 'all' ? 'active' : ''} type="button" onClick={() => setDocumentView('all')}>
            <FileText size={15} aria-hidden="true" />
            All Documents
            <span>{documents.length}</span>
          </button>
        </div>
      </header>

      {documentView === 'create' && (
      <form className="travel-tools-create-panel packing-create-panel document-create-deck" onSubmit={handleCreateDocument}>
        <div className="travel-tools-panel-heading">
          <div>
            <span>Create document list</span>
            <h3>Create a list manually or start from a document template.</h3>
          </div>
          <div className="document-create-mode-actions" role="group" aria-label="Create document list type">
            <button
              className={createMode === 'manual' ? 'active' : ''}
              type="button"
              onClick={() => {
                setCreateMode('manual');
                setCreateForm((current) => ({ ...current, templateKey: '' }));
                setDocumentCreateError('');
              }}
            >
              <Edit3 size={15} aria-hidden="true" />
              Create manually
            </button>
            <button
              className={createMode === 'template' ? 'active' : ''}
              type="button"
              onClick={() => {
                setCreateMode('template');
                setDocumentCreateError('');
              }}
            >
              <FileText size={15} aria-hidden="true" />
              Use template
            </button>
          </div>
        </div>

        <div className="document-create-fields-row">
          <div className="travel-tools-form-grid travel-tools-form-grid-compact">
            <div className="travel-tools-create-field">
              <label>
                <span className="travel-tools-field-label">
                  Document list name
                  {renderTip('Use a trip-ready name such as "Europe Vacation" or "Japan family documents".')}
                </span>
                <input
                  value={createForm.name}
                  onChange={(event) => {
                    setDocumentCreateError('');
                    setCreateForm((current) => ({ ...current, name: event.target.value }));
                  }}
                  placeholder="Europe Vacation"
                />
              </label>
            </div>
            <div className="travel-tools-create-field">
              <label>
                <span className="travel-tools-field-label">
                  Link trip
                  {renderTip('Optionally attach this document to one of your trips.')}
                </span>
                <select
                  value={createForm.tripId}
                  onChange={(event) => setCreateForm((current) => ({ ...current, tripId: event.target.value }))}
                >
                  <option value="">None</option>
                  {trips.map((trip) => {
                    const isUnavailable = isTripLinkedToOtherDocument(trip._id);
                    return (
                      <option key={trip._id} value={trip._id} disabled={isUnavailable}>
                        {getTripOptionLabel(trip)}{isUnavailable ? ' (Already linked)' : ''}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
          </div>
          <button
            className="secondary-action document-create-submit"
            type="submit"
            disabled={isSaving || !createForm.name.trim() || (createMode === 'template' && !createForm.templateKey)}
          >
            <Plus size={17} aria-hidden="true" />
            Create
          </button>
        </div>

        {createMode === 'template' && (
          <div className="document-template-library">
            <div className="document-template-picker" aria-label="Document list templates">
              {orderedDocumentTemplates.map((template) => {
                const isSelectedTemplate = createForm.templateKey === template.key;
                return (
                  <article className={`document-template-card ${isSelectedTemplate ? 'active' : ''}`} key={template.key || template.id}>
                    <button
                      className="document-template-select"
                      type="button"
                      onClick={() => {
                        setCreateForm((current) => ({
                          ...current,
                          templateKey: template.key,
                          name: template.name || template.title || 'Document list',
                        }));
                        setDocumentCreateError('');
                      }}
                    >
                      <span>{template.source === 'custom' ? 'Saved custom template' : 'Standard template'}</span>
                      <strong>{template.name || template.title}</strong>
                      <small>{template.description || 'Reusable document list template.'}</small>
                      <div>
                        {(template.items || []).map((item, index) => (
                          <em key={`${template.key}-${item.name}-${index}`}>{item.name}</em>
                        ))}
                      </div>
                    </button>
                    {template.source === 'custom' && (
                      <div className="document-template-menu">
                        <button
                          type="button"
                          onClick={() => setOpenTemplateMenuId((current) => (current === template.key ? '' : template.key))}
                          aria-label={`Open actions for ${template.name || template.title}`}
                        >
                          <MoreVertical size={17} aria-hidden="true" />
                        </button>
                        {openTemplateMenuId === template.key && (
                          <div className="document-template-menu-panel">
                            <button type="button" onClick={() => handleStartDocumentTemplateEdit(template)}>
                              <Edit3 size={15} aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmAction({ type: 'delete-document-template', template });
                                setOpenTemplateMenuId('');
                              }}
                            >
                              <Trash2 size={15} aria-hidden="true" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {documentCreateError && <p className="form-error travel-tools-status">{documentCreateError}</p>}
        {successMessage && <p className="form-success travel-tools-status">{successMessage}</p>}
      </form>
      )}

      {documentView === 'all' && (
      <div className="travel-tools-layout packing-dashboard-layout document-workbench">
        <aside className="travel-tools-list-panel packing-side-panel">
          <div className="travel-tools-side-section packing-list-side-section">
            <div className="travel-tools-panel-heading">
              <div>
                <span>View Document Lists</span>
                <h3>My Document Lists</h3>
              </div>
              <strong>{documents.length}</strong>
            </div>

            <div className="travel-tools-filters travel-tools-template-filters packing-side-search">
              <span className="travel-tools-search-field">
                <Search size={16} aria-hidden="true" />
                <input
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Search document lists"
                />
              </span>
            </div>

            {isLoading ? (
              <p className="settings-empty">Loading travel documents...</p>
            ) : documents.length === 0 ? (
              <div className="packing-side-empty">
                <p>No document lists yet.</p>
                <small>Create one manually or start from a template.</small>
                <span aria-hidden="true">
                  <FileText size={28} />
                </span>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <p className="settings-empty">No document lists match the current search.</p>
            ) : (
              <div className="travel-tools-list-stack">
                {filteredDocuments.map((document) => (
                  <button
                    className={`travel-tools-list-card ${!editingDocumentTemplate && selectedDocument?.id === document.id ? 'active' : ''}`}
                    type="button"
                    key={document.id}
                    onClick={() => {
                      setEditingDocumentTemplate(null);
                      setSelectedDocumentId(document.id);
                    }}
                  >
                    <span>{document.name}</span>
                    <small>{document.items.length} item{document.items.length === 1 ? '' : 's'}</small>
                  </button>
                ))}
              </div>
            )}
          </div>

        </aside>

        <div className="travel-tools-main">
          {editingDocumentTemplate ? (
            <div className="travel-tools-modal-backdrop document-template-edit-backdrop" role="presentation">
            <section className="travel-tools-modal travel-document-template-workspace" role="dialog" aria-modal="true" aria-labelledby="document-template-edit-title">
              <div className="travel-tools-detail-header">
                <div>
                  <span className="travel-tools-workspace-label">Edit template · Step {templateEditStep === 'details' ? '1' : '2'} of 2</span>
                  <div className="travel-tools-title-row">
                    <h3 id="document-template-edit-title">{templateEditDraft.name || 'Untitled template'}</h3>
                  </div>
                  <p>{templateEditStep === 'details' ? 'Update the reusable template details.' : 'Edit every document item before saving.'}</p>
                </div>
                <button className="document-template-close" type="button" onClick={handleBackFromDocumentTemplateEdit} aria-label="Close template editor">
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              {(formError || successMessage) && (
                <div className="document-template-modal-status" aria-live="polite">
                  {formError && <p className="form-error travel-tools-status">{formError}</p>}
                  {successMessage && <p className="form-success travel-tools-status">{successMessage}</p>}
                </div>
              )}

              {templateEditStep === 'details' ? (
                <div className="document-template-step document-template-details-step">
                  <label>
                    <span>Template name</span>
                    <input
                      value={templateEditDraft.name}
                      onChange={(event) => {
                        setFormError('');
                        setTemplateEditDraft((current) => ({ ...current, name: event.target.value }));
                      }}
                      placeholder="Europe Vacation"
                      autoFocus
                    />
                  </label>
                  <label>
                    <span>Linked trip</span>
                    <select
                      value={createForm.tripId}
                      onChange={(event) => setCreateForm((current) => ({ ...current, tripId: event.target.value }))}
                    >
                      <option value="">None</option>
                      {trips.map((trip) => {
                        const isUnavailable = isTripLinkedToOtherDocument(trip._id);
                        return (
                          <option key={trip._id} value={trip._id} disabled={isUnavailable}>
                            {getTripOptionLabel(trip)}{isUnavailable ? ' (Already linked)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <small>This trip will be selected when creating a document list from the template.</small>
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea
                      value={templateEditDraft.description}
                      onChange={(event) => {
                        setFormError('');
                        setTemplateEditDraft((current) => ({ ...current, description: event.target.value }));
                      }}
                      placeholder="Reusable document list template"
                      rows="5"
                    />
                  </label>
                </div>
              ) : (
                <div className="document-template-step document-template-items-step">
                  <div className="document-template-items-heading">
                    <div>
                      <span>Document items</span>
                      <strong>{templateEditDraft.items.length} item{templateEditDraft.items.length === 1 ? '' : 's'}</strong>
                    </div>
                    <button className="secondary-action" type="button" onClick={handleAddTemplateDraftItem} disabled={isSaving}>
                      <Plus size={16} aria-hidden="true" />
                      Add item
                    </button>
                  </div>
                  {templateEditDraft.items.length === 0 ? (
                    <p className="settings-empty document-items-empty">No template items yet. Add a document item before saving.</p>
                  ) : (
                    <div className="document-template-edit-list">
                      {templateEditDraft.items.map((item, index) => (
                        <article className="document-template-edit-item" key={item.id}>
                          <label>
                            <span>Type</span>
                            <select
                              value={item.documentType}
                              onChange={(event) => handleTemplateDraftItemChange(index, 'documentType', event.target.value)}
                            >
                              {documentItemTypes.map((type) => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Name</span>
                            <input
                              value={item.name}
                              onChange={(event) => handleTemplateDraftItemChange(index, 'name', event.target.value)}
                              placeholder="Passport"
                            />
                          </label>
                          <label>
                            <span>Description</span>
                            <input
                              value={item.uploadLabel}
                              onChange={(event) => handleTemplateDraftItemChange(index, 'uploadLabel', event.target.value)}
                              placeholder="Upload scan"
                            />
                          </label>
                          <button type="button" onClick={() => handleRemoveTemplateDraftItem(index)} aria-label={`Delete ${item.name || 'template item'}`}>
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="document-template-step-actions">
                <button className="secondary-action" type="button" onClick={handleBackFromDocumentTemplateEdit}>Cancel</button>
                {templateEditStep === 'details' ? (
                  <button className="primary-action" type="button" onClick={() => setTemplateEditStep('items')} disabled={!templateEditDraft.name.trim()}>
                    Next
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                ) : (
                  <>
                    <button className="secondary-action" type="button" onClick={() => setTemplateEditStep('details')}>
                      <ChevronLeft size={16} aria-hidden="true" />
                      Back
                    </button>
                    <button
                      className="primary-action"
                      type="button"
                      onClick={handleSaveDocumentTemplateEdit}
                      disabled={isSaving || !isEditingTemplateDirty}
                      title={!isEditingTemplateDirty ? 'Make a change before saving' : 'Save template changes'}
                    >
                      Save
                    </button>
                  </>
                )}
              </div>
            </section>
            </div>
          ) : selectedDocument ? (
            <section className="travel-tools-detail packing-workspace-detail">
              <div className="travel-tools-detail-header">
                <div>
                  <span className="travel-tools-workspace-label">Document workspace</span>
                  <div className="travel-tools-title-row">
                    <h3>{selectedDocument.name}</h3>
                  </div>
                  <p>{selectedDocument.items.length} document item{selectedDocument.items.length === 1 ? '' : 's'}</p>
                  <div className="travel-tools-workspace-meta" aria-label="Travel document details">
                    <span>{selectedDocument.items.reduce((total, item) => total + item.files.length, selectedDocument.files.length)} uploaded file{selectedDocument.items.reduce((total, item) => total + item.files.length, selectedDocument.files.length) === 1 ? '' : 's'}</span>
                    <span>Trip linked: {selectedDocumentTripName}</span>
                  </div>
                </div>
                <details className="travel-tools-actions-menu">
                  <summary>
                    <MoreVertical size={17} aria-hidden="true" />
                    More
                  </summary>
                  <div>
                    <button type="button" onClick={handleStartDocumentNameEdit} disabled={isSaving}>
                      <Edit3 size={16} aria-hidden="true" />
                      Edit
                    </button>
                    <button type="button" onClick={handleOpenSaveDocumentTemplate} disabled={isSaving}>
                      <Sparkles size={16} aria-hidden="true" />
                      Save as template
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: 'duplicate-document', document: selectedDocument })}
                      disabled={isSaving}
                    >
                      <Copy size={16} aria-hidden="true" />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: 'delete-document', document: selectedDocument })}
                      disabled={isSaving}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </details>
              </div>
              {(formError || successMessage) && (
                <div className="document-workspace-status" aria-live="polite">
                  {formError && <p className="form-error travel-tools-status">{formError}</p>}
                  {successMessage && <p className="form-success travel-tools-status">{successMessage}</p>}
                </div>
              )}

              <div className="packing-workspace-controls document-workspace-controls">
                <div className="travel-tools-filters travel-document-item-filters">
                  <span className="travel-tools-search-field">
                    <Search size={16} aria-hidden="true" />
                    <input
                      value={documentItemFilters.search}
                      onChange={(event) => setDocumentItemFilters((current) => ({ ...current, search: event.target.value }))}
                      placeholder="Search document items"
                    />
                  </span>
                  <select
                    value={documentItemFilters.type}
                    onChange={(event) => setDocumentItemFilters((current) => ({ ...current, type: event.target.value }))}
                    aria-label="Filter document type"
                  >
                    <option value="">All types</option>
                    {documentItemTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <button className="secondary-action travel-tools-filter-action" type="button" onClick={handleOpenDocumentItemModal} disabled={isSaving}>
                    <Plus size={16} aria-hidden="true" />
                    Add item
                  </button>
                </div>

                {filteredDocumentItems.length === 0 ? (
                  <p className="settings-empty document-items-empty">
                    {selectedDocument.items.length === 0
                      ? 'No document list items yet. Add a document file name and type, then upload its file.'
                      : 'No document items match the current filters.'}
                  </p>
                ) : (
                  <div className="travel-tools-item-list travel-tools-document-file-list">
                    {filteredDocumentItems.map((item) => (
                      <article className="travel-document-list-item" key={item.id}>
                        <div>
                          <div className="travel-tools-item-title-row">
                            <strong>{item.name}</strong>
                            <span className="priority-low">{item.documentType}</span>
                          </div>
                          <span className="travel-tools-item-category">
                            {item.uploadLabel}
                          </span>
                          {item.files.length > 0 && (
                            <div className="travel-document-attached-files">
                              {item.files.map((file) => (
                                <span key={file.id}>
                                  <button type="button" onClick={() => setExpandedFile(file)}>{file.name}</button>
                                  <a href={file.url} download={file.name} aria-label={`Download ${file.name}`}>
                                    <Download size={14} aria-hidden="true" />
                                  </a>
                                  <button type="button" onClick={() => handleRemoveFile(file.id)} aria-label="Remove file" disabled={isSaving}>
                                    <Trash2 size={14} aria-hidden="true" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="travel-tools-item-meta" aria-label="Uploaded files">
                          <span className="travel-tools-quantity">{item.files.length} file{item.files.length === 1 ? '' : 's'}</span>
                        </div>
                        <div className="document-item-direct-actions">
                          <label className="document-item-icon-action" title={`Upload files for ${item.name}`}>
                            <Upload size={16} aria-hidden="true" />
                            <span className="sr-only">Upload files for {item.name}</span>
                            <input type="file" multiple accept={acceptedTravelDocumentInput} onChange={(event) => handleFileUpload(event, item.id)} disabled={isSaving} />
                          </label>
                          <button
                            className="document-item-icon-action document-item-delete-action"
                            type="button"
                            onClick={() => setConfirmAction({ type: 'delete-document-item', document: selectedDocument, item })}
                            aria-label={`Delete ${item.name}`}
                            title={`Delete ${item.name}`}
                            disabled={isSaving}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

            </section>
          ) : (
            <section className="travel-tools-detail travel-tools-empty-detail">
              <FileText size={34} aria-hidden="true" />
              <h3>Create your first travel document</h3>
              <p>Add a document record, then upload images or files into its workspace.</p>
              {formError && <p className="form-error travel-tools-status">{formError}</p>}
              {successMessage && <p className="form-success travel-tools-status">{successMessage}</p>}
            </section>
          )}
        </div>
      </div>
      )}

      {isEditingDocumentName && selectedDocument && (
        <div className="travel-tools-modal-backdrop document-edit-backdrop" role="presentation">
          <form className="travel-tools-modal document-details-edit-modal" onSubmit={handleSaveDocumentName} aria-labelledby="document-details-edit-title">
            <div className="travel-tools-modal-header">
              <div>
                <span className="travel-tools-workspace-label">Document settings</span>
                <h3 id="document-details-edit-title">Edit document list</h3>
              </div>
              <button type="button" onClick={handleCancelDocumentNameEdit} aria-label="Close document edit form">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {formError && <p className="form-error travel-tools-modal-status">{formError}</p>}
            <label>
              Document list name
              <input
                value={documentNameDraft}
                onChange={(event) => {
                  setFormError('');
                  setDocumentNameDraft(event.target.value);
                }}
                placeholder="Europe Vacation"
                autoFocus
              />
            </label>
            <label>
              Linked trip
              <select value={documentTripDraft} onChange={(event) => setDocumentTripDraft(event.target.value)}>
                <option value="">None</option>
                {trips.map((trip) => {
                  const isUnavailable = isTripLinkedToOtherDocument(trip._id, selectedDocument.id);
                  return (
                    <option key={trip._id} value={trip._id} disabled={isUnavailable}>
                      {getTripOptionLabel(trip)}{isUnavailable ? ' (Already linked)' : ''}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="travel-tools-modal-actions">
              <button className="secondary-action" type="button" onClick={handleCancelDocumentNameEdit}>Cancel</button>
              <button
                className="primary-action"
                type="submit"
                disabled={isSaving || !documentNameDraft.trim() || !isDocumentDetailsDirty}
                title={!isDocumentDetailsDirty ? 'Make a change before saving' : 'Save document list changes'}
              >
                Save changes
              </button>
            </div>
          </form>
        </div>
      )}

      {expandedFile && (
        <div className="travel-tools-modal-backdrop" role="presentation">
          <div className="travel-tools-modal travel-document-preview-modal" role="dialog" aria-modal="true" aria-labelledby="travel-document-preview-title">
            <div className="travel-tools-modal-header">
              <h3 id="travel-document-preview-title">{expandedFile.name}</h3>
              <button type="button" onClick={() => setExpandedFile(null)} aria-label="Close preview">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="travel-document-expanded-preview">
              {renderFilePreview(expandedFile, true)}
            </div>
            <div className="travel-tools-modal-actions">
              <a className="primary-action" href={expandedFile.url} download={expandedFile.name}>
                <Download size={17} aria-hidden="true" />
                Download
              </a>
              <button className="secondary-action" type="button" onClick={() => setExpandedFile(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {isDocumentItemModalOpen && (
        <div className="travel-tools-modal-backdrop" role="presentation">
          <form className="travel-tools-modal" onSubmit={handleAddDocumentItem} aria-labelledby="document-item-modal-title">
            <div className="travel-tools-modal-header">
              <h3 id="document-item-modal-title">Add document item</h3>
              <button type="button" onClick={handleCloseDocumentItemModal} aria-label="Close document item form">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {formError && <p className="form-error travel-tools-modal-status">{formError}</p>}
            <label>
              Document file name
              <input
                value={itemForm.name}
                onChange={(event) => {
                  setFormError('');
                  setItemForm((current) => ({ ...current, name: event.target.value }));
                }}
                placeholder="Passport"
                autoFocus
              />
            </label>
            <label>
              Type
              <select
                value={itemForm.documentType}
                onChange={(event) => setItemForm((current) => ({ ...current, documentType: event.target.value }))}
              >
                {documentItemTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label>
              Description
              <input
                value={itemForm.uploadLabel}
                onChange={(event) => {
                  setFormError('');
                  setItemForm((current) => ({ ...current, uploadLabel: event.target.value }));
                }}
                placeholder="Upload scan"
              />
            </label>
            <div className="travel-tools-modal-actions">
              <button className="secondary-action" type="button" onClick={handleCloseDocumentItemModal}>Cancel</button>
              <button className="primary-action" type="submit" disabled={isSaving}>
                Add item
              </button>
            </div>
          </form>
        </div>
      )}

      {isTemplateModalOpen && (
        <div className="travel-tools-modal-backdrop" role="presentation">
          <form className="travel-tools-modal" onSubmit={handleSaveDocumentTemplate} aria-labelledby="document-template-modal-title">
            <div className="travel-tools-modal-header">
              <h3 id="document-template-modal-title">Save as template</h3>
              <button type="button" onClick={() => setIsTemplateModalOpen(false)} aria-label="Close template form">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <label>
              Template name
              <input
                value={templateSaveForm.name}
                onChange={(event) => {
                  setTemplateSaveError('');
                  setTemplateSaveForm((current) => ({ ...current, name: event.target.value }));
                }}
                placeholder="Passport document set"
              />
            </label>
            <label>
              Description
              <textarea
                value={templateSaveForm.description}
                onChange={(event) => {
                  setTemplateSaveError('');
                  setTemplateSaveForm((current) => ({ ...current, description: event.target.value }));
                }}
                placeholder="Reusable document template for future trips"
                rows="4"
              />
            </label>
            {templateSaveError && <p className="form-error travel-tools-status">{templateSaveError}</p>}
            <div className="travel-tools-modal-actions">
              <button className="secondary-action" type="button" onClick={() => setIsTemplateModalOpen(false)}>Cancel</button>
              <button className="primary-action" type="submit" disabled={isSaving}>
                Save template
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmAction && (
        <div className="travel-tools-modal-backdrop" role="presentation">
          <div className="travel-tools-modal travel-tools-confirm" role="dialog" aria-modal="true" aria-labelledby="document-confirm-title">
            <div className="travel-tools-modal-header">
              <h3 id="document-confirm-title">{confirmTitle}</h3>
              <button type="button" onClick={() => setConfirmAction(null)} aria-label="Close confirmation">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p>{confirmMessage}</p>
            <div className="travel-tools-modal-actions">
              <button className="secondary-action" type="button" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className="primary-action" type="button" onClick={runConfirmedAction} disabled={isSaving}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {isSaving && (
        <div className="travel-tools-busy-overlay" role="status" aria-live="polite">
          <span className="travel-tools-spinner" aria-hidden="true" />
          <strong>Processing...</strong>
        </div>
      )}

    </TravelToolsPageFrame>
  );
}

function TravelToolsPage({ mode = 'packing' }) {
  if (mode === 'documents') return <TravelDocumentTools />;
  return <PackingListTools />;
}

export default TravelToolsPage;

