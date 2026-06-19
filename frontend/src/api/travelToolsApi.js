/**
 * Travel Tools Api module.
 * Frontend API functions keep HTTP contract details close to one file.
 */
import axiosClient from './axiosClient';

const packingListBasePath = '/travel-tools';

// Organizes travel tool endpoints under documents and packing categories
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

// Retrieves travel tools based on the specified mode (packing or documents)
export const getTravelTools = (mode = 'packing') => {
  if (mode === 'documents') return travelToolEndpoints.documents.list();
  return travelToolEndpoints.packing.list();
};

// Retrieves travel tool templates based on the specified mode
export const getTravelToolTemplates = (mode = 'packing') => {
  if (mode === 'documents') return travelToolEndpoints.documents.templates();
  return travelToolEndpoints.packing.templates();
};

// Convenience function for fetching travel documents
export const getTravelDocuments = () => getTravelTools('documents');

// Convenience function for fetching travel document templates
export const getTravelDocumentTemplates = () => getTravelToolTemplates('documents');

// Create Travel Document builds a new record from validated input.
export const createTravelDocument = (payload) => travelToolEndpoints.documents.create(payload);

// Update Travel Document applies allowed changes to an existing record.
export const updateTravelDocument = (id, payload) => travelToolEndpoints.documents.update(id, payload);

// Delete Travel Document removes a record after ownership checks.
export const deleteTravelDocument = (id) => travelToolEndpoints.documents.delete(id);

// Creates a copy of an existing travel document with optional modifications
export const duplicateTravelDocument = (id, payload) => travelToolEndpoints.documents.duplicate(id, payload);

// Create Travel Document Template builds a new record from validated input.
export const createTravelDocumentTemplate = (payload) => travelToolEndpoints.documents.createTemplate(payload);

// Update Travel Document Template applies allowed changes to an existing record.
export const updateTravelDocumentTemplate = (id, payload) => travelToolEndpoints.documents.updateTemplate(id, payload);

// Delete Travel Document Template removes a record after ownership checks.
export const deleteTravelDocumentTemplate = (id) => travelToolEndpoints.documents.deleteTemplate(id);

// Add Travel Document Item builds a new record from validated input.
export const addTravelDocumentItem = (id, payload) => travelToolEndpoints.documents.addItem(id, payload);

// Delete Travel Document Item removes a record after ownership checks.
export const deleteTravelDocumentItem = (id, itemId) => travelToolEndpoints.documents.deleteItem(id, itemId);

// Uploads files to a travel document, optionally linking to a specific item
export const uploadTravelDocumentFiles = (id, files) =>
  travelToolEndpoints.documents.uploadFiles(id, { files });

// Uploads files to a specific item within a travel document
export const uploadTravelDocumentItemFiles = (id, itemId, files) =>
  travelToolEndpoints.documents.uploadFiles(id, { itemId, files });

// Deletes a specific file from a travel document
export const deleteTravelDocumentFile = (id, fileId) => travelToolEndpoints.documents.deleteFile(id, fileId);

// Retrieves the list of packing lists
export const getPackingLists = () => getTravelTools('packing');

// Retrieves packing list templates
export const getPackingListTemplates = () => getTravelToolTemplates('packing');

// Creates a new packing list template
export const createPackingListTemplate = (payload) => axiosClient.post(`${packingListBasePath}/templates`, payload);

// Updates an existing packing list template
export const updatePackingListTemplate = (id, payload) => axiosClient.patch(`${packingListBasePath}/templates/${id}`, payload);

// Deletes a packing list template by its identifier
export const deletePackingListTemplate = (id) => axiosClient.delete(`${packingListBasePath}/templates/${id}`);

// Creates a new packing list
export const createPackingList = (payload) => axiosClient.post(packingListBasePath, payload);

// Updates an existing packing list by its identifier
export const updatePackingList = (id, payload) => axiosClient.patch(`${packingListBasePath}/${id}`, payload);

// Deletes a packing list by its identifier
export const deletePackingList = (id) => axiosClient.delete(`${packingListBasePath}/${id}`);

// Creates a copy of an existing packing list with optional modifications
export const duplicatePackingList = (id, payload) => axiosClient.post(`${packingListBasePath}/${id}/duplicate`, payload);

// Adds a new item to a packing list
export const addPackingItem = (id, payload) => axiosClient.post(`${packingListBasePath}/${id}/items`, payload);

// Updates an existing item within a packing list
export const updatePackingItem = (id, itemId, payload) =>
  axiosClient.patch(`${packingListBasePath}/${id}/items/${itemId}`, payload);

// Deletes an item from a packing list by its identifier
export const deletePackingItem = (id, itemId) => axiosClient.delete(`${packingListBasePath}/${id}/items/${itemId}`);
