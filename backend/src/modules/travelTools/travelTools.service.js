/**
 * Travel Tools module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const AppError = require('../../utils/AppError');
const tripRepository = require('../trips/trip.repository');
const notificationService = require('../notifications/notification.service');
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

const allowedDocumentTypes = ['Passport', 'Visa', 'Insurance', 'Ticket', 'Booking', 'Custom'];
const allowedDocumentItemTypes = ['Passport', 'Visa', 'Insurance', 'Ticket', 'Booking', 'Transport', 'Health', 'Contact', 'Custom'];
const allowedDocumentMimeTypes = [
  'image/png',
  'image/jpeg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const standardDocumentTemplates = [
  {
    key: 'europe-vacation',
    name: 'Europe Vacation',
    title: 'Europe Vacation',
    documentType: 'Custom',
    description: 'Documents commonly needed for multi-city Europe trips.',
    source: 'system',
    items: [
      { name: 'Passport', documentType: 'Passport', uploadLabel: 'Upload scan' },
      { name: 'Visa', documentType: 'Visa', uploadLabel: 'Upload Schengen visa PDF' },
      { name: 'Travel Insurance', documentType: 'Insurance', uploadLabel: 'Upload travel insurance policy' },
      { name: 'Flight Booking', documentType: 'Ticket', uploadLabel: 'Upload e-ticket' },
      { name: 'Hotel Reservation', documentType: 'Booking', uploadLabel: 'Upload booking confirmation' },
      { name: 'Train Tickets', documentType: 'Transport', uploadLabel: 'Upload intercity train tickets' },
      { name: 'Vaccination Certificate', documentType: 'Health', uploadLabel: 'Upload certificate if required' },
      { name: 'Emergency Contacts', documentType: 'Contact', uploadLabel: 'Upload emergency contact sheet' },
      { name: 'Local Transport Pass', documentType: 'Transport', uploadLabel: 'Upload metro card or bus pass' },
    ],
  },
  {
    key: 'business-trip',
    name: 'Business Trip',
    title: 'Business Trip',
    documentType: 'Custom',
    description: 'Core documents for meetings, bookings, and company travel.',
    source: 'system',
    items: [
      { name: 'Passport', documentType: 'Passport', uploadLabel: 'Upload passport scan' },
      { name: 'Visa', documentType: 'Visa', uploadLabel: 'Upload work or entry visa' },
      { name: 'Flight Booking', documentType: 'Ticket', uploadLabel: 'Upload flight itinerary' },
      { name: 'Hotel Reservation', documentType: 'Booking', uploadLabel: 'Upload hotel confirmation' },
      { name: 'Travel Insurance', documentType: 'Insurance', uploadLabel: 'Upload insurance policy' },
    ],
  },
  {
    key: 'family-holiday',
    name: 'Family Holiday',
    title: 'Family Holiday',
    documentType: 'Custom',
    description: 'Shared document list for family travel.',
    source: 'system',
    items: [
      { name: 'Family Passports', documentType: 'Passport', uploadLabel: 'Upload passport scans' },
      { name: 'Travel Insurance', documentType: 'Insurance', uploadLabel: 'Upload family insurance policy' },
      { name: 'Flight Booking', documentType: 'Ticket', uploadLabel: 'Upload flight tickets' },
      { name: 'Hotel Reservation', documentType: 'Booking', uploadLabel: 'Upload booking confirmation' },
      { name: 'Emergency Contacts', documentType: 'Contact', uploadLabel: 'Upload contact sheet' },
    ],
  },
];
const findTemplate = (templateKey) =>
  packingTemplates.find((template) => template.key === templateKey);
const findUserTemplate = (templateId, userId) =>
  packingTemplateRepository.findByIdAndUserId(templateId, userId);
// Normalize Items prepares incoming data for consistent storage.
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
// Normalize Name prepares incoming data for consistent storage.
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
const assertUniquePackingTrip = async (userId, tripId, excludedId) => {
  if (!tripId) return;

  const packingLists = await packingListRepository.findByUserId(userId);
  const existingList = packingLists.find(
    (list) =>
      list.tripId?.toString() === tripId.toString() &&
      (!excludedId || list._id.toString() !== excludedId.toString())
  );

  if (existingList) throw new AppError('This trip is already linked to another packing list.', 409);
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
// Build Trip Fields transforms source data into the shape required nearby.
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
// Create Packing List builds a new record from validated input.
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
  await assertUniquePackingTrip(userId, tripFields.tripId);

  const packingList = await packingListRepository.create({
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
  await notificationService.notifyPackingList(packingList, 'created');
  return packingList;
};
// Update Packing List applies allowed changes to an existing record.
const updatePackingList = async (listId, userId, data) => {
  const updateData = { ...data };

  if (data.tripId) {
    Object.assign(updateData, await buildTripFields(data.tripId, userId));
    await assertUniquePackingTrip(userId, updateData.tripId, listId);
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
  await notificationService.notifyPackingList(packingList, 'updated');
  return packingList;
};
// Delete Packing List removes a record after ownership checks.
const deletePackingList = async (listId, userId) => {
  const packingList = await packingListRepository.deleteByIdAndUserId(listId, userId);
  if (!packingList) throw new AppError('Packing list not found', 404);
};

// Add Item builds a new record from validated input.
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
  const savedPackingList = await packingListRepository.save(packingList);
  return savedPackingList;
};

// Update Item applies allowed changes to an existing record.
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

  const savedPackingList = await packingListRepository.save(packingList);
  return savedPackingList;
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
  await assertUniquePackingTrip(userId, tripFields.tripId);

  const packingList = await packingListRepository.create({
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
  await notificationService.notifyPackingList(packingList, 'created');
  return packingList;
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

const getDocumentTemplates = async (userId) => {
  const templates = await documentTemplateRepository.findByUserId(userId);
  return [
    ...standardDocumentTemplates,
    ...templates.map((template) => ({
      id: template._id,
      key: template._id.toString(),
      name: template.name,
      title: template.name,
      documentType: allowedDocumentTypes.includes(template.documentType)
        ? template.documentType
        : `${template.documentType || 'custom'}`.replace(/^\w/, (letter) => letter.toUpperCase()),
      description: template.description,
      fileNames: template.fileNames || [],
      items: template.items || [],
      source: 'custom',
    })),
  ];
};
const normalizeDocumentFile = (file) => ({
  name: file.name.trim(),
  mimeType: file.mimeType,
  size: Number(file.size) || 0,
  dataUrl: file.dataUrl,
  previewType: file.previewType || (file.mimeType.startsWith('image/') ? 'image' : file.mimeType === 'application/pdf' ? 'pdf' : 'office'),
});
const normalizeDocumentItems = (items = []) =>
  items
    .filter((item) => item.name?.trim())
    .map((item) => ({
      name: item.name.trim(),
      documentType: allowedDocumentItemTypes.includes(item.documentType) ? item.documentType : 'Custom',
      uploadLabel: item.uploadLabel?.trim() || `Upload ${item.name.trim()}`,
      files: (item.files || []).map(normalizeDocumentFile),
    }));

const findDocumentTemplate = async (templateKey, userId) => {
  const systemTemplate = standardDocumentTemplates.find((template) => template.key === templateKey);
  if (systemTemplate) return systemTemplate;

  const userTemplate = templateKey ? await documentTemplateRepository.findByIdAndUserId(templateKey, userId) : null;
  if (!userTemplate) return null;

  return {
    key: userTemplate._id.toString(),
    name: userTemplate.name,
    title: userTemplate.name,
    documentType: userTemplate.documentType,
    items: userTemplate.items || [],
  };
};

const assertUniqueDocumentName = async (userId, name, excludedId) => {
  const documents = await tripDocumentRepository.findByUserId(userId);
  const normalizedName = normalizeName(name);
  const existingDocument = documents.find(
    (document) =>
      normalizeName(document.name) === normalizedName &&
      (!excludedId || document._id.toString() !== excludedId.toString())
  );

  if (existingDocument) throw new AppError('A travel document with this name already exists.', 409);
};

const assertUniqueDocumentTrip = async (userId, tripId, excludedId) => {
  if (!tripId) return;

  const documents = await tripDocumentRepository.findByUserId(userId);
  const existingDocument = documents.find(
    (document) =>
      document.tripId?.toString() === tripId.toString() &&
      (!excludedId || document._id.toString() !== excludedId.toString())
  );

  if (existingDocument) throw new AppError('This trip is already linked to another travel document list.', 409);
};

const getTravelDocumentById = async (documentId, userId) => {
  const document = await tripDocumentRepository.findByIdAndUserId(documentId, userId);
  if (!document) throw new AppError('Travel document not found', 404);
  return document;
};

const createTravelDocument = async (userId, data) => {
  const name = data.name?.trim();
  if (!name) throw new AppError('Document name is required.', 400);

  await assertUniqueDocumentName(userId, name);
  const tripFields = await buildTripFields(data.tripId, userId);
  await assertUniqueDocumentTrip(userId, tripFields.tripId);
  const template = data.templateKey ? await findDocumentTemplate(data.templateKey, userId) : null;
  if (data.templateKey && !template) throw new AppError('Travel document template not found', 404);
  const items = normalizeDocumentItems(data.items?.length ? data.items : template?.items || []);

  return tripDocumentRepository.create({
    userId,
    tripId: tripFields.tripId,
    name,
    type: allowedDocumentTypes.includes(data.type) ? data.type : 'Custom',
    templateKey: template?.key,
    items,
    files: [],
  });
};

const updateTravelDocument = async (documentId, userId, data) => {
  const updateData = {};

  if (data.name) {
    await assertUniqueDocumentName(userId, data.name, documentId);
    updateData.name = data.name.trim();
  }

  if (data.type) updateData.type = allowedDocumentTypes.includes(data.type) ? data.type : 'Custom';

  if (data.tripId) {
    const tripFields = await buildTripFields(data.tripId, userId);
    await assertUniqueDocumentTrip(userId, tripFields.tripId, documentId);
    updateData.tripId = tripFields.tripId;
  } else if (data.tripId === null) {
    updateData.tripId = null;
  }

  const document = await tripDocumentRepository.updateByIdAndUserId(documentId, userId, updateData);
  if (!document) throw new AppError('Travel document not found', 404);
  return document;
};

const deleteTravelDocument = async (documentId, userId) => {
  const document = await tripDocumentRepository.deleteByIdAndUserId(documentId, userId);
  if (!document) throw new AppError('Travel document not found', 404);
};

const addTravelDocumentFiles = async (documentId, userId, files, itemId) => {
  const document = await getTravelDocumentById(documentId, userId);
  const nextFiles = (files || []).map(normalizeDocumentFile);

  if (nextFiles.length === 0) throw new AppError('Upload at least one supported file.', 400);

  const unsupportedFile = nextFiles.find((file) => !allowedDocumentMimeTypes.includes(file.mimeType));
  if (unsupportedFile) throw new AppError('Upload PNG, JPG, JPEG, PDF, Word, PowerPoint, or Excel files only.', 400);

  if (itemId) {
    const item = document.items.id(itemId);
    if (!item) throw new AppError('Travel document item not found', 404);
    item.files.push(...nextFiles);
  } else {
    document.files.push(...nextFiles);
  }
  return tripDocumentRepository.save(document);
};

const deleteTravelDocumentFile = async (documentId, fileId, userId) => {
  const document = await getTravelDocumentById(documentId, userId);
  let file = document.files.id(fileId);
  let parentItem = null;
  if (!file) {
    parentItem = document.items.find((item) => item.files.id(fileId));
    file = parentItem?.files.id(fileId);
  }
  if (!file) throw new AppError('Travel document file not found', 404);

  file.deleteOne();
  return tripDocumentRepository.save(document);
};

const addTravelDocumentItem = async (documentId, userId, data) => {
  const document = await getTravelDocumentById(documentId, userId);
  const [item] = normalizeDocumentItems([data]);
  if (!item) throw new AppError('Document file name is required.', 400);
  document.items.push(item);
  return tripDocumentRepository.save(document);
};

const deleteTravelDocumentItem = async (documentId, itemId, userId) => {
  const document = await getTravelDocumentById(documentId, userId);
  const item = document.items.id(itemId);
  if (!item) throw new AppError('Travel document item not found', 404);

  item.deleteOne();
  return tripDocumentRepository.save(document);
};

const duplicateTravelDocument = async (documentId, userId, data = {}) => {
  const source = await getTravelDocumentById(documentId, userId);
  const title = data.name?.trim() || `${source.name} copy`;
  const tripFields = await buildTripFields(data.tripId, userId);

  await assertUniqueDocumentName(userId, title);
  await assertUniqueDocumentTrip(userId, tripFields.tripId);

  return tripDocumentRepository.create({
    userId,
    tripId: tripFields.tripId,
    name: title,
    type: source.type,
    templateKey: source.templateKey,
    items: source.items.map((item) => ({
      name: item.name,
      documentType: item.documentType,
      uploadLabel: item.uploadLabel,
      files: item.files.map((file) => ({
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        dataUrl: file.dataUrl,
        previewType: file.previewType,
      })),
    })),
    files: source.files.map((file) => ({
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      dataUrl: file.dataUrl,
      previewType: file.previewType,
    })),
  });
};

const createDocumentTemplate = async (userId, data) => {
  const name = data.name?.trim();
  if (!name) throw new AppError('Template name is required.', 400);

  const templates = await documentTemplateRepository.findByUserId(userId);
  const existingTemplate = templates.find((template) => normalizeName(template.name) === normalizeName(name));
  if (existingTemplate) throw new AppError('A document template with this name already exists.', 409);

  const sourceDocument = data.documentId ? await getTravelDocumentById(data.documentId, userId) : null;
  const documentType = allowedDocumentTypes.includes(data.documentType)
    ? data.documentType
    : sourceDocument?.type || 'Custom';

  return documentTemplateRepository.create({
    userId,
    name,
    documentType,
    description: data.description?.trim() || '',
    fileNames: sourceDocument?.files?.map((file) => file.name) || [],
    items: sourceDocument?.items?.map((item) => ({
      name: item.name,
      documentType: item.documentType,
      uploadLabel: item.uploadLabel,
    })) || normalizeDocumentItems(data.items || []),
  });
};

const updateDocumentTemplate = async (templateId, userId, data) => {
  const existingTemplate = await documentTemplateRepository.findByIdAndUserId(templateId, userId);
  if (!existingTemplate) throw new AppError('Document template not found', 404);

  const name = data.name?.trim();
  if (!name) throw new AppError('Template name is required.', 400);

  const templates = await documentTemplateRepository.findByUserId(userId);
  const duplicateTemplate = templates.find(
    (template) =>
      normalizeName(template.name) === normalizeName(name) &&
      template._id.toString() !== templateId.toString()
  );
  if (duplicateTemplate) throw new AppError('A document template with this name already exists.', 409);

  return documentTemplateRepository.updateByIdAndUserId(templateId, userId, {
    name,
    documentType: allowedDocumentTypes.includes(data.documentType) ? data.documentType : 'Custom',
    description: data.description?.trim() || '',
    items: normalizeDocumentItems(data.items || []),
  });
};

const deleteDocumentTemplate = async (templateId, userId) => {
  const template = await documentTemplateRepository.deleteByIdAndUserId(templateId, userId);
  if (!template) throw new AppError('Document template not found', 404);
  return template;
};

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
  getPackingListById,
  getTravelDocumentById,
  getTravelDocuments,
  getTemplates,
  getDocumentTemplates,
  updateItem,
  updateDocumentTemplate,
  updatePackingList,
  updateTemplate,
  updateTravelDocument,
};
