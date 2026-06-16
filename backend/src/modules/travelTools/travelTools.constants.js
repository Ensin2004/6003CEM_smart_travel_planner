/**
 * Travel Tools module.
 * Reusable labels, keys, and defaults stay centralized for feature code.
 */

// List of valid packing item categories
const packingCategories = [
  'clothes',
  'toiletries',
  'electronics',
  'documents',
  'medicine',
  'food',
  'travel essentials',
  'other',
];

// List of valid priority levels
const priorityLevels = ['High', 'Medium', 'Low'];

// Default category for packing items
const defaultPackingCategory = 'travel essentials';

// Default priority level for packing items
const defaultPriorityLevel = 'Medium';

// Mapping from legacy priority values to standard levels
const legacyPriorityMap = {
  emergency: 'High',
  important: 'Medium',
  optional: 'Low',
};

// Normalize Priority Level prepares incoming data for consistent storage.
const normalizePriorityLevel = (priority) => legacyPriorityMap[priority] || priority || defaultPriorityLevel;

// Export constants and utility functions
module.exports = {
  defaultPackingCategory,
  defaultPriorityLevel,
  normalizePriorityLevel,
  packingCategories,
  priorityLevels,
};