export const packingCategories = [
  'clothes',
  'toiletries',
  'electronics',
  'documents',
  'medicine',
  'food',
  'travel essentials',
  'other',
];

export const priorityLevels = ['High', 'Medium', 'Low'];

export const defaultPackingCategory = 'travel essentials';
export const defaultPriorityLevel = 'Medium';

export const formatPackingCategory = (category = '') =>
  category
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const legacyPriorityMap = {
  emergency: 'High',
  important: 'Medium',
  optional: 'Low',
};

export const formatPriorityLevel = (priority = '') => legacyPriorityMap[priority] || priority || defaultPriorityLevel;

export const getPriorityClassName = (priority = '') =>
  `priority-${formatPriorityLevel(priority).toLowerCase()}`;
