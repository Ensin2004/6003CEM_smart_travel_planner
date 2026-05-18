const AppError = require('../../utils/AppError');
const tripRepository = require('../trips/trip.repository');
const packingListRepository = require('./packingList.repository');
const packingTemplates = require('./packingList.templates');
const {
  defaultPackingCategory,
  normalizePriorityLevel,
} = require('./packingList.constants');

const findTemplate = (templateKey) =>
  packingTemplates.find((template) => template.key === templateKey);

const normalizeItems = (items = []) =>
  items.map((item) => ({
    name: item.name,
    category: item.category || defaultPackingCategory,
    priority: normalizePriorityLevel(item.priority),
    quantity: item.quantity || 1,
    isPacked: Boolean(item.isPacked),
  }));

const getTemplates = () => packingTemplates;

const getMyPackingLists = (userId) => packingListRepository.findByUserId(userId);

const getPackingListById = async (listId, userId) => {
  const packingList = await packingListRepository.findByIdAndUserId(listId, userId);
  if (!packingList) throw new AppError('Packing list not found', 404);
  return packingList;
};

const buildTripFields = async (tripId, userId) => {
  if (!tripId) return {};

  const trip = await tripRepository.findByIdAndUserId(tripId, userId);
  if (!trip) throw new AppError('Trip not found', 404);

  return {
    tripId: trip._id,
    destination: trip.destination,
    tripStartDate: trip.startDate,
    tripEndDate: trip.endDate,
  };
};

const createPackingList = async (userId, data) => {
  const template = data.templateKey ? findTemplate(data.templateKey) : null;
  if (data.templateKey && !template) throw new AppError('Packing list template not found', 404);

  const tripFields = await buildTripFields(data.tripId, userId);
  const items = data.items?.length ? normalizeItems(data.items) : template?.items || [];

  return packingListRepository.create({
    userId,
    ...tripFields,
    title: data.title || template?.title || 'New packing list',
    destination: data.destination || tripFields.destination,
    tripStartDate: data.tripStartDate || tripFields.tripStartDate,
    tripEndDate: data.tripEndDate || tripFields.tripEndDate,
    templateKey: template?.key,
    items,
    reminder: {
      enabled: data.reminder?.enabled ?? true,
      daysBeforeTrip: data.reminder?.daysBeforeTrip ?? 2,
    },
  });
};

const updatePackingList = async (listId, userId, data) => {
  const updateData = { ...data };

  if (data.tripId) {
    Object.assign(updateData, await buildTripFields(data.tripId, userId));
  }

  const packingList = await packingListRepository.updateByIdAndUserId(listId, userId, updateData);
  if (!packingList) throw new AppError('Packing list not found', 404);
  return packingList;
};

const deletePackingList = async (listId, userId) => {
  const packingList = await packingListRepository.deleteByIdAndUserId(listId, userId);
  if (!packingList) throw new AppError('Packing list not found', 404);
};

const addItem = async (listId, userId, data) => {
  const packingList = await getPackingListById(listId, userId);
  packingList.items.push({
    name: data.name,
    category: data.category || defaultPackingCategory,
    priority: normalizePriorityLevel(data.priority),
    quantity: data.quantity || 1,
    isPacked: Boolean(data.isPacked),
  });
  return packingListRepository.save(packingList);
};

const updateItem = async (listId, itemId, userId, data) => {
  const packingList = await getPackingListById(listId, userId);
  const item = packingList.items.id(itemId);
  if (!item) throw new AppError('Packing item not found', 404);

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) item[key] = key === 'priority' ? normalizePriorityLevel(value) : value;
  });

  return packingListRepository.save(packingList);
};

const deleteItem = async (listId, itemId, userId) => {
  const packingList = await getPackingListById(listId, userId);
  const item = packingList.items.id(itemId);
  if (!item) throw new AppError('Packing item not found', 404);

  item.deleteOne();
  return packingListRepository.save(packingList);
};

const duplicatePackingList = async (listId, userId, data) => {
  const source = await getPackingListById(listId, userId);
  const tripFields = await buildTripFields(data.tripId, userId);

  return packingListRepository.create({
    userId,
    ...tripFields,
    title: data.title || `${source.title} copy`,
    destination: data.destination || tripFields.destination || source.destination,
    tripStartDate: data.tripStartDate || tripFields.tripStartDate || source.tripStartDate,
    tripEndDate: data.tripEndDate || tripFields.tripEndDate || source.tripEndDate,
    templateKey: source.templateKey,
    items: source.items.map((item) => ({
      name: item.name,
      category: item.category,
      priority: normalizePriorityLevel(item.priority),
      quantity: item.quantity,
      isPacked: false,
    })),
    reminder: {
      enabled: source.reminder?.enabled ?? true,
      daysBeforeTrip: source.reminder?.daysBeforeTrip ?? 2,
    },
  });
};

module.exports = {
  addItem,
  createPackingList,
  deleteItem,
  deletePackingList,
  duplicatePackingList,
  getMyPackingLists,
  getPackingListById,
  getTemplates,
  updateItem,
  updatePackingList,
};
