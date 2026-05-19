import axiosClient from './axiosClient';

export const getPackingLists = () => axiosClient.get('/packing-lists');
export const getPackingListTemplates = () => axiosClient.get('/packing-lists/templates');
export const createPackingListTemplate = (payload) => axiosClient.post('/packing-lists/templates', payload);
export const updatePackingListTemplate = (id, payload) => axiosClient.patch(`/packing-lists/templates/${id}`, payload);
export const deletePackingListTemplate = (id) => axiosClient.delete(`/packing-lists/templates/${id}`);
export const createPackingList = (payload) => axiosClient.post('/packing-lists', payload);
export const updatePackingList = (id, payload) => axiosClient.patch(`/packing-lists/${id}`, payload);
export const deletePackingList = (id) => axiosClient.delete(`/packing-lists/${id}`);
export const duplicatePackingList = (id, payload) => axiosClient.post(`/packing-lists/${id}/duplicate`, payload);
export const addPackingItem = (id, payload) => axiosClient.post(`/packing-lists/${id}/items`, payload);
export const updatePackingItem = (id, itemId, payload) =>
  axiosClient.patch(`/packing-lists/${id}/items/${itemId}`, payload);
export const deletePackingItem = (id, itemId) => axiosClient.delete(`/packing-lists/${id}/items/${itemId}`);
