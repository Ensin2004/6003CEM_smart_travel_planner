/**
 * Travel Tools module.
 * Small utilities keep repeated formatting and transformation logic reusable.
 */
import {
  BriefcaseBusiness,
  FileText,
  Laptop,
  Luggage,
  Pill,
  Shirt,
  Sparkles,
  Utensils,
} from 'lucide-react';
import {
  defaultPackingCategory,
} from './travelTools.constants';
import { getApiErrorMessage } from '../../utils/apiError';

// ============================================================
// EMPTY ITEM FORM — default state for add/edit item forms
// ============================================================
export const emptyItemForm = {
  name: '',
  category: defaultPackingCategory,
  quantity: '1',
};

// ============================================================
// EMPTY FILTERS — default state for search/filter controls
// ============================================================
export const emptyFilters = {
  search: '',
  category: '',
  packed: '',
};

// ============================================================
// GET ERROR MESSAGE — formats API errors with a fallback message
// ============================================================
export const getErrorMessage = (error) =>
  getApiErrorMessage(error, 'Unable to update packing lists right now.');

// ============================================================
// NORMALIZE NAME — prepares incoming data for consistent storage
// ============================================================
// Trims whitespace, collapses multiple spaces to single, and converts to lowercase.
export const normalizeName = (value = '') => value.trim().replace(/\s+/g, ' ').toLowerCase();

// ============================================================
// CATEGORY ICONS — maps category keys to Lucide icon components
// ============================================================
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

// ============================================================
// GET CATEGORY ICON — returns the matching icon or a fallback
// ============================================================
export const getCategoryIcon = (category) => categoryIcons[category] || Luggage;

// ============================================================
// NORMALIZE PACKING LIST FOR UI — prepares incoming data for consistent storage
// ============================================================
// Ensures the items array exists even when the API returns undefined.
export const normalizePackingListForUi = (packingList) => ({
  ...packingList,
  items: packingList.items || [],
});

// ============================================================
// MAP TEMPLATE FOR EDIT — transforms source data into the shape required nearby
// ============================================================
// Converts template items to a consistent format with stable IDs for UI editing.
export const mapTemplateForEdit = (template) => ({
  title: template.title || '',
  description: template.description || '',
  items: (template.items || []).map((item) => ({
    id: item._id || item.id || `${item.name}-${item.category}`,
    name: item.name || '',
    category: item.category || defaultPackingCategory,
    quantity: item.quantity || 1,
    isPacked: Boolean(item.isPacked),
  })),
});

// ============================================================
// GET UNIQUE NAME — generates a unique name for duplicates
// ============================================================
// Appends "copy" and increments a number until the name is unique.
export const getUniqueName = (title, exists) => {
  const baseTitle = `${title} copy`;
  let candidateTitle = baseTitle;
  let copyNumber = 2;

  while (exists(candidateTitle)) {
    candidateTitle = `${baseTitle} ${copyNumber}`;
    copyNumber += 1;
  }

  return candidateTitle;
};
