import axiosClient from './axiosClient';

const packingListBasePath = '/travel-tools';

export const travelToolEndpoints = {
  documents: {
    create: (payload) => axiosClient.post(`${packingListBasePath}/documents`, payload),
    createTemplate: (payload) => axiosClient.post(`${packingListBasePath}/document-templates`, payload),
    delete: (id) => axiosClient.delete(`${packingListBasePath}/documents/${id}`),
    deleteFile: (id, fileId) => axiosClient.delete(`${packingListBasePath}/documents/${id}/files/${fileId}`),
    deleteItem: (id, itemId) => axiosClient.delete(`${packingListBasePath}/documents/${id}/items/${itemId}`),
    deleteTemplate: (id) => axiosClient.delete(`${packingListBasePath}/document-templates/${id}`),
    duplicate: (id, payload) => axiosClient.post(`${packingListBasePath}/documents/${id}/duplicate`, payload),
    addItem: (id, payload) => axiosClient.post(`${packingListBasePath}/documents/${id}/items`, payload),
    list: () => axiosClient.get(`${packingListBasePath}/documents`),
    templates: () => axiosClient.get(`${packingListBasePath}/document-templates`),
    uploadFiles: (id, payload) => axiosClient.post(`${packingListBasePath}/documents/${id}/files`, payload),
    update: (id, payload) => axiosClient.patch(`${packingListBasePath}/documents/${id}`, payload),
    updateTemplate: (id, payload) => axiosClient.patch(`${packingListBasePath}/document-templates/${id}`, payload),
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
export const createTravelDocument = (payload) => travelToolEndpoints.documents.create(payload);
export const updateTravelDocument = (id, payload) => travelToolEndpoints.documents.update(id, payload);
export const deleteTravelDocument = (id) => travelToolEndpoints.documents.delete(id);
export const duplicateTravelDocument = (id, payload) => travelToolEndpoints.documents.duplicate(id, payload);
export const createTravelDocumentTemplate = (payload) => travelToolEndpoints.documents.createTemplate(payload);
export const updateTravelDocumentTemplate = (id, payload) => travelToolEndpoints.documents.updateTemplate(id, payload);
export const deleteTravelDocumentTemplate = (id) => travelToolEndpoints.documents.deleteTemplate(id);
export const addTravelDocumentItem = (id, payload) => travelToolEndpoints.documents.addItem(id, payload);
export const deleteTravelDocumentItem = (id, itemId) => travelToolEndpoints.documents.deleteItem(id, itemId);
export const uploadTravelDocumentFiles = (id, files) =>
  travelToolEndpoints.documents.uploadFiles(id, { files });
export const uploadTravelDocumentItemFiles = (id, itemId, files) =>
  travelToolEndpoints.documents.uploadFiles(id, { itemId, files });
export const deleteTravelDocumentFile = (id, fileId) => travelToolEndpoints.documents.deleteFile(id, fileId);

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
