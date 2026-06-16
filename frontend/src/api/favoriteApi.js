/**
 * Favorite Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

// Retrieves the complete list of saved favorites for the current user
export const getFavorites = () => axiosClient.get('/favorites');

// Add Favorite builds a new record from validated input.
export const addFavorite = (favorite) => axiosClient.post('/favorites', favorite);

// Remove Favorite removes a record after ownership checks.
export const removeFavorite = (favoriteId) => axiosClient.delete(`/favorites/${favoriteId}`);
