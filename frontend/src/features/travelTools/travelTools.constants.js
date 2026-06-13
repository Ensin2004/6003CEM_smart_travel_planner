/**
 * Travel Tools module.
 * Reusable labels, keys, and defaults stay centralized for feature code.
 */
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
// Format Packing Category converts raw values into readable display text.
export const formatPackingCategory = (category = '') =>
  category
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
