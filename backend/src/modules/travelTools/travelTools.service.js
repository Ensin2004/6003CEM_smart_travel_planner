const AppError = require('../../utils/AppError');
const tripRepository = require('../trips/trip.repository');
const {
  documentTemplateRepository,
  packingListRepository,
  packingTemplateRepository,
  tripDocumentRepository,
} = require('./travelTools.repository');
const packingTemplates = require('./travelTools.templates');
const {
  defaultPackingCategory,
  normalizePriorityLevel,
} = require('./travelTools.constants');

const findTemplate = (templateKey) =>
  packingTemplates.find((template) => template.key === templateKey);

const findUserTemplate = (templateId, userId) =>
  packingTemplateRepository.findByIdAndUserId(templateId, userId);

const normalizeItems = (items = []) =>
  items
    .filter((item) => item.name?.trim())
    .map((item) => ({
      name: item.name.trim(),
      category: item.category?.trim() || defaultPackingCategory,
      priority: normalizePriorityLevel(item.priority),
      quantity: item.quantity || 1,
      isPacked: Boolean(item.isPacked),
    }));

const normalizeName = (value = '') => value.trim().replace(/\s+/g, ' ').toLowerCase();

const assertUniquePackingListTitle = async (userId, title, excludedId) => {
  const packingLists = await packingListRepository.findByUserId(userId);
  const normalizedTitle = normalizeName(title);
  const existingList = packingLists.find(
    (list) =>
      normalizeName(list.title) === normalizedTitle &&
      (!excludedId || list._id.toString() !== excludedId.toString())
  );

  if (existingList) throw new AppError('A packing list with this name already exists.', 409);
};

const assertUniqueItemName = (packingList, itemName, excludedItemId) => {
  const normalizedItemName = normalizeName(itemName);
  const duplicateItem = packingList.items.find(
    (item) =>
      normalizeName(item.name) === normalizedItemName &&
      (!excludedItemId || item._id.toString() !== excludedItemId.toString())
  );

  if (duplicateItem) throw new AppError('An item with this name already exists in this packing list.', 409);
};

const getTemplates = async (userId) => {
  const userTemplates = await packingTemplateRepository.findByUserId(userId);
  return [
    ...packingTemplates.map((template) => ({
      ...template,
      source: 'system',
    })),
    ...userTemplates.map((template) => ({
      id: template._id,
      key: template._id.toString(),
      title: template.title,
      destination: template.destination,
      description: template.description || 'Custom packing template',
      tripId: template.tripId,
      items: template.items,
      source: 'custom',
    })),
  ];
};

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
  const systemTemplate = data.templateKey ? findTemplate(data.templateKey) : null;
  const userTemplate =
    data.templateKey && !systemTemplate ? await findUserTemplate(data.templateKey, userId) : null;
  const template = systemTemplate || userTemplate;
  if (data.templateKey && !template) throw new AppError('Packing list template not found', 404);

  const tripFields = await buildTripFields(data.tripId, userId);
  const items = data.items?.length ? normalizeItems(data.items) : template?.items || [];
  const title = data.title?.trim();
  const destination = data.destination?.trim() || tripFields.destination || template?.destination;

  if (!title) throw new AppError('Packing list title is required.', 400);

  await assertUniquePackingListTitle(userId, title);

  return packingListRepository.create({
    userId,
    ...tripFields,
    title,
    destination,
    tripStartDate: data.tripStartDate || tripFields.tripStartDate,
    tripEndDate: data.tripEndDate || tripFields.tripEndDate,
    templateKey: systemTemplate?.key || userTemplate?._id.toString(),
    items: normalizeItems(items),
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
  } else if (data.tripId === null) {
    updateData.tripId = null;
    updateData.tripStartDate = null;
    updateData.tripEndDate = null;
  }

  if (data.title) {
    await assertUniquePackingListTitle(userId, data.title, listId);
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

  assertUniqueItemName(packingList, data.name);

  packingList.items.push({
    name: data.name,
    category: data.category?.trim() || defaultPackingCategory,
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

  if (data.name) {
    assertUniqueItemName(packingList, data.name, itemId);
  }

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
  const title = data.title || `${source.title} copy`;

  await assertUniquePackingListTitle(userId, title);

  return packingListRepository.create({
    userId,
    ...tripFields,
    title,
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

const createTemplate = async (userId, data) => {
  const title = data.title?.trim();
  if (!title) throw new AppError('Template title is required.', 400);

  const templates = await packingTemplateRepository.findByUserId(userId);
  const existingTemplate = templates.find((template) => normalizeName(template.title) === normalizeName(title));
  if (existingTemplate) throw new AppError('A template with this name already exists.', 409);

  const tripFields = await buildTripFields(data.tripId, userId);
  const items = normalizeItems(data.items || []);
  if (items.length === 0) throw new AppError('Add at least one item to save a template.', 400);

  const duplicateItem = items.find(
    (item, index) => items.findIndex((candidate) => normalizeName(candidate.name) === normalizeName(item.name)) !== index
  );
  if (duplicateItem) throw new AppError('Template item names must be unique.', 409);

  return packingTemplateRepository.create({
    userId,
    ...tripFields,
    title,
    destination: data.destination?.trim() || tripFields.destination,
    description: data.description?.trim(),
    items,
  });
};

const updateTemplate = async (templateId, userId, data) => {
  const existingTemplate = await packingTemplateRepository.findByIdAndUserId(templateId, userId);
  if (!existingTemplate) throw new AppError('Packing template not found', 404);

  const title = data.title?.trim();
  const description = data.description?.trim();
  if (!title) throw new AppError('Template title is required.', 400);
  if (!description) throw new AppError('Template description is required.', 400);

  const templates = await packingTemplateRepository.findByUserId(userId);
  const duplicateTemplate = templates.find(
    (template) =>
      normalizeName(template.title) === normalizeName(title) &&
      template._id.toString() !== templateId.toString()
  );
  if (duplicateTemplate) throw new AppError('A template with this name already exists.', 409);

  const items = normalizeItems(data.items || []);
  if (items.length === 0) throw new AppError('Add at least one item to save a template.', 400);

  const duplicateItem = items.find(
    (item, index) => items.findIndex((candidate) => normalizeName(candidate.name) === normalizeName(item.name)) !== index
  );
  if (duplicateItem) throw new AppError('Template item names must be unique.', 409);

  return packingTemplateRepository.updateByIdAndUserId(templateId, userId, {
    title,
    description,
    destination: data.destination?.trim(),
    items,
  });
};

const deleteTemplate = async (templateId, userId) => {
  const template = await packingTemplateRepository.deleteByIdAndUserId(templateId, userId);
  if (!template) throw new AppError('Packing template not found', 404);
  return template;
};

const getTravelDocuments = (userId) => tripDocumentRepository.findByUserId(userId);

const getDocumentTemplates = (userId) => documentTemplateRepository.findByUserId(userId);

module.exports = {
  addItem,
  createPackingList,
  createTemplate,
  deleteItem,
  deletePackingList,
  deleteTemplate,
  duplicatePackingList,
  getMyPackingLists,
  getPackingListById,
  getTravelDocuments,
  getTemplates,
  getDocumentTemplates,
  updateItem,
  updatePackingList,
  updateTemplate,
};
