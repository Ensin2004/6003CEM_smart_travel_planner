import { useEffect, useMemo, useState } from 'react';
import {
  addPackingItem,
  createPackingList,
  createPackingListTemplate,
  deletePackingItem,
  deletePackingList,
  deletePackingListTemplate,
  duplicatePackingList,
  getPackingLists,
  getPackingListTemplates,
  updatePackingItem,
  updatePackingList,
  updatePackingListTemplate,
} from '../../../api/travelToolsApi';
import { getTrips } from '../../../api/tripApi';
import { getMe } from '../../../api/userApi';
import {
  defaultPackingCategory,
  packingCategories,
} from '../travelTools.constants';
import {
  emptyFilters,
  emptyItemForm,
  getErrorMessage,
  getUniqueName,
  mapTemplateForEdit,
  normalizeName,
  normalizePackingListForUi,
} from '../travelTools.utils';
import {
  normalizeTemplateItemsForSave,
  validateCreatePackingList,
  validateItemForm,
  validateTemplateDraft,
} from '../travelTools.validation';

export function useTravelToolsPage() {
  const [packingLists, setPackingLists] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [trips, setTrips] = useState([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [statusScope, setStatusScope] = useState('packing');
  const [createMode, setCreateMode] = useState('manual');
  const [createForm, setCreateForm] = useState({ title: '', destination: '', tripId: '', templateKey: '' });
  const [createFormError, setCreateFormError] = useState('');
  const [templatePage, setTemplatePage] = useState(0);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [templateSaveForm, setTemplateSaveForm] = useState({ title: '', description: '' });
  const [templateSaveError, setTemplateSaveError] = useState('');
  const [templateEditForm, setTemplateEditForm] = useState({ title: '', description: '', items: [] });
  const [templateEditError, setTemplateEditError] = useState('');
  const [itemFormError, setItemFormError] = useState('');
  const [itemModalMode, setItemModalMode] = useState('');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState('');
  const [isEditingListTitle, setIsEditingListTitle] = useState(false);
  const [listTitleDraft, setListTitleDraft] = useState('');
  const [isEditingTemplateTitle, setIsEditingTemplateTitle] = useState(false);
  const [templateTitleDraft, setTemplateTitleDraft] = useState('');
  const [isEditingTemplateDescription, setIsEditingTemplateDescription] = useState(false);
  const [templateDescriptionDraft, setTemplateDescriptionDraft] = useState('');
  const [editingTemplateItemIndex, setEditingTemplateItemIndex] = useState(-1);
  const [confirmAction, setConfirmAction] = useState(null);
  const [notificationPreferences, setNotificationPreferences] = useState({
    notificationsOff: false,
    packingReminder: true,
  });
  const [reminderDays, setReminderDays] = useState(2);
  const [filters, setFilters] = useState(emptyFilters);
  const [templateFilters, setTemplateFilters] = useState(emptyFilters);

  const selectedList = useMemo(
    () => packingLists.find((list) => list._id === selectedListId) || packingLists[0],
    [packingLists, selectedListId]
  );

  const progress = selectedList?.progress || {
    packedItems: selectedList?.items?.filter((item) => item.isPacked).length || 0,
    totalItems: selectedList?.items?.length || 0,
    percent: 0,
  };

  const remainingItems = Math.max((progress.totalItems || 0) - (progress.packedItems || 0), 0);

  const unpackedItemCount = useMemo(
    () => selectedList?.items?.filter((item) => !item.isPacked).length || 0,
    [selectedList]
  );

  const isPackingReminderEnabled =
    !notificationPreferences.notificationsOff && notificationPreferences.packingReminder !== false;

  const customTemplates = useMemo(
    () => templates.filter((template) => template.source === 'custom'),
    [templates]
  );

  const selectedTemplate = useMemo(
    () => customTemplates.find((template) => template.key === selectedTemplateId),
    [customTemplates, selectedTemplateId]
  );

  const categoryOptions = useMemo(() => {
    const categories = new Set(packingCategories);
    packingLists.forEach((list) => list.items?.forEach((item) => item.category && categories.add(item.category)));
    templates.forEach((template) => template.items?.forEach((item) => item.category && categories.add(item.category)));
    return Array.from(categories);
  }, [packingLists, templates]);

  const visibleTemplates = useMemo(() => {
    if (templates.length <= 3) return templates;
    return Array.from({ length: 3 }, (_, index) => templates[(templatePage + index) % templates.length]);
  }, [templatePage, templates]);

  const maxTemplatePage = Math.max(templates.length - 1, 0);

  const filteredItems = useMemo(() => {
    const items = selectedList?.items || [];
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(filters.search.toLowerCase().trim());
      const matchesCategory = !filters.category || item.category === filters.category;
      const matchesPacked =
        !filters.packed ||
        (filters.packed === 'packed' && item.isPacked) ||
        (filters.packed === 'unpacked' && !item.isPacked);
      return matchesSearch && matchesCategory && matchesPacked;
    });
  }, [filters, selectedList]);

  const filteredTemplateItems = useMemo(() => {
    const items = templateEditForm.items || [];
    return items
      .map((item, index) => ({ ...item, index }))
      .filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(templateFilters.search.toLowerCase().trim());
        const matchesCategory = !templateFilters.category || item.category === templateFilters.category;
        const matchesPacked =
          !templateFilters.packed ||
          (templateFilters.packed === 'packed' && item.isPacked) ||
          (templateFilters.packed === 'unpacked' && !item.isPacked);
        return matchesSearch && matchesCategory && matchesPacked;
      });
  }, [templateEditForm.items, templateFilters]);

  const hasDuplicateListTitle = (title, excludedListId = '') => {
    const normalizedTitle = normalizeName(title);
    return packingLists.some(
      (list) => normalizeName(list.title) === normalizedTitle && list._id !== excludedListId
    );
  };

  const hasDuplicateItemName = (name, excludedItemId = '') => {
    const normalizedItemName = normalizeName(name);
    return (selectedList?.items || []).some(
      (item) => normalizeName(item.name) === normalizedItemName && item._id !== excludedItemId
    );
  };

  const hasDuplicateTemplateItemName = (name, excludedItemIndex = -1) => {
    const normalizedItemName = normalizeName(name);
    return templateEditForm.items.some(
      (item, index) => normalizeName(item.name) === normalizedItemName && index !== excludedItemIndex
    );
  };

  useEffect(() => {
    let isMounted = true;

    const loadPackingLists = async () => {
      try {
        const [listsResponse, templatesResponse, tripsResponse, profileResponse] = await Promise.all([
          getPackingLists(),
          getPackingListTemplates(),
          getTrips().catch(() => ({ data: { data: { trips: [] } } })),
          getMe().catch(() => ({ data: { data: { user: {} } } })),
        ]);

        if (!isMounted) return;

        const nextLists = (listsResponse.data.data.packingLists || []).map(normalizePackingListForUi);
        const preferences = profileResponse.data.data.user.notificationPreferences || {};

        setPackingLists(nextLists);
        setTemplates(templatesResponse.data.data.templates || []);
        setTrips(tripsResponse.data.data.trips || []);
        setNotificationPreferences({
          notificationsOff: Boolean(preferences.notificationsOff),
          packingReminder: preferences.packingReminder !== false,
        });
        setReminderDays(nextLists[0]?.reminder?.daysBeforeTrip ?? 2);
        setSelectedListId((current) => current || nextLists[0]?._id || '');
        setError('');
      } catch (requestError) {
        if (isMounted) setError(getErrorMessage(requestError));
      } finally {
        if (isMounted) setIsLoading(false);
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
    setEditingTemplateItemIndex(-1);
    setItemForm(emptyItemForm);
    setItemFormError('');
  };

  const closeTemplateModal = () => {
    setIsTemplateModalOpen(false);
    setTemplateSaveForm({ title: '', description: '' });
    setTemplateSaveError('');
  };

  const handleCreateList = async (event) => {
    event.preventDefault();
    setStatusScope('packing');

    const validationMessage = validateCreatePackingList({ createForm, createMode, hasDuplicateListTitle });
    if (validationMessage) {
      setCreateFormError(validationMessage);
      return;
    }

    setIsSaving(true);
    setCreateFormError('');
    setError('');
    setSuccessMessage('');

    try {
      const response = await createPackingList({
        title: createForm.title.trim(),
        tripId: createForm.tripId || undefined,
        ...(createMode === 'template' ? { templateKey: createForm.templateKey } : {}),
      });
      const packingList = normalizePackingListForUi(response.data.data.packingList);

      setPackingLists((current) => [packingList, ...current]);
      setSelectedListId(packingList._id);
      setSelectedTemplateId('');
      setCreateForm({ title: '', destination: '', tripId: '', templateKey: '' });
      setCreateMode('manual');
      setSuccessMessage('Packing list created.');
    } catch (requestError) {
      setCreateFormError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setCreateMode('template');
    setCreateForm({
      title: template.title,
      destination: '',
      tripId: createForm.tripId,
      templateKey: template.key,
    });
  };

  const handleTemplateWorkspaceSelect = (template) => {
    setSelectedTemplateId(template.key);
    setTemplateEditForm(mapTemplateForEdit(template));
    setTemplateEditError('');
    setIsEditingTemplateTitle(false);
    setTemplateTitleDraft('');
    setIsEditingTemplateDescription(false);
    setTemplateDescriptionDraft('');
    setTemplateFilters(emptyFilters);
  };

  const handlePackingListTripChange = async (event) => {
    if (!selectedList) return;
    const tripId = event.target.value;
    setStatusScope('packing');
    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await updatePackingList(selectedList._id, {
        tripId: tripId || null,
      });
      replaceList(response.data.data.packingList);
      setSuccessMessage(tripId ? 'Packing list linked to trip.' : 'Packing list unlinked from trip.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplatePageChange = (direction) => {
    setTemplatePage((current) => {
      if (direction === 'previous') return current === 0 ? maxTemplatePage : current - 1;
      return current === maxTemplatePage ? 0 : current + 1;
    });
  };

  const handleItemFormChange = (event) => {
    const { name, value } = event.target;
    setItemFormError('');
    setItemForm((current) => ({
      ...current,
      [name]: name === 'quantity' ? value.replace(/^0+(?=\d)/, '') : value,
    }));
  };

  const saveTemplateDraft = async (draft, successText = 'Packing template updated.') => {
    if (!selectedTemplate) return false;
    setStatusScope('template');

    const validationMessage = validateTemplateDraft(draft);
    if (validationMessage) {
      setTemplateEditError(validationMessage);
      return false;
    }

    const items = normalizeTemplateItemsForSave(draft.items || []);
    setIsSaving(true);
    setTemplateEditError('');
    setError('');
    setSuccessMessage('');

    try {
      const response = await updatePackingListTemplate(selectedTemplate.key, {
        title: draft.title.trim(),
        description: draft.description.trim(),
        destination: selectedTemplate.destination || '',
        items,
      });
      const updatedTemplate = response.data.data.template;
      const nextTemplate = { ...updatedTemplate, key: updatedTemplate._id || updatedTemplate.id, source: 'custom' };

      setTemplates((current) => current.map((template) => (template.key === selectedTemplate.key ? nextTemplate : template)));
      setSelectedTemplateId(nextTemplate.key);
      setSuccessMessage(successText);
      return true;
    } catch (requestError) {
      setTemplateEditError(getErrorMessage(requestError));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAddTemplateItem = () => {
    setItemForm(emptyItemForm);
    setEditingTemplateItemIndex(-1);
    setItemModalMode('template-add');
    setItemFormError('');
    setSuccessMessage('');
  };

  const handleEditTemplateItem = (itemIndex) => {
    const item = templateEditForm.items[itemIndex];
    if (!item) return;
    setEditingTemplateItemIndex(itemIndex);
    setItemForm({ name: item.name, category: item.category, quantity: String(item.quantity || 1) });
    setItemModalMode('template-edit');
    setItemFormError('');
    setSuccessMessage('');
  };

  const handleOpenSaveTemplateModal = () => {
    setStatusScope('packing');
    if (!selectedList) return;
    if ((selectedList.items || []).length === 0) {
      setError('Add at least one item before saving this list as a template.');
      return;
    }
    setTemplateSaveForm({ title: selectedList.title, description: '' });
    setTemplateSaveError('');
    setSuccessMessage('');
    setIsTemplateModalOpen(true);
  };

  const handleTemplateSaveFormChange = (event) => {
    const { name, value } = event.target;
    setTemplateSaveError('');
    setTemplateSaveForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveCurrentListAsTemplate = async (event) => {
    event.preventDefault();
    setStatusScope('packing');
    if (!selectedList) return;

    if (!templateSaveForm.title.trim()) {
      setTemplateSaveError('Template title is required.');
      return;
    }
    if (!templateSaveForm.description.trim()) {
      setTemplateSaveError('Template description is required.');
      return;
    }
    if (templates.some((template) => normalizeName(template.title) === normalizeName(templateSaveForm.title))) {
      setError('A template with this name already exists.');
      setTemplateSaveError('A template with this name already exists.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await createPackingListTemplate({
        title: templateSaveForm.title.trim(),
        destination: selectedList.destination || '',
        description: templateSaveForm.description.trim(),
        items: selectedList.items.map((item) => ({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
        })),
      });
      const template = response.data.data.template;
      const nextTemplate = { ...template, key: template._id || template.id, source: 'custom' };

      setTemplates((current) => [nextTemplate, ...current]);
      setCreateMode('template');
      setCreateForm({ title: nextTemplate.title, destination: '', tripId: '', templateKey: nextTemplate.key });
      setSuccessMessage('Packing list saved as a template.');
      closeTemplateModal();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
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
    setItemForm({ name: item.name, category: item.category, quantity: String(item.quantity || 1) });
    setItemModalMode('edit');
    setItemFormError('');
    setSuccessMessage('');
  };

  const handleSaveItem = async (event) => {
    event.preventDefault();
    const isTemplateItemModal = itemModalMode === 'template-add' || itemModalMode === 'template-edit';
    setStatusScope(isTemplateItemModal ? 'template' : 'packing');

    const validationMessage = validateItemForm(itemForm);
    if (validationMessage) {
      setItemFormError(validationMessage);
      return;
    }
    if (!selectedList && !isTemplateItemModal) {
      setItemFormError('Please choose a packing list first.');
      return;
    }
    if (isTemplateItemModal && hasDuplicateTemplateItemName(itemForm.name, itemModalMode === 'template-edit' ? editingTemplateItemIndex : -1)) {
      setItemFormError('An item with this name already exists in this template.');
      return;
    }
    if (!isTemplateItemModal && hasDuplicateItemName(itemForm.name, itemModalMode === 'edit' ? editingItemId : '')) {
      setItemFormError('An item with this name already exists in this packing list.');
      return;
    }

    if (isTemplateItemModal) {
      const nextItem = {
        id: itemModalMode === 'template-edit' ? templateEditForm.items[editingTemplateItemIndex]?.id : `new-${Date.now()}`,
        name: itemForm.name.trim(),
        category: itemForm.category.trim() || defaultPackingCategory,
        quantity: Number(itemForm.quantity) || 1,
        isPacked: itemModalMode === 'template-edit' ? Boolean(templateEditForm.items[editingTemplateItemIndex]?.isPacked) : false,
      };
      const nextForm = {
        ...templateEditForm,
        items: itemModalMode === 'template-edit'
          ? templateEditForm.items.map((item, index) => (index === editingTemplateItemIndex ? nextItem : item))
          : [...templateEditForm.items, nextItem],
      };

      setTemplateEditForm(nextForm);
      const didSave = await saveTemplateDraft(nextForm, itemModalMode === 'template-edit' ? 'Template item updated.' : 'Template item added.');
      if (didSave) closeItemModal();
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = itemModalMode === 'edit'
        ? await updatePackingItem(selectedList._id, editingItemId, {
          ...itemForm,
          quantity: Number(itemForm.quantity) || 1,
        })
        : await addPackingItem(selectedList._id, {
          ...itemForm,
          quantity: Number(itemForm.quantity) || 1,
        });
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
    setStatusScope('packing');
    try {
      const response = await updatePackingItem(selectedList._id, item._id, { isPacked: !item.isPacked });
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
    setStatusScope('packing');

    if (!selectedList || !listTitleDraft.trim()) {
      setError('Packing list name is required.');
      return;
    }
    if (hasDuplicateListTitle(listTitleDraft, selectedList._id)) {
      setError('A packing list with this name already exists.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await updatePackingList(selectedList._id, { title: listTitleDraft.trim() });
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

  const handleStartTemplateTitleEdit = () => {
    if (!selectedTemplate) return;
    setTemplateTitleDraft(templateEditForm.title);
    setIsEditingTemplateTitle(true);
    setSuccessMessage('');
  };

  const handleCancelTemplateTitleEdit = () => {
    setIsEditingTemplateTitle(false);
    setTemplateTitleDraft('');
  };

  const handleSaveTemplateTitle = async (event) => {
    event.preventDefault();
    const nextForm = { ...templateEditForm, title: templateTitleDraft.trim() };
    const didSave = await saveTemplateDraft(nextForm, 'Packing template name updated.');
    if (didSave) {
      setTemplateEditForm(nextForm);
      setIsEditingTemplateTitle(false);
      setTemplateTitleDraft('');
    }
  };

  const handleStartTemplateDescriptionEdit = () => {
    if (!selectedTemplate) return;
    setTemplateDescriptionDraft(templateEditForm.description);
    setIsEditingTemplateDescription(true);
    setSuccessMessage('');
  };

  const handleCancelTemplateDescriptionEdit = () => {
    setIsEditingTemplateDescription(false);
    setTemplateDescriptionDraft('');
    setTemplateEditError('');
  };

  const handleSaveTemplateDescription = async () => {
    const nextForm = { ...templateEditForm, description: templateDescriptionDraft.trim() };
    const didSave = await saveTemplateDraft(nextForm, 'Packing template description updated.');
    if (didSave) {
      setTemplateEditForm(nextForm);
      setIsEditingTemplateDescription(false);
      setTemplateDescriptionDraft('');
    }
  };

  const handleReminderDaysChange = async (event) => {
    setStatusScope('packing');
    const daysBeforeTrip = Number(event.target.value);
    setReminderDays(daysBeforeTrip);
    if (!selectedList) return;

    try {
      const response = await updatePackingList(selectedList._id, {
        reminder: { enabled: selectedList.reminder?.enabled ?? true, daysBeforeTrip },
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
        setStatusScope('packing');
        const title = getUniqueName(confirmAction.list.title, (candidate) => hasDuplicateListTitle(candidate));
        const response = await duplicatePackingList(confirmAction.list._id, { title });
        const packingList = normalizePackingListForUi(response.data.data.packingList);
        setPackingLists((current) => [packingList, ...current]);
        setSelectedListId(packingList._id);
        setSuccessMessage('Packing list duplicated.');
      }

      if (confirmAction.type === 'delete-list') {
        setStatusScope('packing');
        await deletePackingList(confirmAction.list._id);
        setPackingLists((current) => {
          const nextLists = current.filter((list) => list._id !== confirmAction.list._id);
          setSelectedListId(nextLists[0]?._id || '');
          return nextLists;
        });
        setError('Packing list deleted.');
      }

      if (confirmAction.type === 'delete-item') {
        setStatusScope('packing');
        const response = await deletePackingItem(confirmAction.list._id, confirmAction.item._id);
        replaceList(response.data.data.packingList);
        setError('Packing item deleted.');
      }

      if (confirmAction.type === 'duplicate-template') {
        setStatusScope('template');
        const sourceTemplate = selectedTemplate?.key === confirmAction.template.key
          ? { ...confirmAction.template, ...templateEditForm }
          : confirmAction.template;
        const response = await createPackingListTemplate({
          title: getUniqueName(sourceTemplate.title, (candidate) =>
            templates.some((template) => normalizeName(template.title) === normalizeName(candidate))
          ),
          destination: sourceTemplate.destination || '',
          description: sourceTemplate.description || 'Custom packing template',
          items: (sourceTemplate.items || []).map((item) => ({
            name: item.name,
            category: item.category,
            quantity: item.quantity,
          })),
        });
        const template = response.data.data.template;
        const nextTemplate = { ...template, key: template._id || template.id, source: 'custom' };
        setTemplates((current) => [nextTemplate, ...current]);
        handleTemplateWorkspaceSelect(nextTemplate);
        setSuccessMessage('Packing template duplicated.');
      }

      if (confirmAction.type === 'delete-template') {
        setStatusScope('template');
        await deletePackingListTemplate(confirmAction.template.key);
        setTemplates((current) => current.filter((template) => template.key !== confirmAction.template.key));
        setSelectedTemplateId('');
        setError('Packing template deleted.');
      }

      if (confirmAction.type === 'delete-template-item') {
        setStatusScope('template');
        const nextForm = {
          ...templateEditForm,
          items: templateEditForm.items.filter((_, index) => index !== confirmAction.itemIndex),
        };
        const didSave = await saveTemplateDraft(nextForm, '');
        if (didSave) {
          setTemplateEditForm(nextForm);
          setSuccessMessage('');
          setError('Template item deleted.');
        }
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
        : confirmAction?.type === 'duplicate-template'
          ? 'Duplicate packing template?'
          : confirmAction?.type === 'delete-template'
            ? 'Delete packing template?'
            : confirmAction?.type === 'delete-template-item'
              ? 'Delete template item?'
              : 'Delete packing item?';

  const confirmMessage =
    confirmAction?.type === 'duplicate-list'
      ? `Create a copy of "${confirmAction.list.title}" with all items marked unpacked.`
      : confirmAction?.type === 'delete-list'
        ? `Delete "${confirmAction.list.title}" and all of its packing items.`
        : confirmAction?.type === 'duplicate-template'
          ? `Create a copy of "${confirmAction.template.title}" with the same template items.`
          : confirmAction?.type === 'delete-template'
            ? `Delete "${confirmAction.template.title}" and all of its template items.`
            : confirmAction?.type === 'delete-template-item'
              ? `Delete "${confirmAction?.item?.name}" from this packing template.`
              : `Delete "${confirmAction?.item?.name}" from this packing list.`;

  return {
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
    unpackedItemCount,
    visibleTemplates,
  };
}
