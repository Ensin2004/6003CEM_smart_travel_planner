/**
 * Explore module.
 * Reusable labels, keys, and defaults stay centralized for feature code.
 */
export const emptyCategoryOptions = {
  hotel: [{ value: '', label: 'Any' }],
  attraction: [{ value: '', label: 'Any' }],
  food: [{ value: '', label: 'Any' }],
};

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
