/**
 * Explore module.
 * Reusable labels, keys, and defaults stay centralized for feature code.
 */

/**
 * Empty category options object providing default "Any" selection for each category type.
 * Used as fallback when no categories are available or when resetting filters.
 * 
 * @property {Array} hotel - Default hotel category option with "Any" selection
 * @property {Array} attraction - Default attraction category option with "Any" selection
 * @property {Array} food - Default food category option with "Any" selection
 */
export const emptyCategoryOptions = {
  hotel: [{ value: '', label: 'Any' }],
  attraction: [{ value: '', label: 'Any' }],
  food: [{ value: '', label: 'Any' }],
};

/**
 * Groups category items by their type into separate arrays.
 * Preserves existing category options and appends new categories from the input.
 * 
 * @param {Array} categories - Array of category objects with type, value, and name properties
 * @param {string} categories[].type - Category type ('hotel', 'attraction', or 'food')
 * @param {string} categories[].value - Unique identifier for the category
 * @param {string} categories[].name - Display name for the category
 * @returns {Object} Grouped categories object with arrays for each type
 * @property {Array} hotel - Combined hotel category options
 * @property {Array} attraction - Combined attraction category options
 * @property {Array} food - Combined food category options
 */
export const groupCategoryOptions = (categories = []) =>
  categories.reduce(
    (groups, category) => {
      if (groups[category.type]) {
        groups[category.type].push({ value: category.value, label: category.name });
      }
      return groups;
    },
    {
      hotel: [...emptyCategoryOptions.hotel],
      attraction: [...emptyCategoryOptions.attraction],
      food: [...emptyCategoryOptions.food],
    }
  );
  