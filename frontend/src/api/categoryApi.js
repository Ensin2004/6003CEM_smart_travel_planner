/**
 * Category API functions share the same resource for Explore and admin CRUD.
 */
import axiosClient from './axiosClient';

export const getCategories = () => axiosClient.get('/categories');
export const createCategory = (category) => axiosClient.post('/categories', category);
export const updateCategory = (categoryId, category) =>
  axiosClient.put(`/categories/${categoryId}`, category);
export const deleteCategory = (categoryId) => axiosClient.delete(`/categories/${categoryId}`);
