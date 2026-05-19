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
  defaultPriorityLevel,
  formatPriorityLevel,
} from './packingList.constants';

export const emptyItemForm = {
  name: '',
  category: defaultPackingCategory,
  priority: defaultPriorityLevel,
  quantity: 1,
};

export const emptyFilters = {
  search: '',
  category: '',
  packed: '',
  priority: '',
};

export const getErrorMessage = (error) =>
  error.response?.data?.message || 'Unable to update packing lists right now.';

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

export const normalizePackingListForUi = (packingList) => ({
  ...packingList,
  items: (packingList.items || []).map((item) => ({
    ...item,
    priority: formatPriorityLevel(item.priority),
  })),
});

export const mapTemplateForEdit = (template) => ({
  title: template.title || '',
  description: template.description || '',
  items: (template.items || []).map((item) => ({
    id: item._id || item.id || `${item.name}-${item.category}`,
    name: item.name || '',
    category: item.category || defaultPackingCategory,
    priority: formatPriorityLevel(item.priority),
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
