import axiosClient from './axiosClient';

export const getFavorites = () => axiosClient.get('/favorites');

export const addFavorite = (favorite) => axiosClient.post('/favorites', favorite);

export const removeFavorite = (favoriteId) => axiosClient.delete(`/favorites/${favoriteId}`);
