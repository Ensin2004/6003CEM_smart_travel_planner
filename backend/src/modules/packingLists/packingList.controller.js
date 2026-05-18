const catchAsync = require('../../utils/catchAsync');
const { sendSuccess } = require('../../utils/apiResponse');
const packingListService = require('./packingList.service');

const getTemplates = catchAsync(async (req, res) => {
  sendSuccess(res, 200, { templates: packingListService.getTemplates() });
});

const createPackingList = catchAsync(async (req, res) => {
  const packingList = await packingListService.createPackingList(req.user.id, req.body);
  sendSuccess(res, 201, { packingList }, 'Packing list created');
});

const getMyPackingLists = catchAsync(async (req, res) => {
  const packingLists = await packingListService.getMyPackingLists(req.user.id);
  sendSuccess(res, 200, { packingLists });
});

const getPackingList = catchAsync(async (req, res) => {
  const packingList = await packingListService.getPackingListById(req.params.id, req.user.id);
  sendSuccess(res, 200, { packingList });
});

const updatePackingList = catchAsync(async (req, res) => {
  const packingList = await packingListService.updatePackingList(req.params.id, req.user.id, req.body);
  sendSuccess(res, 200, { packingList }, 'Packing list updated');
});

const deletePackingList = catchAsync(async (req, res) => {
  await packingListService.deletePackingList(req.params.id, req.user.id);
  res.status(204).send();
});

const addItem = catchAsync(async (req, res) => {
  const packingList = await packingListService.addItem(req.params.id, req.user.id, req.body);
  sendSuccess(res, 201, { packingList }, 'Packing item added');
});

const updateItem = catchAsync(async (req, res) => {
  const packingList = await packingListService.updateItem(
    req.params.id,
    req.params.itemId,
    req.user.id,
    req.body
  );
  sendSuccess(res, 200, { packingList }, 'Packing item updated');
});

const deleteItem = catchAsync(async (req, res) => {
  const packingList = await packingListService.deleteItem(req.params.id, req.params.itemId, req.user.id);
  sendSuccess(res, 200, { packingList }, 'Packing item deleted');
});

const duplicatePackingList = catchAsync(async (req, res) => {
  const packingList = await packingListService.duplicatePackingList(req.params.id, req.user.id, req.body);
  sendSuccess(res, 201, { packingList }, 'Packing list duplicated');
});

module.exports = {
  addItem,
  createPackingList,
  deleteItem,
  deletePackingList,
  duplicatePackingList,
  getMyPackingLists,
  getPackingList,
  getTemplates,
  updateItem,
  updatePackingList,
};
