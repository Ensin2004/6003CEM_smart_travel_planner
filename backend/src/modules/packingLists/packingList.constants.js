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

const priorityLevels = ['High', 'Medium', 'Low'];

const defaultPackingCategory = 'travel essentials';
const defaultPriorityLevel = 'Medium';

const legacyPriorityMap = {
  emergency: 'High',
  important: 'Medium',
  optional: 'Low',
};

const normalizePriorityLevel = (priority) => legacyPriorityMap[priority] || priority || defaultPriorityLevel;

module.exports = {
  defaultPackingCategory,
  defaultPriorityLevel,
  normalizePriorityLevel,
  packingCategories,
  priorityLevels,
};
