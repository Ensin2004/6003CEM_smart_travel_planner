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

export const defaultPackingCategory = 'travel essentials';

export const formatPackingCategory = (category = '') =>
  category
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
