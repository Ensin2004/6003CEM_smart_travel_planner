/**
 * Category API functions share the same resource for Explore and admin CRUD.
 */
import axiosClient from './axiosClient';

// Retrieves the complete list of categories available in the system
export const getCategories = () => axiosClient.get('/categories');

// Submits new category data to create a new category record
export const createCategory = (category) => axiosClient.post('/categories', category);

// Sends updated category data to modify an existing category by its identifier
export const updateCategory = (categoryId, category) =>
  axiosClient.put(`/categories/${categoryId}`, category);

// Sends a deletion request to remove a category by its identifier
export const deleteCategory = (categoryId) => axiosClient.delete(`/categories/${categoryId}`);
