import { defaultPackingCategory } from './travelTools.constants';
import { normalizeName } from './travelTools.utils';

export const validateCreatePackingList = ({ createForm, createMode, hasDuplicateListTitle }) => {
  if (!createForm.title.trim()) return 'Packing list title cannot be empty.';
  if (createMode === 'template' && !createForm.templateKey) return 'Choose a template to create this list.';
  if (hasDuplicateListTitle(createForm.title)) return 'A packing list with this name already exists.';
  return '';
};

export const validateItemForm = (itemForm) => {
  if (!itemForm.name.trim()) return 'Item name is required.';
  if (!itemForm.category) return 'Please choose a category.';
  if (!Number(itemForm.quantity) || Number(itemForm.quantity) < 1) return 'Quantity must be at least 1.';
  return '';
};

export const normalizeTemplateItemsForSave = (items) =>
  items
    .map((item) => ({
      name: item.name.trim(),
      category: item.category.trim() || defaultPackingCategory,
      quantity: Number(item.quantity) || 1,
    }))
    .filter((item) => item.name);

export const validateTemplateDraft = (draft) => {
  if (!draft.title.trim()) return 'Template title is required.';
  if (!draft.description.trim()) return 'Template description is required.';

  const items = normalizeTemplateItemsForSave(draft.items || []);
  if (items.length === 0) return 'Add at least one item to save this template.';

  const hasDuplicateItems = items.some(
    (item, index) =>
      items.findIndex((candidate) => normalizeName(candidate.name) === normalizeName(item.name)) !== index
  );

  if (hasDuplicateItems) return 'Template item names must be unique.';
  return '';
};
