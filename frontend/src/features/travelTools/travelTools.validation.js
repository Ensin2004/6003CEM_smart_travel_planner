/**
 * Travel Tools module.
 * Validation schemas reject unsafe or incomplete request payloads.
 */
import { defaultPackingCategory } from './travelTools.constants';
import { normalizeName } from './travelTools.utils';

// ============================================================
// VALIDATE CREATE PACKING LIST — blocks invalid values before persistence or API calls
// ============================================================
// Checks for empty title, missing template selection, and duplicate list names.
export const validateCreatePackingList = ({ createForm, createMode, hasDuplicateListTitle }) => {
  if (!createForm.title.trim()) return 'Packing list title cannot be empty.';
  if (createMode === 'template' && !createForm.templateKey) return 'Choose a template to create this list.';
  if (hasDuplicateListTitle(createForm.title)) return 'A packing list with this name already exists.';
  return '';
};

// ============================================================
// VALIDATE ITEM FORM — blocks invalid values before persistence or API calls
// ============================================================
// Ensures item has a name, a category, and a valid positive quantity.
export const validateItemForm = (itemForm) => {
  if (!itemForm.name.trim()) return 'Item name is required.';
  if (!itemForm.category) return 'Please choose a category.';
  if (!Number(itemForm.quantity) || Number(itemForm.quantity) < 1) return 'Quantity must be at least 1.';
  return '';
};

// ============================================================
// NORMALIZE TEMPLATE ITEMS FOR SAVE — prepares incoming data for consistent storage
// ============================================================
// Trims names, applies default category, converts quantity to number, and filters out empty names.
export const normalizeTemplateItemsForSave = (items) =>
  items
    .map((item) => ({
      name: item.name.trim(),
      category: item.category.trim() || defaultPackingCategory,
      quantity: Number(item.quantity) || 1,
    }))
    .filter((item) => item.name);

// ============================================================
// VALIDATE TEMPLATE DRAFT — blocks invalid values before persistence or API calls
// ============================================================
// Checks for empty title, empty description, at least one item, and duplicate item names.
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
