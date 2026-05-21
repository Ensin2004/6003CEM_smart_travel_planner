import {
  Bell,
  Bot,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  Copy,
  Download,
  Edit3,
  FileText,
  Image,
  ListChecks,
  Luggage,
  Maximize2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getTrips } from '../../api/tripApi';
import {
  formatPackingCategory,
  formatPriorityLevel,
  getPriorityClassName,
  packingCategories,
  priorityLevels,
} from './travelTools.constants';
import { useTravelToolsPage } from './hooks/useTravelToolsPage';
import { getCategoryIcon } from './travelTools.utils';
import './TravelToolsPage.css';

const documentTypes = ['Passport', 'Visa', 'Insurance', 'Ticket', 'Booking', 'Custom'];
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

const starterDocuments = [
  { id: 'passport-copy', name: 'Passport copy', type: 'Passport', tripId: '', files: [] },
  { id: 'travel-insurance', name: 'Travel insurance', type: 'Insurance', tripId: '', files: [] },
];

function TravelToolsPageFrame({ labelledBy, children, className = '' }) {
  return (
    <section className={`travel-tools-page ${className}`.trim()} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}

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

const isAcceptedTravelDocumentFile = (file) => {
  const extension = getFileExtension(file.name);
  return acceptedTravelDocumentTypes.includes(file.type) || acceptedTravelDocumentExtensions.includes(extension);
};

const formatFileSize = (size) => {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / 1024).toFixed(1)} KB`;
};

function PackingListTools() {
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
    handleStartTemplateTitleEdit,
    handleTemplateDropdownChange,
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
    unpackedImportantCount,
    visibleTemplates,
  } = useTravelToolsPage();

  return (
    <TravelToolsPageFrame labelledBy="packing-title" className="travel-tools-enhanced-page">
      <TravelToolsHero
        labelledBy="packing-title"
        eyebrow="Trip checklist"
        title="Packing List"
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

      <form className="travel-tools-create-panel" onSubmit={handleCreateList}>
        <div className="travel-tools-panel-heading">
          <div>
            <span>Create packing list</span>
            <h3>Choose to create a packing list manually or select an existing template</h3>
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
              setCreateFormError('');
              setCreateMode('manual');
              setCreateForm((current) => ({ ...current, templateKey: '' }));
            }}
          >
            Manual
          </button>
          <button
            className={createMode === 'template' ? 'active' : ''}
            type="button"
            onClick={() => {
              setCreateFormError('');
              setCreateMode('template');
            }}
          >
            Use template
          </button>
        </div>

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
                <option value="">No linked trip</option>
                {trips.map((trip) => (
                  <option key={trip._id} value={trip._id}>
                    {getTripOptionLabel(trip)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {createMode === 'template' && (
            <div className="travel-tools-create-field">
              <label>
                <span className="travel-tools-field-label">
                  Template
                  {renderTip('Create a packing list from an existing template.')}
                </span>
                <select
                  name="templateKey"
                  value={createForm.templateKey}
                  onChange={(event) => {
                    setCreateFormError('');
                    handleTemplateDropdownChange(event);
                  }}
                >
                  <option value="">Choose template</option>
                  {templates.map((template) => (
                    <option key={template.key} value={template.key}>
                      {template.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
        {createFormError && <p className="form-error travel-tools-status">{createFormError}</p>}
      </form>

      {createMode === 'template' && (
        <div className="travel-tools-template-carousel" aria-label="Packing templates">
          <button
            className="travel-tools-template-arrow"
            type="button"
            onClick={() => handleTemplatePageChange('previous')}
            disabled={templates.length <= 5}
            aria-label="Previous templates"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <div className="travel-tools-templates">
            {visibleTemplates.map((template) => (
              <button
                className={createForm.templateKey === template.key ? 'active' : ''}
                type="button"
                key={template.key}
                onClick={() => handleTemplateSelect(template)}
              >
                <Sparkles size={17} aria-hidden="true" />
                <span>{template.title}</span>
                <small>
                  {template.source === 'custom' ? 'Custom template' : 'System template'} · {template.description}
                </small>
              </button>
            ))}
          </div>
          <button
            className="travel-tools-template-arrow"
            type="button"
            onClick={() => handleTemplatePageChange('next')}
            disabled={templates.length <= 5}
            aria-label="Next templates"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="travel-tools-layout">
        <aside className="travel-tools-list-panel">
          <div className="travel-tools-panel-heading">
            <div>
              <span>View lists</span>
              <h3>My Lists</h3>
            </div>
            <strong>{packingLists.length}</strong>
          </div>

          {isLoading ? (
            <p className="settings-empty">Loading packing lists...</p>
          ) : packingLists.length === 0 ? (
            <p className="settings-empty">No packing lists yet. Create one manually or start from a template.</p>
          ) : (
            <div className="travel-tools-list-stack">
              {packingLists.map((list) => {
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

          <div className="travel-tools-side-section">
            <div className="travel-tools-panel-heading">
              <div>
                <span>Templates</span>
                <h3>My Templates</h3>
              </div>
              <strong>{customTemplates.length}</strong>
            </div>
            {customTemplates.length === 0 ? (
              <p className="settings-empty">No saved templates yet.</p>
            ) : (
              <div className="travel-tools-list-stack">
                {customTemplates.map((template) => (
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
                        <button type="button" onClick={handleStartTemplateTitleEdit} aria-label="Edit packing template name">
                          <Edit3 size={17} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                    <p>
                      {templateEditForm.items.length} template item{templateEditForm.items.length === 1 ? '' : 's'}
                    </p>
                    <div className="travel-tools-workspace-meta" aria-label="Packing template details">
                      <span>{selectedTemplate.source === 'custom' ? 'Custom template' : 'System template'}</span>
                    </div>
                  </div>
                  <div className="travel-tools-actions">
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
                </div>

                <div className="packing-reminder packing-template-description">
                  <div className="packing-template-description-summary">
                    <div className="packing-template-description-heading">
                      <span>Template description</span>
                      <button
                        type="button"
                        onClick={handleStartTemplateDescriptionEdit}
                        aria-label="Edit template description"
                      >
                        <Edit3 size={16} aria-hidden="true" />
                      </button>
                    </div>
                    <p>{templateEditForm.description || 'No description added yet.'}</p>
                  </div>
                  {isEditingTemplateDescription && (
                    <div className="packing-template-description-editor">
                      <textarea
                        value={templateDescriptionDraft}
                        onChange={(event) => {
                          setTemplateEditError('');
                          setTemplateDescriptionDraft(event.target.value);
                        }}
                        placeholder="Template description"
                        rows="3"
                        autoFocus
                      />
                      <div className="packing-template-description-actions">
                        <button className="secondary-action" type="button" onClick={handleCancelTemplateDescriptionEdit}>
                          Cancel
                        </button>
                        <button className="primary-action" type="button" onClick={handleSaveTemplateDescription} disabled={isSaving}>
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>

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
                  <select value={templateFilters.priority} onChange={(event) => setTemplateFilters((current) => ({ ...current, priority: event.target.value }))}>
                    <option value="">All priority</option>
                    {priorityLevels.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                  </select>
                </div>

                {filteredTemplateItems.length === 0 ? (
                  <p className="settings-empty">No template items match the current filters.</p>
                ) : (
                  <div className="travel-tools-item-list packing-template-item-list">
                    {filteredTemplateItems.map((item) => {
                      const CategoryIcon = getCategoryIcon(item.category);

                      return (
                        <article className={item.isPacked ? 'packing-template-item-card packed' : 'packing-template-item-card'} key={item.id || item.index}>
                          <div>
                            <div className="travel-tools-item-title-row">
                              <strong>{item.name}</strong>
                              <span className={getPriorityClassName(item.priority)}>{formatPriorityLevel(item.priority)}</span>
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
            <section className="travel-tools-detail">
              <div className="travel-tools-detail-header">
                <div>
                  <span className="travel-tools-workspace-label">Packing workspace</span>
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
                      <button type="button" onClick={handleStartListTitleEdit} aria-label="Edit packing list name">
                        <Edit3 size={17} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  <p>
                    {progress.packedItems}/{progress.totalItems} items packed
                  </p>
                  <div className="travel-tools-workspace-meta" aria-label="Packing list trip details">
                    <span>Trip linked: {selectedList.tripId ? 'Linked' : 'Not linked'}</span>
                  </div>
                </div>
                <div className="travel-tools-actions">
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
              </div>

              <div className="packing-progress" aria-label="Packing progress">
                <span style={{ width: `${progress.percent || 0}%` }} />
              </div>

              <div className="packing-trip-link-panel">
                <label>
                  <span className="travel-tools-field-label">
                    Link trip
                    {renderTip('Choose a trip to link this list or select "No linked trip" to unlink it.')}
                  </span>
                  <select value={selectedList.tripId || ''} onChange={handlePackingListTripChange} disabled={isSaving}>
                    <option value="">No linked trip</option>
                    {trips.map((trip) => (
                      <option key={trip._id} value={trip._id}>
                        {getTripOptionLabel(trip)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

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
                {unpackedImportantCount > 0 && (
                  <small>
                    {unpackedImportantCount} High priority item{unpackedImportantCount === 1 ? '' : 's'} still unpacked.
                  </small>
                )}
              </div>

              <div className="travel-tools-filters">
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
                <select value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
                  <option value="">All priority</option>
                  {priorityLevels.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </div>

              {filteredItems.length === 0 ? (
                <p className="settings-empty">No packing items match the current filters.</p>
              ) : (
                <div className="travel-tools-item-list">
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
                          <span className={getPriorityClassName(item.priority)}>{formatPriorityLevel(item.priority)}</span>
                        </div>
                        <span className="travel-tools-item-category">
                          {(() => {
                            const CategoryIcon = getCategoryIcon(item.category);
                            return <CategoryIcon size={14} aria-hidden="true" />;
                          })()}
                          {formatPackingCategory(item.category)}
                        </span>
                      </div>
                      <div className="travel-tools-item-meta" aria-label="Item quantity and priority">
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

              <div className="travel-tools-add-row">
                <button className="primary-action" type="button" onClick={handleOpenAddItem}>
                  <Plus size={17} aria-hidden="true" />
                  Add item
                </button>
              </div>

              {statusScope === 'packing' && error && <p className="form-error travel-tools-status">{error}</p>}
              {statusScope === 'packing' && successMessage && <p className="form-success travel-tools-status">{successMessage}</p>}
            </section>
          ) : (
            <section className="travel-tools-detail travel-tools-empty-detail">
              <Luggage size={34} aria-hidden="true" />
              <h3>Create your first packing list</h3>
              <p>Choose manual creation or start from a ready-made template.</p>
              {statusScope === 'packing' && error && <p className="form-error travel-tools-status">{error}</p>}
              {statusScope === 'packing' && successMessage && <p className="form-success travel-tools-status">{successMessage}</p>}
            </section>
          )}
        </div>
      </div>

      <button className="travel-tools-ai-floating" type="button" disabled>
        <Bot size={20} aria-hidden="true" />
        <span>Ask AI</span>
      </button>

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
              Priority
              <select name="priority" value={itemForm.priority} onChange={handleItemFormChange}>
                {priorityLevels.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
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
  const [documents, setDocuments] = useState(starterDocuments);
  const [selectedDocumentId, setSelectedDocumentId] = useState(starterDocuments[0].id);
  const [trips, setTrips] = useState([]);
  const [filters, setFilters] = useState({ search: '', type: '' });
  const [createForm, setCreateForm] = useState({ name: '', type: 'Passport', tripId: '' });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedFile, setExpandedFile] = useState(null);
  const objectUrlsRef = useRef(new Set());

  useEffect(() => {
    let isMounted = true;
    getTrips()
      .then((response) => {
        if (isMounted) setTrips(response.data.data.trips || []);
      })
      .catch(() => {
        if (isMounted) setTrips([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) || documents[0],
    [documents, selectedDocumentId]
  );

  const fileCount = documents.reduce((total, document) => total + document.files.length, 0);
  const linkedCount = documents.filter((document) => document.tripId).length;
  const filteredDocuments = documents.filter((document) => {
    const matchesSearch = document.name.toLowerCase().includes(filters.search.toLowerCase().trim());
    const matchesType = !filters.type || document.type === filters.type;
    return matchesSearch && matchesType;
  });

  const handleCreateDocument = (event) => {
    event.preventDefault();

    if (!createForm.name.trim()) {
      setFormError('Document name is required.');
      return;
    }

    const nextDocument = {
      ...createForm,
      id: `document-${Date.now()}`,
      name: createForm.name.trim(),
      files: [],
    };

    setDocuments((current) => [nextDocument, ...current]);
    setSelectedDocumentId(nextDocument.id);
    setCreateForm({ name: '', type: 'Passport', tripId: '' });
    setFormError('');
    setSuccessMessage('Travel document created.');
  };

  const handleFileUpload = (event) => {
    const uploadedFiles = Array.from(event.target.files || []);
    if (!selectedDocument || uploadedFiles.length === 0) return;

    const acceptedFiles = uploadedFiles.filter(isAcceptedTravelDocumentFile);
    const rejectedCount = uploadedFiles.length - acceptedFiles.length;

    if (acceptedFiles.length === 0) {
      setFormError('Upload PNG, JPG, JPEG, PDF, Word, PowerPoint, or Excel files only.');
      event.target.value = '';
      return;
    }

    const nextFiles = acceptedFiles.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);

      return {
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        size: file.size,
        type: file.type || getFileExtension(file.name).slice(1).toUpperCase() || 'Unknown file',
        url,
        previewType: getTravelDocumentPreviewType(file),
      };
    });

    setDocuments((current) =>
      current.map((document) =>
        document.id === selectedDocument.id
          ? { ...document, files: [...document.files, ...nextFiles] }
          : document
      )
    );
    setFormError(rejectedCount ? `${rejectedCount} unsupported file${rejectedCount === 1 ? '' : 's'} skipped.` : '');
    setSuccessMessage(`${nextFiles.length} file${nextFiles.length === 1 ? '' : 's'} added to travel document.`);
    event.target.value = '';
  };

  const handleRemoveFile = (fileId) => {
    if (!selectedDocument) return;
    const fileToRemove = selectedDocument.files.find((file) => file.id === fileId);
    if (fileToRemove?.url) {
      URL.revokeObjectURL(fileToRemove.url);
      objectUrlsRef.current.delete(fileToRemove.url);
    }
    if (expandedFile?.id === fileId) setExpandedFile(null);
    setDocuments((current) =>
      current.map((document) =>
        document.id === selectedDocument.id
          ? { ...document, files: document.files.filter((file) => file.id !== fileId) }
          : document
      )
    );
  };

  const handleDeleteDocument = () => {
    if (!selectedDocument) return;
    selectedDocument.files.forEach((file) => {
      if (file.url) {
        URL.revokeObjectURL(file.url);
        objectUrlsRef.current.delete(file.url);
      }
    });
    setExpandedFile(null);
    setDocuments((current) => {
      const nextDocuments = current.filter((document) => document.id !== selectedDocument.id);
      setSelectedDocumentId(nextDocuments[0]?.id || '');
      return nextDocuments;
    });
    setSuccessMessage('Travel document deleted.');
  };

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
            <span>Current document</span>
            <strong>{selectedDocument?.files.length || 0}</strong>
            <small>{selectedDocument?.name || 'No document selected'}</small>
          </div>
        }
      />

      <form className="travel-tools-create-panel" onSubmit={handleCreateDocument}>
        <div className="travel-tools-panel-heading">
          <div>
            <span>Create travel document</span>
            <h3>Add a document record, then upload images or files inside the workspace</h3>
          </div>
          <button className="secondary-action" type="submit">
            <Plus size={17} aria-hidden="true" />
            Create
          </button>
        </div>

        <div className="travel-tools-form-grid travel-tools-form-grid-compact">
          <div className="travel-tools-create-field">
            <label>
              <span className="travel-tools-field-label">
                Document name
                {renderTip('Use a recognizable name such as "Passport scan" or "Hotel booking".')}
              </span>
              <input
                value={createForm.name}
                onChange={(event) => {
                  setFormError('');
                  setCreateForm((current) => ({ ...current, name: event.target.value }));
                }}
                placeholder="Passport scan"
              />
            </label>
          </div>
          <div className="travel-tools-create-field">
            <label>
              <span className="travel-tools-field-label">
                Document type
                {renderTip('Choose the closest category so documents are easier to filter later.')}
              </span>
              <select
                value={createForm.type}
                onChange={(event) => setCreateForm((current) => ({ ...current, type: event.target.value }))}
              >
                {documentTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
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
                <option value="">No linked trip</option>
                {trips.map((trip) => (
                  <option key={trip._id} value={trip._id}>{getTripOptionLabel(trip)}</option>
                ))}
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
              <span>View documents</span>
              <h3>My Documents</h3>
            </div>
            <strong>{documents.length}</strong>
          </div>

          <div className="travel-tools-filters travel-tools-template-filters">
            <span className="travel-tools-search-field">
              <Search size={16} aria-hidden="true" />
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search documents"
              />
            </span>
            <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
              <option value="">All document types</option>
              {documentTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {filteredDocuments.length === 0 ? (
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
                  <small>{document.type} · {document.files.length} file{document.files.length === 1 ? '' : 's'}</small>
                </button>
              ))}
            </div>
          )}

          <div className="travel-tools-side-section">
            <div className="travel-tools-panel-heading">
              <div>
                <span>Templates</span>
                <h3>Document Types</h3>
              </div>
              <strong>{documentTypes.length}</strong>
            </div>
            <div className="travel-tools-list-stack">
              {documentTypes.slice(0, 4).map((type) => (
                <button
                  className="travel-tools-list-card travel-tools-template-card"
                  type="button"
                  key={type}
                  onClick={() => setCreateForm((current) => ({ ...current, type, name: current.name || type }))}
                >
                  <span>{type}</span>
                  <small>Use as document type</small>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="travel-tools-main">
          {selectedDocument ? (
            <section className="travel-tools-detail">
              <div className="travel-tools-detail-header">
                <div>
                  <span className="travel-tools-workspace-label">Document workspace</span>
                  <div className="travel-tools-title-row">
                    <h3>{selectedDocument.name}</h3>
                  </div>
                  <p>{selectedDocument.files.length} uploaded file{selectedDocument.files.length === 1 ? '' : 's'}</p>
                  <div className="travel-tools-workspace-meta" aria-label="Travel document details">
                    <span>{selectedDocument.type}</span>
                    <span>{selectedDocument.tripId ? 'Trip linked' : 'Not linked'}</span>
                  </div>
                </div>
                <div className="travel-tools-actions">
                  <button type="button" disabled>
                    <Copy size={16} aria-hidden="true" />
                    Duplicate
                  </button>
                  <button type="button" onClick={handleDeleteDocument}>
                    <Trash2 size={16} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="travel-document-upload">
                <Upload size={28} aria-hidden="true" />
                <strong>Upload images or files</strong>
                <span>Accepted formats: PNG, JPG, JPEG, PDF, Word, PowerPoint, and Excel.</span>
                <label className="primary-action">
                  <Upload size={17} aria-hidden="true" />
                  Choose files
                  <input type="file" multiple accept={acceptedTravelDocumentInput} onChange={handleFileUpload} />
                </label>
              </div>

              {selectedDocument.files.length === 0 ? (
                <p className="settings-empty">No files uploaded yet. Add an image or document file to this workspace.</p>
              ) : (
                <div className="travel-tools-item-list travel-tools-document-file-list">
                  {selectedDocument.files.map((file) => (
                    <article key={file.id}>
                      <button
                        className="travel-document-preview-thumb"
                        type="button"
                        onClick={() => setExpandedFile(file)}
                        aria-label={`Preview ${file.name}`}
                      >
                        {file.previewType === 'image' || file.previewType === 'pdf' ? renderFilePreview(file) : (
                          <span className="travel-document-file-icon">
                            {file.previewType === 'pdf'
                              ? <FileText size={18} aria-hidden="true" />
                              : <Image size={18} aria-hidden="true" />}
                          </span>
                        )}
                        <Maximize2 size={14} aria-hidden="true" />
                      </button>
                      <div>
                        <div className="travel-tools-item-title-row">
                          <strong>{file.name}</strong>
                          <span className="priority-low">
                            {file.previewType === 'image' ? 'Image' : file.previewType === 'pdf' ? 'PDF' : 'File'}
                          </span>
                        </div>
                        <span className="travel-tools-item-category">
                          <CalendarClock size={14} aria-hidden="true" />
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <div className="travel-tools-item-meta" aria-label="Document file type">
                        <span className="travel-tools-quantity">{file.type}</span>
                      </div>
                      <a className="travel-document-download" href={file.url} download={file.name} aria-label={`Download ${file.name}`}>
                        <Download size={16} aria-hidden="true" />
                      </a>
                      <button type="button" onClick={() => handleRemoveFile(file.id)} aria-label="Remove file">
                        <X size={16} aria-hidden="true" />
                      </button>
                    </article>
                  ))}
                </div>
              )}

              {successMessage && <p className="form-success travel-tools-status">{successMessage}</p>}
              {formError && <p className="form-error travel-tools-status">{formError}</p>}
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

      <button className="travel-tools-ai-floating" type="button" disabled>
        <Bot size={20} aria-hidden="true" />
        <span>Ask AI</span>
      </button>
    </TravelToolsPageFrame>
  );
}

function TravelToolsPage({ mode = 'packing' }) {
  if (mode === 'documents') return <TravelDocumentTools />;
  return <PackingListTools />;
}

export default TravelToolsPage;
