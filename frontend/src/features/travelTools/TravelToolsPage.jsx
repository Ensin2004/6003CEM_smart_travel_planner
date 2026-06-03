/**
 * Travel Tools module.
 * Page state, event handlers, and render sections define the screen experience.
 */
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleAlert,
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
  formatPackingCategory,
  packingCategories,
} from './travelTools.constants';
import { useTravelToolsPage } from './hooks/useTravelToolsPage';
import { getCategoryIcon, getErrorMessage } from './travelTools.utils';
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
// TravelToolsHero renders the main screen and handles nearby interactions.
function TravelToolsHero({ description, eyebrow, labelledBy, liveCard, meta, metaLabel, title }) {
  return (
    <div className="travel-tools-hero">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={labelledBy}>{title}</h2>
        <p>{description}</p>
        {meta && (
          <div className="travel-tools-hero-meta" aria-label={metaLabel}>
            {meta}
          </div>
        )}
      </div>
      {liveCard && <div className="travel-tools-hero-actions">{liveCard}</div>}
    </div>
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
// PackingListTools renders the main screen and handles nearby interactions.
function PackingListTools() {
  const [packingListSearch, setPackingListSearch] = useState('');
  const [packingTemplateSearch, setPackingTemplateSearch] = useState('');
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
    customTemplates,
    error,
    filteredItems,
    filteredTemplateItems,
    filters,
    handleCancelListTitleEdit,
    handleCancelTemplateDescriptionEdit,
    handleCancelTemplateTitleEdit,
    handleCreateList,
    handleEditItem,
    handleEditTemplateItem,
    handleItemFormChange,
    handleOpenAddItem,
    handleOpenAddTemplateItem,
    handleOpenSaveTemplateModal,
    handlePackingListTripChange,
    handleReminderDaysChange,
    handleSaveCurrentListAsTemplate,
    handleSaveItem,
    handleSaveListTitle,
    handleSaveTemplateDescription,
    handleSaveTemplateTitle,
    handleStartListTitleEdit,
    handleStartTemplateDescriptionEdit,
    handleTemplatePageChange,
    handleTemplateSaveFormChange,
    handleTemplateSelect,
    handleTemplateWorkspaceSelect,
    handleTogglePacked,
    isEditingListTitle,
    isEditingTemplateDescription,
    isEditingTemplateTitle,
    isLoading,
    isPackingReminderEnabled,
    isSaving,
    isTemplateModalOpen,
    itemForm,
    itemFormError,
    itemModalMode,
    listTitleDraft,
    packingLists,
    progress,
    remainingItems,
    reminderDays,
    runConfirmedAction,
    selectedList,
    selectedTemplate,
    selectedTemplateId,
    setConfirmAction,
    setCreateForm,
    setCreateFormError,
    setCreateMode,
    setFilters,
    setListTitleDraft,
    setSelectedListId,
    setSelectedTemplateId,
    setTemplateDescriptionDraft,
    setTemplateEditError,
    setTemplateFilters,
    setTemplateTitleDraft,
    statusScope,
    successMessage,
    templateDescriptionDraft,
    templateEditError,
    templateEditForm,
    templateFilters,
    templateSaveError,
    templateSaveForm,
    templateTitleDraft,
    templates,
    trips,
    visibleTemplates,
  } = useTravelToolsPage();

  const linkedTrip = selectedList?.tripId
    ? trips.find((trip) => String(trip._id) === String(selectedList.tripId))
    : null;
  const linkedTripName = selectedList?.tripId
    ? (linkedTrip ? getTripOptionLabel(linkedTrip) : selectedList.destination || 'Linked trip unavailable')
    : 'Not linked';
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
  const filteredCustomTemplates = customTemplates.filter((template) => {
    const normalizedSearch = packingTemplateSearch.toLowerCase().trim();
    if (!normalizedSearch) return true;
    return [template.title, template.description].some((value) => value?.toLowerCase().includes(normalizedSearch));
  });
  return (
    <TravelToolsPageFrame labelledBy="packing-title" className="travel-tools-enhanced-page">
      <TravelToolsHero
        labelledBy="packing-title"
        eyebrow="Trip checklist"
        title="Packing Lists"
        description="Plan what to bring, tick items as packed, and reuse templates for future trips."
        metaLabel="Packing list summary"
        meta={
          <>
            <span>
              <ListChecks size={15} aria-hidden="true" />
              {packingLists.length} list{packingLists.length === 1 ? '' : 's'}
            </span>
            <span>
              <CheckCircle2 size={15} aria-hidden="true" />
              {progress.packedItems || 0} packed
            </span>
            <span className={remainingItems ? 'travel-tools-hero-health-warning' : 'travel-tools-hero-health-ready'}>
              <CircleAlert size={15} aria-hidden="true" />
              {remainingItems} remaining
            </span>
          </>
        }
        liveCard={
          <div className="travel-tools-live-card">
            <span>Current progress</span>
            <strong>{progress.percent || 0}%</strong>
            <small>{selectedList?.title || 'No list selected'}</small>
          </div>
        }
      />

      <datalist id="packing-category-options">
        {categoryOptions.map((category) => (
          <option key={category} value={category}>
            {formatPackingCategory(category)}
          </option>
        ))}
      </datalist>

      <form className="travel-tools-create-panel packing-create-panel" onSubmit={handleCreateList}>
        <div className="travel-tools-panel-heading">
          <div>
            <span>Create a packing list</span>
            <h3>Create a list manually or start from a packing template.</h3>
          </div>
          <button className="secondary-action" type="submit" disabled={isSaving}>
            <Plus size={17} aria-hidden="true" />
            Create
          </button>
        </div>

        <div className="packing-create-mode packing-create-card-mode" role="group" aria-label="Create packing list type">
          <button
            className={createMode === 'manual' ? 'active' : ''}
            type="button"
            onClick={() => {
              setCreateFormError('');
              setCreateMode('manual');
              setCreateForm((current) => ({ ...current, templateKey: '' }));
            }}
          >
            <span className="packing-create-option-icon">
              <Edit3 size={24} aria-hidden="true" />
            </span>
            <span>
              <strong>Create manually</strong>
              <small>Start with a blank list</small>
            </span>
          </button>
          <button
            className={createMode === 'template' ? 'active' : ''}
            type="button"
            onClick={() => {
              setCreateFormError('');
              setCreateMode('template');
            }}
          >
            <span className="packing-create-option-icon packing-create-option-icon-blue">
              <ListChecks size={24} aria-hidden="true" />
            </span>
            <span>
              <strong>Use template</strong>
              <small>Choose from saved templates</small>
            </span>
          </button>
        </div>

        {createMode === 'template' && (
          <div className="travel-tools-template-carousel document-template-carousel" aria-label="Packing templates">
            <button
              className="travel-tools-template-arrow"
              type="button"
              onClick={() => handleTemplatePageChange('previous')}
              aria-label="Previous templates"
              disabled={templates.length <= 3}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <div className="document-template-picker" aria-label="Packing list templates">
              {visibleTemplates.map((template) => {
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
                  </article>
                );
              })}
            </div>
            <button
              className="travel-tools-template-arrow"
              type="button"
              onClick={() => handleTemplatePageChange('next')}
              aria-label="Next templates"
              disabled={templates.length <= 3}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        )}

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
        {createFormError && <p className="form-error travel-tools-status">{createFormError}</p>}
      </form>
      <div className="travel-tools-layout packing-dashboard-layout">
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

          <div className="travel-tools-side-section">
            <div className="travel-tools-panel-heading">
              <div>
                <span>View Templates</span>
                <h3>My Templates</h3>
              </div>
              <strong>{customTemplates.length}</strong>
            </div>
            <div className="travel-tools-filters travel-tools-template-filters packing-side-search">
              <span className="travel-tools-search-field">
                <Search size={16} aria-hidden="true" />
                <input
                  value={packingTemplateSearch}
                  onChange={(event) => setPackingTemplateSearch(event.target.value)}
                  placeholder="Search templates"
                />
              </span>
            </div>
            {customTemplates.length === 0 ? (
              <div className="packing-side-empty">
                <p>No saved templates yet.</p>
                <span aria-hidden="true">
                  <FileText size={28} />
                </span>
              </div>
            ) : filteredCustomTemplates.length === 0 ? (
              <p className="settings-empty">No templates match the current search.</p>
            ) : (
              <div className="travel-tools-list-stack">
                {filteredCustomTemplates.map((template) => (
                  <button
                    className={`travel-tools-list-card travel-tools-template-card ${selectedTemplateId === template.key ? 'active' : ''}`}
                    type="button"
                    key={template.key}
                    onClick={() => handleTemplateWorkspaceSelect(template)}
                  >
                    <span>{template.title}</span>
                    <small>
                      {(template.items || []).length} item{(template.items || []).length === 1 ? '' : 's'}
                    </small>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="travel-tools-main">
          {selectedTemplate ? (
            <section className="travel-tools-detail">
              <div className="packing-template-editor">
                <div className="travel-tools-detail-header">
                  <div>
                    <span className="travel-tools-workspace-label">Template workspace</span>
                    {isEditingTemplateTitle ? (
                      <form className="travel-tools-title-edit" onSubmit={handleSaveTemplateTitle}>
                        <input
                          value={templateTitleDraft}
                          onChange={(event) => setTemplateTitleDraft(event.target.value)}
                          aria-label="Packing template name"
                          autoFocus
                        />
                        <button type="submit" disabled={isSaving}>Save</button>
                        <button type="button" onClick={handleCancelTemplateTitleEdit}>Cancel</button>
                      </form>
                  ) : (
                    <div className="travel-tools-title-row">
                      <h3>{templateEditForm.title}</h3>
                    </div>
                  )}
                    <p>
                      {templateEditForm.items.length} template item{templateEditForm.items.length === 1 ? '' : 's'}
                    </p>
                    <div className="travel-tools-workspace-meta" aria-label="Packing template details">
                      <span>{selectedTemplate.source === 'custom' ? 'Custom template' : 'System template'}</span>
                    </div>
                  </div>
                  <details className="travel-tools-actions-menu">
                    <summary>
                      <MoreVertical size={17} aria-hidden="true" />
                      More
                    </summary>
                    <div>
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ type: 'duplicate-template', template: selectedTemplate })}
                        disabled={isSaving}
                      >
                        <Copy size={16} aria-hidden="true" />
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ type: 'delete-template', template: selectedTemplate })}
                        disabled={isSaving}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </details>
                </div>

                <div className="packing-template-description">
                  <div className="packing-template-description-summary">
                    <span className="packing-template-description-heading">Template description</span>
                    <div className="packing-template-description-box">
                      <textarea
                        value={
                          isEditingTemplateDescription
                            ? templateDescriptionDraft
                            : templateEditForm.description || 'No description added yet.'
                        }
                        onChange={(event) => {
                          if (!isEditingTemplateDescription) return;
                          setTemplateEditError('');
                          setTemplateDescriptionDraft(event.target.value);
                        }}
                        placeholder="Template description"
                        rows="4"
                        readOnly={!isEditingTemplateDescription}
                        autoFocus={isEditingTemplateDescription}
                      />
                      {!isEditingTemplateDescription && (
                        <button
                          type="button"
                          onClick={handleStartTemplateDescriptionEdit}
                          aria-label="Edit template description"
                        >
                          <Edit3 size={16} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                  {isEditingTemplateDescription && (
                    <div className="packing-template-description-actions">
                      <button className="secondary-action" type="button" onClick={handleCancelTemplateDescriptionEdit}>
                        Cancel
                      </button>
                      <button className="primary-action" type="button" onClick={handleSaveTemplateDescription} disabled={isSaving}>
                        Save
                      </button>
                    </div>
                  )}
                </div>

                <div className="packing-workspace-controls packing-template-controls">
                  <div className="travel-tools-filters travel-tools-template-filters">
                    <span className="travel-tools-search-field">
                      <Search size={16} aria-hidden="true" />
                      <input
                        value={templateFilters.search}
                        onChange={(event) => setTemplateFilters((current) => ({ ...current, search: event.target.value }))}
                        placeholder="Search items"
                      />
                    </span>
                    <select value={templateFilters.category} onChange={(event) => setTemplateFilters((current) => ({ ...current, category: event.target.value }))}>
                      <option value="">All categories</option>
                      {packingCategories.map((category) => (
                        <option key={category} value={category}>{formatPackingCategory(category)}</option>
                      ))}
                    </select>
                  </div>

                  {filteredTemplateItems.length === 0 ? (
                    <p className="settings-empty packing-template-empty">No template items match the current filters.</p>
                  ) : (
                    <div className="travel-tools-item-list packing-template-item-list">
                      {filteredTemplateItems.map((item) => {
                        const CategoryIcon = getCategoryIcon(item.category);
                        return (
                          <article className={item.isPacked ? 'packing-template-item-card packed' : 'packing-template-item-card'} key={item.id || item.index}>
                            <div>
                              <div className="travel-tools-item-title-row">
                                <strong>{item.name}</strong>
                              </div>
                              <span className="travel-tools-item-category packing-template-item-category">
                                <CategoryIcon size={14} aria-hidden="true" />
                                {formatPackingCategory(item.category)}
                              </span>
                            </div>
                            <div className="travel-tools-item-meta" aria-label="Template item quantity">
                              <span className="travel-tools-quantity">Qty {item.quantity}</span>
                            </div>
                            <button type="button" onClick={() => handleEditTemplateItem(item.index)} aria-label="Edit template item">
                              <Edit3 size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmAction({ type: 'delete-template-item', item, itemIndex: item.index })}
                              aria-label="Remove template item"
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="travel-tools-add-row">
                  <button className="primary-action" type="button" onClick={handleOpenAddTemplateItem}>
                    <Plus size={17} aria-hidden="true" />
                    Add item
                  </button>
                </div>

                {statusScope === 'template' && error && <p className="form-error travel-tools-status">{error}</p>}
                {templateEditError && <p className="form-error travel-tools-status">{templateEditError}</p>}
                {statusScope === 'template' && successMessage && <p className="form-success travel-tools-status">{successMessage}</p>}
              </div>
            </section>
          ) : selectedList ? (
            <section className="travel-tools-detail packing-workspace-detail">
              <div className="travel-tools-detail-header">
                <div>
                  <span className="travel-tools-workspace-label">Packing Workspace</span>
                  {isEditingListTitle ? (
                    <form className="travel-tools-title-edit" onSubmit={handleSaveListTitle}>
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
                    <div className="travel-tools-title-row">
                      <h3>{selectedList.title}</h3>
                    </div>
                  )}
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

              <div className="packing-workspace-fields">
                <label className="packing-title-field">
                  <span>List title</span>
                  <span className="packing-title-input">
                    <input value={selectedList.title} readOnly aria-label="Current packing list title" />
                    <button type="button" onClick={handleStartListTitleEdit} aria-label="Edit packing list name">
                      <Edit3 size={16} aria-hidden="true" />
                    </button>
                  </span>
                </label>
                <div className="packing-trip-link-panel">
                  <label>
                    <span className="travel-tools-field-label">
                      Link trip (optional)
                      {renderTip('Choose a trip to link this list or select "None" to unlink it.')}
                    </span>
                    <select value={selectedList.tripId || ''} onChange={handlePackingListTripChange} disabled={isSaving}>
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
                </div>
              </div>

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
                        <button type="button" onClick={() => handleEditItem(item)} aria-label="Edit item">
                          <Edit3 size={16} aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => setConfirmAction({ type: 'delete-item', list: selectedList, item })} aria-label="Delete item">
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {statusScope === 'packing' && error && <p className="form-error travel-tools-status">{error}</p>}
              {statusScope === 'packing' && successMessage && <p className="form-success travel-tools-status">{successMessage}</p>}
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
    </TravelToolsPageFrame>
  );
}

function TravelDocumentTools() {
  const [documents, setDocuments] = useState([]);
  const [documentTemplates, setDocumentTemplates] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [trips, setTrips] = useState([]);
  const [filters, setFilters] = useState({ search: '' });
  const [documentItemFilters, setDocumentItemFilters] = useState({ search: '', type: '' });
  const [createMode, setCreateMode] = useState('manual');
  const [createForm, setCreateForm] = useState({ name: '', tripId: '', templateKey: '' });
  const [itemForm, setItemForm] = useState({ name: '', documentType: 'Passport', uploadLabel: '' });
  const [templateSaveForm, setTemplateSaveForm] = useState({ name: '', description: '' });
  const [templateSaveError, setTemplateSaveError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isDocumentItemModalOpen, setIsDocumentItemModalOpen] = useState(false);
  const [expandedFile, setExpandedFile] = useState(null);
  const [templatePage, setTemplatePage] = useState(0);
  const [isEditingDocumentName, setIsEditingDocumentName] = useState(false);
  const [documentNameDraft, setDocumentNameDraft] = useState('');
  const [openTemplateMenuId, setOpenTemplateMenuId] = useState('');
  const [editingDocumentTemplate, setEditingDocumentTemplate] = useState(null);
  const [templateEditDraft, setTemplateEditDraft] = useState({ name: '', description: '', items: [] });
  const [templateEditBaseline, setTemplateEditBaseline] = useState('');
  const [previousDocumentId, setPreviousDocumentId] = useState('');

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

  const fileCount = documents.reduce(
    (total, document) =>
      total + document.files.length + (document.items || []).reduce((itemTotal, item) => itemTotal + item.files.length, 0),
    0
  );
  const linkedCount = documents.filter((document) => document.tripId).length;
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
  const visibleDocumentTemplates = useMemo(() => {
    if (documentTemplates.length <= 3) return documentTemplates;
    return Array.from({ length: 3 }, (_, index) => documentTemplates[(templatePage + index) % documentTemplates.length]);
  }, [documentTemplates, templatePage]);
  const isEditingTemplateDirty = JSON.stringify(templateEditDraft) !== templateEditBaseline;

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
      setFormError('Document list name is required.');
      return;
    }

    if (createMode === 'template' && !createForm.templateKey) {
      setFormError('Choose a template to create this document list.');
      return;
    }

    setIsSaving(true);
    setFormError('');
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
      setFormError(getErrorMessage(requestError));
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
      setIsDocumentItemModalOpen(false);
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
    setIsEditingDocumentName(true);
    setFormError('');
    setSuccessMessage('');
  };

  const handleCancelDocumentNameEdit = () => {
    setIsEditingDocumentName(false);
    setDocumentNameDraft('');
  };

  const handleSaveDocumentName = async (event) => {
    event.preventDefault();
    if (!selectedDocument) return;

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

    setIsSaving(true);
    setFormError('');
    setSuccessMessage('');

    try {
      const response = await updateTravelDocument(selectedDocument.id, { name: documentNameDraft.trim() });
      replaceDocument(response.data.data.document);
      setIsEditingDocumentName(false);
      setDocumentNameDraft('');
      setSuccessMessage('Document list name updated.');
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDocumentTripChange = async (event) => {
    if (!selectedDocument) return;
    const tripId = event.target.value;
    setIsSaving(true);
    setFormError('');
    setSuccessMessage('');

    try {
      const response = await updateTravelDocument(selectedDocument.id, { tripId: tripId || null });
      replaceDocument(response.data.data.document);
      setSuccessMessage(tripId ? 'Travel document linked to trip.' : 'Travel document unlinked from trip.');
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplatePageChange = (direction) => {
    if (documentTemplates.length <= 3) return;
    setTemplatePage((current) => {
      if (direction === 'previous') return current === 0 ? documentTemplates.length - 1 : current - 1;
      return current === documentTemplates.length - 1 ? 0 : current + 1;
    });
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
    setPreviousDocumentId(selectedDocumentId);
    setEditingDocumentTemplate(template);
    setTemplateEditDraft(draft);
    setTemplateEditBaseline(JSON.stringify(draft));
    setOpenTemplateMenuId('');
    setFormError('');
    setSuccessMessage('');
  };

  const handleBackFromDocumentTemplateEdit = () => {
    setEditingDocumentTemplate(null);
    setTemplateEditDraft({ name: '', description: '', items: [] });
    setTemplateEditBaseline('');
    setSelectedDocumentId(previousDocumentId || selectedDocumentId);
    setPreviousDocumentId('');
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
      const nextDraft = mapTemplateForWorkspaceEdit(nextTemplate);

      setDocumentTemplates((current) =>
        current.map((candidate) => (candidate.key === editingDocumentTemplate.key ? nextTemplate : candidate))
      );
      setEditingDocumentTemplate(nextTemplate);
      setTemplateEditDraft(nextDraft);
      setTemplateEditBaseline(JSON.stringify(nextDraft));
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
      setIsTemplateModalOpen(false);
      setTemplateSaveForm({ name: '', description: '' });
      setSuccessMessage('Travel document saved as template.');
    } catch (requestError) {
      setTemplateSaveError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    setIsSaving(true);
    setFormError('');
    setSuccessMessage('');

    try {
      if (confirmAction.type === 'duplicate-document') {
        const response = await duplicateTravelDocument(confirmAction.document.id, {
          name: getDuplicateDocumentName(confirmAction.document.name),
        });
        const nextDocument = normalizeTravelDocumentForUi(response.data.data.document);
        setDocuments((current) => [nextDocument, ...current]);
        setSelectedDocumentId(nextDocument.id);
        setSuccessMessage('Travel document duplicated.');
      }

      if (confirmAction.type === 'delete-document') {
        await deleteTravelDocument(confirmAction.document.id);
        setExpandedFile(null);
        setDocuments((current) => {
          const nextDocuments = current.filter((document) => document.id !== confirmAction.document.id);
          setSelectedDocumentId(nextDocuments[0]?.id || '');
          return nextDocuments;
        });
        setSuccessMessage('Travel document deleted.');
      }

      if (confirmAction.type === 'delete-document-item') {
        const response = await deleteTravelDocumentItem(confirmAction.document.id, confirmAction.item.id);
        replaceDocument(response.data.data.document);
        setSuccessMessage('Document item deleted.');
      }

      if (confirmAction.type === 'delete-document-template') {
        await deleteTravelDocumentTemplate(confirmAction.template.key);
        setDocumentTemplates((current) => current.filter((template) => template.key !== confirmAction.template.key));
        if (editingDocumentTemplate?.key === confirmAction.template.key) {
          handleBackFromDocumentTemplateEdit();
        }
        setSuccessMessage('Document template deleted.');
      }

      setConfirmAction(null);
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
    <TravelToolsPageFrame labelledBy="travel-document-title" className="travel-tools-enhanced-page">
      {isSaving && (
        <div className="travel-tools-busy-overlay" role="status" aria-live="polite">
          <span className="travel-tools-spinner" aria-hidden="true" />
          <strong>Processing...</strong>
        </div>
      )}
      <TravelToolsHero
        labelledBy="travel-document-title"
        eyebrow="Trip files"
        title="Travel Document"
        description="Store copies of passports, visas, tickets, bookings, and images for each trip."
        metaLabel="Travel document summary"
        meta={
          <>
            <span>
              <FileText size={15} aria-hidden="true" />
              {documents.length} document{documents.length === 1 ? '' : 's'}
            </span>
            <span>
              <Upload size={15} aria-hidden="true" />
              {fileCount} file{fileCount === 1 ? '' : 's'}
            </span>
            <span className={linkedCount ? 'travel-tools-hero-health-ready' : 'travel-tools-hero-health-warning'}>
              <CircleAlert size={15} aria-hidden="true" />
              {linkedCount} linked
            </span>
          </>
        }
        liveCard={
          <div className="travel-tools-live-card">
            <span>Packing Workspace</span>
            <strong>{selectedDocument?.items.length || 0}</strong>
            <small>{selectedDocument?.name || 'No document selected'}</small>
          </div>
        }
      />

      <form className="travel-tools-create-panel" onSubmit={handleCreateDocument}>
        <div className="travel-tools-panel-heading">
          <div>
            <span>Create document list</span>
            <h3>Create a list manually or start from a document template</h3>
          </div>
          <button className="secondary-action" type="submit" disabled={isSaving}>
            <Plus size={17} aria-hidden="true" />
            Create
          </button>
        </div>

        <div className="packing-create-mode" role="group" aria-label="Create document list type">
          <button
            className={createMode === 'manual' ? 'active' : ''}
            type="button"
            onClick={() => {
              setCreateMode('manual');
              setCreateForm((current) => ({ ...current, templateKey: '' }));
              setFormError('');
            }}
          >
            Manual
          </button>
          <button
            className={createMode === 'template' ? 'active' : ''}
            type="button"
            onClick={() => {
              setCreateMode('template');
              setFormError('');
            }}
          >
            Use template
          </button>
        </div>

        {createMode === 'template' && (
          <div className="travel-tools-template-carousel document-template-carousel">
            <button
              className="travel-tools-template-arrow"
              type="button"
              onClick={() => handleTemplatePageChange('previous')}
              aria-label="Previous document templates"
              disabled={documentTemplates.length <= 3}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <div className="document-template-picker" aria-label="Document list templates">
              {visibleDocumentTemplates.map((template) => {
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
                        setFormError('');
                      }}
                    >
                      <span>{template.source === 'custom' ? 'Saved custom template' : 'Standard template'}</span>
                      <strong>{template.name || template.title}</strong>
                      <small>{template.description || 'Reusable document list template.'}</small>
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
            <button
              className="travel-tools-template-arrow"
              type="button"
              onClick={() => handleTemplatePageChange('next')}
              aria-label="Next document templates"
              disabled={documentTemplates.length <= 3}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        )}

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
                  setFormError('');
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
        {formError && <p className="form-error travel-tools-status">{formError}</p>}
      </form>

      <div className="travel-tools-layout">
        <aside className="travel-tools-list-panel">
          <div className="travel-tools-panel-heading">
            <div>
              <span>View document lists</span>
              <h3>My Document Lists</h3>
            </div>
            <strong>{documents.length}</strong>
          </div>

          <div className="travel-tools-filters travel-tools-template-filters">
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
          ) : filteredDocuments.length === 0 ? (
            <p className="settings-empty">No travel documents match the current filters.</p>
          ) : (
            <div className="travel-tools-list-stack">
              {filteredDocuments.map((document) => (
                <button
                  className={`travel-tools-list-card ${selectedDocument?.id === document.id ? 'active' : ''}`}
                  type="button"
                  key={document.id}
                  onClick={() => setSelectedDocumentId(document.id)}
                >
                  <span>{document.name}</span>
                  <small>{document.items.length} item{document.items.length === 1 ? '' : 's'}</small>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="travel-tools-main">
          {editingDocumentTemplate ? (
            <section className="travel-tools-detail">
              <div className="travel-tools-detail-header">
                <div>
                  <span className="travel-tools-workspace-label">Template workspace</span>
                  <div className="travel-tools-title-row">
                    <h3>{templateEditDraft.name || 'Untitled template'}</h3>
                  </div>
                  <p>{templateEditDraft.items.length} document item{templateEditDraft.items.length === 1 ? '' : 's'}</p>
                </div>
                <div className="travel-tools-actions">
                  <button type="button" onClick={handleBackFromDocumentTemplateEdit} disabled={isSaving}>
                    <ChevronLeft size={16} aria-hidden="true" />
                    Back
                  </button>
                  <button
                    className="primary-action"
                    type="button"
                    onClick={handleSaveDocumentTemplateEdit}
                    disabled={isSaving || !isEditingTemplateDirty}
                  >
                    Save
                  </button>
                </div>
              </div>

              {(successMessage || formError) && (
                <div className="travel-tools-sticky-status">
                  {successMessage && <p className="form-success travel-tools-status">{successMessage}</p>}
                  {formError && <p className="form-error travel-tools-status">{formError}</p>}
                </div>
              )}

              <div className="travel-document-template-editor travel-tools-form-grid">
                <label>
                  <span className="travel-tools-field-label">Template name</span>
                  <input
                    value={templateEditDraft.name}
                    onChange={(event) => setTemplateEditDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Europe Vacation"
                  />
                </label>
                <label>
                  <span className="travel-tools-field-label">Description</span>
                  <input
                    value={templateEditDraft.description}
                    onChange={(event) => setTemplateEditDraft((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Reusable document list template"
                  />
                </label>
              </div>

              <div className="travel-tools-item-list travel-tools-document-file-list">
                {templateEditDraft.items.map((item, index) => (
                  <article className="travel-document-list-item" key={item.id}>
                    <div className="document-template-item-edit">
                      <input
                        value={item.name}
                        onChange={(event) => handleTemplateDraftItemChange(index, 'name', event.target.value)}
                        placeholder="Passport"
                      />
                      <select
                        value={item.documentType}
                        onChange={(event) => handleTemplateDraftItemChange(index, 'documentType', event.target.value)}
                      >
                        {documentItemTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <input
                        value={item.uploadLabel}
                        onChange={(event) => handleTemplateDraftItemChange(index, 'uploadLabel', event.target.value)}
                        placeholder="Upload scan"
                      />
                    </div>
                    <button type="button" onClick={() => handleRemoveTemplateDraftItem(index)} aria-label={`Remove ${item.name || 'template item'}`}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </div>

              <div className="travel-tools-add-row">
                <button className="secondary-action" type="button" onClick={handleAddTemplateDraftItem}>
                  <Plus size={16} aria-hidden="true" />
                  Add item
                </button>
              </div>
            </section>
          ) : selectedDocument ? (
            <section className="travel-tools-detail">
              <div className="travel-tools-detail-header">
                <div>
                  <span className="travel-tools-workspace-label">Document workspace</span>
                  {isEditingDocumentName ? (
                    <form className="travel-tools-title-edit" onSubmit={handleSaveDocumentName}>
                      <input
                        value={documentNameDraft}
                        onChange={(event) => setDocumentNameDraft(event.target.value)}
                        aria-label="Document list name"
                        autoFocus
                      />
                      <button type="submit" disabled={isSaving}>Save</button>
                      <button type="button" onClick={handleCancelDocumentNameEdit}>Cancel</button>
                    </form>
                  ) : (
                    <div className="travel-tools-title-row">
                      <h3>{selectedDocument.name}</h3>
                      <button type="button" onClick={handleStartDocumentNameEdit} aria-label="Edit document list name">
                        <Edit3 size={17} aria-hidden="true" />
                      </button>
                    </div>
                  )}
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

              {(successMessage || formError) && (
                <div className="travel-tools-sticky-status">
                  {successMessage && <p className="form-success travel-tools-status">{successMessage}</p>}
                  {formError && <p className="form-error travel-tools-status">{formError}</p>}
                </div>
              )}

              <div className="packing-trip-link-panel">
                <label>
                  <span className="travel-tools-field-label">
                    Link trip
                    {renderTip('Choose a trip to link this document list or select "None" to unlink it.')}
                  </span>
                  <select value={selectedDocument.tripId || ''} onChange={handleDocumentTripChange} disabled={isSaving}>
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
              </div>

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
                <p className="settings-empty">
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
                          <Upload size={14} aria-hidden="true" />
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
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ type: 'delete-document-item', document: selectedDocument, item })}
                        aria-label={`Delete ${item.name}`}
                        disabled={isSaving}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                      <label className="secondary-action travel-document-row-upload">
                        <Upload size={16} aria-hidden="true" />
                        Upload
                        <input type="file" multiple accept={acceptedTravelDocumentInput} onChange={(event) => handleFileUpload(event, item.id)} disabled={isSaving} />
                      </label>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="travel-tools-detail travel-tools-empty-detail">
              <FileText size={34} aria-hidden="true" />
              <h3>Create your first travel document</h3>
              <p>Add a document record, then upload images or files into its workspace.</p>
            </section>
          )}
        </div>
      </div>

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

    </TravelToolsPageFrame>
  );
}

function TravelToolsPage({ mode = 'packing' }) {
  if (mode === 'documents') return <TravelDocumentTools />;
  return <PackingListTools />;
}

export default TravelToolsPage;

