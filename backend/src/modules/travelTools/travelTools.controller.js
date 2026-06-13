/**
 * Travel Tools module.
 * Request handlers translate HTTP input into service calls and response payloads.
 */
const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const travelToolsService = require('./travelTools.service');
const getTemplates = catchAsync(async (req, res) => {
  const templates = await travelToolsService.getTemplates(req.user.id);
  sendSuccess(res, 200, { templates });
});
// Create Template builds a new record from validated input.
const createTemplate = catchAsync(async (req, res) => {
  const template = await travelToolsService.createTemplate(req.user.id, req.body);
  sendSuccess(res, 201, { template }, 'Packing template created');
});
// Update Template applies allowed changes to an existing record.
const updateTemplate = catchAsync(async (req, res) => {
  const template = await travelToolsService.updateTemplate(req.params.templateId, req.user.id, req.body);
  sendSuccess(res, 200, { template }, 'Packing template updated');
});
// Delete Template removes a record after ownership checks.
const deleteTemplate = catchAsync(async (req, res) => {
  await travelToolsService.deleteTemplate(req.params.templateId, req.user.id);
  res.status(204).send();
});
// Create Packing List builds a new record from validated input.
const createPackingList = catchAsync(async (req, res) => {
  const packingList = await travelToolsService.createPackingList(req.user.id, req.body);
  sendSuccess(res, 201, { packingList }, 'Packing list created');
});
const getMyPackingLists = catchAsync(async (req, res) => {
  const packingLists = await travelToolsService.getMyPackingLists(req.user.id);
  sendSuccess(res, 200, { packingLists });
});
const getPackingList = catchAsync(async (req, res) => {
  const packingList = await travelToolsService.getPackingListById(req.params.id, req.user.id);
  sendSuccess(res, 200, { packingList });
});
// Update Packing List applies allowed changes to an existing record.
const updatePackingList = catchAsync(async (req, res) => {
  const packingList = await travelToolsService.updatePackingList(req.params.id, req.user.id, req.body);
  sendSuccess(res, 200, { packingList }, 'Packing list updated');
});
// Delete Packing List removes a record after ownership checks.
const deletePackingList = catchAsync(async (req, res) => {
  await travelToolsService.deletePackingList(req.params.id, req.user.id);
  res.status(204).send();
});
// Add Item builds a new record from validated input.
const addItem = catchAsync(async (req, res) => {
  const packingList = await travelToolsService.addItem(req.params.id, req.user.id, req.body);
  sendSuccess(res, 201, { packingList }, 'Packing item added');
});
// Update Item applies allowed changes to an existing record.
const updateItem = catchAsync(async (req, res) => {
  const packingList = await travelToolsService.updateItem(
    req.params.id,
    req.params.itemId,
    req.user.id,
    req.body
  );
  sendSuccess(res, 200, { packingList }, 'Packing item updated');
});
// Delete Item removes a record after ownership checks.
const deleteItem = catchAsync(async (req, res) => {
  const packingList = await travelToolsService.deleteItem(req.params.id, req.params.itemId, req.user.id);
  sendSuccess(res, 200, { packingList }, 'Packing item deleted');
});
const duplicatePackingList = catchAsync(async (req, res) => {
  const packingList = await travelToolsService.duplicatePackingList(req.params.id, req.user.id, req.body);
  sendSuccess(res, 201, { packingList }, 'Packing list duplicated');
});
const getTravelDocuments = catchAsync(async (req, res) => {
  const documents = await travelToolsService.getTravelDocuments(req.user.id);
  sendSuccess(res, 200, { documents });
});

// Create Travel Document builds a new record from validated input.
const createTravelDocument = catchAsync(async (req, res) => {
  const document = await travelToolsService.createTravelDocument(req.user.id, req.body);
  sendSuccess(res, 201, { document }, 'Travel document created');
});

// Update Travel Document applies allowed changes to an existing record.
const updateTravelDocument = catchAsync(async (req, res) => {
  const document = await travelToolsService.updateTravelDocument(req.params.documentId, req.user.id, req.body);
  sendSuccess(res, 200, { document }, 'Travel document updated');
});
const deleteTravelDocument = catchAsync(async (req, res) => {
  await travelToolsService.deleteTravelDocument(req.params.documentId, req.user.id);
  res.status(204).send();
});
const addTravelDocumentFiles = catchAsync(async (req, res) => {
  const document = await travelToolsService.addTravelDocumentFiles(
    req.params.documentId,
    req.user.id,
    req.body.files,
    req.body.itemId
  );
  sendSuccess(res, 201, { document }, 'Travel document files uploaded');
});
const addTravelDocumentItem = catchAsync(async (req, res) => {
  const document = await travelToolsService.addTravelDocumentItem(req.params.documentId, req.user.id, req.body);
  sendSuccess(res, 201, { document }, 'Travel document item added');
});
const deleteTravelDocumentItem = catchAsync(async (req, res) => {
  const document = await travelToolsService.deleteTravelDocumentItem(
    req.params.documentId,
    req.params.itemId,
    req.user.id
  );
  sendSuccess(res, 200, { document }, 'Travel document item deleted');
});
const deleteTravelDocumentFile = catchAsync(async (req, res) => {
  const document = await travelToolsService.deleteTravelDocumentFile(
    req.params.documentId,
    req.params.fileId,
    req.user.id
  );
  sendSuccess(res, 200, { document }, 'Travel document file deleted');
});
const duplicateTravelDocument = catchAsync(async (req, res) => {
  const document = await travelToolsService.duplicateTravelDocument(req.params.documentId, req.user.id, req.body);
  sendSuccess(res, 201, { document }, 'Travel document duplicated');
});
const getDocumentTemplates = catchAsync(async (req, res) => {
  const templates = await travelToolsService.getDocumentTemplates(req.user.id);
  sendSuccess(res, 200, { templates });
});
const createDocumentTemplate = catchAsync(async (req, res) => {
  const template = await travelToolsService.createDocumentTemplate(req.user.id, req.body);
  sendSuccess(res, 201, { template }, 'Document template created');
});
const updateDocumentTemplate = catchAsync(async (req, res) => {
  const template = await travelToolsService.updateDocumentTemplate(req.params.templateId, req.user.id, req.body);
  sendSuccess(res, 200, { template }, 'Document template updated');
});
const deleteDocumentTemplate = catchAsync(async (req, res) => {
  await travelToolsService.deleteDocumentTemplate(req.params.templateId, req.user.id);
  res.status(204).send();
});

module.exports = {
  addItem,
  addTravelDocumentItem,
  addTravelDocumentFiles,
  createPackingList,
  createDocumentTemplate,
  createTemplate,
  createTravelDocument,
  deleteItem,
  deletePackingList,
  deleteDocumentTemplate,
  deleteTemplate,
  deleteTravelDocument,
  deleteTravelDocumentFile,
  deleteTravelDocumentItem,
  duplicateTravelDocument,
  duplicatePackingList,
  getMyPackingLists,
  getPackingList,
  getTravelDocuments,
  getDocumentTemplates,
  getTemplates,
  updateItem,
  updateDocumentTemplate,
  updatePackingList,
  updateTravelDocument,
  updateTemplate,
};
