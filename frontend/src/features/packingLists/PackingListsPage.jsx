import {
  Bell,
  Bot,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleAlert,
  Copy,
  Edit3,
  ListChecks,
  Luggage,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  formatPackingCategory,
  formatPriorityLevel,
  getPriorityClassName,
  packingCategories,
  priorityLevels,
} from './packingList.constants';
import { usePackingListsPage } from './hooks/usePackingListsPage';
import { getCategoryIcon } from './packingList.utils';
import './PackingListsPage.css';

function PackingListsPage() {
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
    handleToggleTemplateItemPacked,
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
    unpackedImportantCount,
    visibleTemplates,
  } = usePackingListsPage();

  return (
    <section className="packing-page" aria-labelledby="packing-title">
      <div className="packing-hero">
        <div>
          <p className="eyebrow">Trip checklist</p>
          <h2 id="packing-title">Packing List</h2>
          <p>Plan what to bring, tick items as packed, and reuse templates for future trips.</p>
          <div className="packing-hero-meta" aria-label="Packing list summary">
            <span>
              <ListChecks size={15} aria-hidden="true" />
              {packingLists.length} list{packingLists.length === 1 ? '' : 's'}
            </span>
            <span>
              <CheckCircle2 size={15} aria-hidden="true" />
              {progress.packedItems || 0} packed
            </span>
            <span className={remainingItems ? 'packing-hero-health-warning' : 'packing-hero-health-ready'}>
              <CircleAlert size={15} aria-hidden="true" />
              {remainingItems} remaining
            </span>
          </div>
        </div>
        <div className="packing-hero-actions">
          <div className="packing-live-card">
            <span>Current progress</span>
            <strong>{progress.percent || 0}%</strong>
            <small>{selectedList?.title || 'No list selected'}</small>
          </div>
        </div>
      </div>

      <datalist id="packing-category-options">
        {categoryOptions.map((category) => (
          <option key={category} value={category}>
            {formatPackingCategory(category)}
          </option>
        ))}
      </datalist>

      <form className="packing-create-panel" onSubmit={handleCreateList}>
        <div className="packing-panel-heading">
          <div>
            <span>Create packing list</span>
            <h3>Select a Method</h3>
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

        <div className="packing-form-grid packing-form-grid-compact">
          <label>
            List title
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
          <label>
            Destination
            <input
              name="destination"
              value={createForm.destination}
              onChange={(event) => {
                setCreateFormError('');
                setCreateForm((current) => ({ ...current, destination: event.target.value }));
              }}
              placeholder="Tokyo"
            />
          </label>
          <label>
            Link trip
            <select
              name="tripId"
              value={createForm.tripId}
              onChange={(event) => {
                setCreateFormError('');
                setCreateForm((current) => ({ ...current, tripId: event.target.value }));
              }}
            >
              <option value="">Trip linking coming soon</option>
            </select>
          </label>
          {createMode === 'template' && (
            <label>
              Template
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
          )}
        </div>
        {createFormError && <p className="form-error packing-status">{createFormError}</p>}
      </form>

      {createMode === 'template' && (
        <div className="packing-template-carousel" aria-label="Packing templates">
          <button
            className="packing-template-arrow"
            type="button"
            onClick={() => handleTemplatePageChange('previous')}
            disabled={templates.length <= 5}
            aria-label="Previous templates"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <div className="packing-templates">
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
            className="packing-template-arrow"
            type="button"
            onClick={() => handleTemplatePageChange('next')}
            disabled={templates.length <= 5}
            aria-label="Next templates"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="packing-layout">
        <aside className="packing-list-panel">
          <div className="packing-panel-heading">
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
            <div className="packing-list-stack">
              {packingLists.map((list) => {
                const listProgress = list.progress || {
                  packedItems: list.items.filter((item) => item.isPacked).length,
                  totalItems: list.items.length,
                };

                return (
                  <button
                    className={`packing-list-card ${!selectedTemplate && selectedList?._id === list._id ? 'active' : ''}`}
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

          <div className="packing-side-section">
            <div className="packing-panel-heading">
              <div>
                <span>Templates</span>
                <h3>My Templates</h3>
              </div>
              <strong>{customTemplates.length}</strong>
            </div>
            {customTemplates.length === 0 ? (
              <p className="settings-empty">No saved templates yet.</p>
            ) : (
              <div className="packing-list-stack">
                {customTemplates.map((template) => (
                  <button
                    className={`packing-list-card packing-template-card ${selectedTemplateId === template.key ? 'active' : ''}`}
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

        <div className="packing-main">
          {selectedTemplate ? (
            <section className="packing-detail">
              <div className="packing-template-editor">
                <div className="packing-detail-header">
                  <div>
                    <span className="packing-workspace-label">Template workspace</span>
                    {isEditingTemplateTitle ? (
                      <form className="packing-title-edit" onSubmit={handleSaveTemplateTitle}>
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
                      <div className="packing-title-row">
                        <h3>{templateEditForm.title}</h3>
                        <button type="button" onClick={handleStartTemplateTitleEdit} aria-label="Edit packing template name">
                          <Edit3 size={17} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                    <p>
                      {templateEditForm.items.length} template item{templateEditForm.items.length === 1 ? '' : 's'}
                    </p>
                    <div className="packing-workspace-meta" aria-label="Packing template details">
                      <span>Destination: {selectedTemplate.destination || 'Not set'}</span>
                      <span>Template linked: Future implementation</span>
                    </div>
                  </div>
                  <div className="packing-list-actions">
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

                <div className="packing-filters">
                  <span className="packing-search-field">
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
                  <select value={templateFilters.packed} onChange={(event) => setTemplateFilters((current) => ({ ...current, packed: event.target.value }))}>
                    <option value="">All status</option>
                    <option value="packed">Packed</option>
                    <option value="unpacked">Unpacked</option>
                  </select>
                  <select value={templateFilters.priority} onChange={(event) => setTemplateFilters((current) => ({ ...current, priority: event.target.value }))}>
                    <option value="">All priority</option>
                    {priorityLevels.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                  </select>
                </div>

                {filteredTemplateItems.length === 0 ? (
                  <p className="settings-empty">No template items match the current filters.</p>
                ) : (
                  <div className="packing-item-list packing-template-item-list">
                    {filteredTemplateItems.map((item) => {
                      const CategoryIcon = getCategoryIcon(item.category);

                      return (
                        <article className={item.isPacked ? 'packing-template-item-card packed' : 'packing-template-item-card'} key={item.id || item.index}>
                          <label className="packing-check">
                            <input
                              type="checkbox"
                              checked={Boolean(item.isPacked)}
                              onChange={() => handleToggleTemplateItemPacked(item.index)}
                            />
                            <span className="sr-only">{item.isPacked ? 'Mark unpacked' : 'Mark packed'}</span>
                          </label>
                          <div>
                            <div className="packing-item-title-row">
                              <strong>{item.name}</strong>
                              <span className={getPriorityClassName(item.priority)}>{formatPriorityLevel(item.priority)}</span>
                            </div>
                            <span className="packing-item-category packing-template-item-category">
                              <CategoryIcon size={14} aria-hidden="true" />
                              {formatPackingCategory(item.category)}
                            </span>
                          </div>
                          <div className="packing-item-meta" aria-label="Template item quantity">
                            <span className="packing-quantity">Qty {item.quantity}</span>
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

                <div className="packing-add-row">
                  <button className="primary-action" type="button" onClick={handleOpenAddTemplateItem}>
                    <Plus size={17} aria-hidden="true" />
                    Add item
                  </button>
                </div>

                {statusScope === 'template' && error && <p className="form-error packing-status">{error}</p>}
                {templateEditError && <p className="form-error packing-status">{templateEditError}</p>}
                {statusScope === 'template' && successMessage && <p className="form-success packing-status">{successMessage}</p>}
              </div>
            </section>
          ) : selectedList ? (
            <section className="packing-detail">
              <div className="packing-detail-header">
                <div>
                  <span className="packing-workspace-label">Packing workspace</span>
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
                  <div className="packing-workspace-meta" aria-label="Packing list trip details">
                    <span>Destination: {selectedList.destination || 'Not set'}</span>
                    <span>Trip linked: {selectedList.tripId ? 'Linked' : 'Future implementation'}</span>
                  </div>
                </div>
                <div className="packing-list-actions">
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
                      <button type="button" onClick={() => setConfirmAction({ type: 'delete-item', list: selectedList, item })} aria-label="Delete item">
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

              {statusScope === 'packing' && error && <p className="form-error packing-status">{error}</p>}
              {statusScope === 'packing' && successMessage && <p className="form-success packing-status">{successMessage}</p>}
            </section>
          ) : (
            <section className="packing-detail packing-empty-detail">
              <Luggage size={34} aria-hidden="true" />
              <h3>Create your first packing list</h3>
              <p>Choose manual creation or start from a ready-made template.</p>
              {statusScope === 'packing' && error && <p className="form-error packing-status">{error}</p>}
              {statusScope === 'packing' && successMessage && <p className="form-success packing-status">{successMessage}</p>}
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
              <h3 id="packing-item-modal-title">
                {itemModalMode === 'edit' || itemModalMode === 'template-edit' ? 'Edit item' : 'Add item'}
              </h3>
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

            <div className="packing-modal-actions">
              <button className="secondary-action" type="button" onClick={closeItemModal}>Cancel</button>
              <button className="primary-action" type="submit" disabled={isSaving}>
                {itemModalMode === 'edit' || itemModalMode === 'template-edit' ? 'Save' : 'Add item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isTemplateModalOpen && (
        <div className="packing-modal-backdrop" role="presentation">
          <form className="packing-modal" onSubmit={handleSaveCurrentListAsTemplate} aria-labelledby="packing-template-modal-title">
            <div className="packing-modal-header">
              <h3 id="packing-template-modal-title">Save as template</h3>
              <button type="button" onClick={closeTemplateModal} aria-label="Close template form">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {templateSaveError && <p className="form-error packing-modal-status">{templateSaveError}</p>}

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

            <div className="packing-modal-actions">
              <button className="secondary-action" type="button" onClick={closeTemplateModal}>Cancel</button>
              <button className="primary-action" type="submit" disabled={isSaving}>
                Save template
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
