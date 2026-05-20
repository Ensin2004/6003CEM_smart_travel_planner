import axiosClient from './axiosClient';

const packingListBasePath = '/travel-tools';

export const travelToolEndpoints = {
  documents: {
    list: () => axiosClient.get(`${packingListBasePath}/documents`),
    templates: () => axiosClient.get(`${packingListBasePath}/document-templates`),
  },
  packing: {
    list: () => axiosClient.get(packingListBasePath),
    templates: () => axiosClient.get(`${packingListBasePath}/templates`),
  },
};

export const getTravelTools = (mode = 'packing') => {
  if (mode === 'documents') return travelToolEndpoints.documents.list();
  return travelToolEndpoints.packing.list();
};

export const getTravelToolTemplates = (mode = 'packing') => {
  if (mode === 'documents') return travelToolEndpoints.documents.templates();
  return travelToolEndpoints.packing.templates();
};

export const getTravelDocuments = () => getTravelTools('documents');
export const getTravelDocumentTemplates = () => getTravelToolTemplates('documents');

export const getPackingLists = () => getTravelTools('packing');
export const getPackingListTemplates = () => getTravelToolTemplates('packing');
export const createPackingListTemplate = (payload) => axiosClient.post(`${packingListBasePath}/templates`, payload);
export const updatePackingListTemplate = (id, payload) => axiosClient.patch(`${packingListBasePath}/templates/${id}`, payload);
export const deletePackingListTemplate = (id) => axiosClient.delete(`${packingListBasePath}/templates/${id}`);
export const createPackingList = (payload) => axiosClient.post(packingListBasePath, payload);
export const updatePackingList = (id, payload) => axiosClient.patch(`${packingListBasePath}/${id}`, payload);
export const deletePackingList = (id) => axiosClient.delete(`${packingListBasePath}/${id}`);
export const duplicatePackingList = (id, payload) => axiosClient.post(`${packingListBasePath}/${id}/duplicate`, payload);
export const addPackingItem = (id, payload) => axiosClient.post(`${packingListBasePath}/${id}/items`, payload);
export const updatePackingItem = (id, itemId, payload) =>
  axiosClient.patch(`${packingListBasePath}/${id}/items/${itemId}`, payload);
export const deletePackingItem = (id, itemId) => axiosClient.delete(`${packingListBasePath}/${id}/items/${itemId}`);
