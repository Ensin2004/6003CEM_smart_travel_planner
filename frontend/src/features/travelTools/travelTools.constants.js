/**
 * Travel Tools module.
 * Reusable labels, keys, and defaults stay centralized for feature code.
 */

// ============================================================
// PACKING CATEGORIES — master list of all available categories
// ============================================================
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

// ============================================================
// DEFAULT CATEGORY — fallback when no category is specified
// ============================================================
export const defaultPackingCategory = 'travel essentials';

// ============================================================
// FORMAT PACKING CATEGORY — converts raw values into readable display text
// ============================================================
// Splits on spaces, capitalizes each word, and rejoins with spaces.
export const formatPackingCategory = (category = '') =>
  category
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
    