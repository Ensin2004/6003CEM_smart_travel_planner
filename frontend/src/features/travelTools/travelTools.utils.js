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
export const emptyItemForm = {
  name: '',
  category: defaultPackingCategory,
  quantity: '1',
};
export const emptyFilters = {
  search: '',
  category: '',
  packed: '',
};
export const getErrorMessage = (error) =>
  getApiErrorMessage(error, 'Unable to update packing lists right now.');
// Normalize Name prepares incoming data for consistent storage.
export const normalizeName = (value = '') => value.trim().replace(/\s+/g, ' ').toLowerCase();

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
export const getCategoryIcon = (category) => categoryIcons[category] || Luggage;
// Normalize Packing List For Ui prepares incoming data for consistent storage.
export const normalizePackingListForUi = (packingList) => ({
  ...packingList,
  items: packingList.items || [],
});
// Map Template For Edit transforms source data into the shape required nearby.
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
