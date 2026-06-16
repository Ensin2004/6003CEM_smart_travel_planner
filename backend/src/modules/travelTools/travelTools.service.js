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

// Allowed document types for validation
const allowedDocumentTypes = ['Passport', 'Visa', 'Insurance', 'Ticket', 'Booking', 'Custom'];

// Allowed document item types
const allowedDocumentItemTypes = ['Passport', 'Visa', 'Insurance', 'Ticket', 'Booking', 'Transport', 'Health', 'Contact', 'Custom'];

// Allowed MIME types for document uploads
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

// Standard system document templates
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

// Find system template by key
const findTemplate = (templateKey) =>
  packingTemplates.find((template) => template.key === templateKey);

// Find user template by ID
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

// Ensure unique packing list title per user
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

// Ensure unique packing list per trip
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

// Ensure unique item name within a packing list
const assertUniqueItemName = (packingList, itemName, excludedItemId) => {
  const normalizedItemName = normalizeName(itemName);
  const duplicateItem = packingList.items.find(
    (item) =>
      normalizeName(item.name) === normalizedItemName &&
      (!excludedItemId || item._id.toString() !== excludedItemId.toString())
  );

  if (duplicateItem) throw new AppError('An item with this name already exists in this packing list.', 409);
};

// Get all templates (system + user)
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

// Get all packing lists for a user
const getMyPackingLists = (userId) => packingListRepository.findByUserId(userId);

// Get a specific packing list by ID
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
  // Find template if provided
  const systemTemplate = data.templateKey ? findTemplate(data.templateKey) : null;
  const userTemplate =
    data.templateKey && !systemTemplate ? await findUserTemplate(data.templateKey, userId) : null;
  const template = systemTemplate || userTemplate;
  if (data.templateKey && !template) throw new AppError('Packing list template not found', 404);

  // Build trip fields
  const tripFields = await buildTripFields(data.tripId, userId);
  const items = data.items?.length ? normalizeItems(data.items) : template?.items || [];
  const title = data.title?.trim();
  const destination = data.destination?.trim() || tripFields.destination || template?.destination;

  // Validate title
  if (!title) throw new AppError('Packing list title is required.', 400);

  // Check uniqueness
  await assertUniquePackingListTitle(userId, title);
  await assertUniquePackingTrip(userId, tripFields.tripId);

  // Create packing list
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
  
  // Schedule reminder notification
  await notificationService.schedulePackingListReminder(packingList);
  return packingList;
};

// Update Packing List applies allowed changes to an existing record.
const updatePackingList = async (listId, userId, data) => {
  const updateData = { ...data };

  // Handle trip update
  if (data.tripId) {
    Object.assign(updateData, await buildTripFields(data.tripId, userId));
    await assertUniquePackingTrip(userId, updateData.tripId, listId);
  } else if (data.tripId === null) {
    updateData.tripId = null;
    updateData.tripStartDate = null;
    updateData.tripEndDate = null;
  }

  // Check title uniqueness if updated
  if (data.title) {
    await assertUniquePackingListTitle(userId, data.title, listId);
  }

  // Update and reschedule reminder
  const packingList = await packingListRepository.updateByIdAndUserId(listId, userId, updateData);
  if (!packingList) throw new AppError('Packing list not found', 404);
  await notificationService.schedulePackingListReminder(packingList);
  return packingList;
};

// Delete Packing List removes a record after ownership checks.
const deletePackingList = async (listId, userId) => {
  const packingList = await packingListRepository.deleteByIdAndUserId(listId, userId);
  if (!packingList) throw new AppError('Packing list not found', 404);
  await notificationService.cancelPackingListReminder(packingList);
};

// Add Item builds a new record from validated input.
const addItem = async (listId, userId, data) => {
  const packingList = await getPackingListById(listId, userId);

  // Ensure unique item name
  assertUniqueItemName(packingList, data.name);

  // Add item to list
  packingList.items.push({
    name: data.name,
    category: data.category?.trim() || defaultPackingCategory,
    priority: normalizePriorityLevel(data.priority),
    quantity: data.quantity || 1,
    isPacked: Boolean(data.isPacked),
  });
  
  // Save and schedule reminder
  const savedPackingList = await packingListRepository.save(packingList);
  await notificationService.schedulePackingListReminder(savedPackingList);
  return savedPackingList;
};

// Update Item applies allowed changes to an existing record.
const updateItem = async (listId, itemId, userId, data) => {
  const packingList = await getPackingListById(listId, userId);
  const item = packingList.items.id(itemId);
  if (!item) throw new AppError('Packing item not found', 404);

  // Check name uniqueness if updated
  if (data.name) {
    assertUniqueItemName(packingList, data.name, itemId);
  }

  // Apply updates
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) item[key] = key === 'priority' ? normalizePriorityLevel(value) : value;
  });

  // Save and schedule reminder
  const savedPackingList = await packingListRepository.save(packingList);
  await notificationService.schedulePackingListReminder(savedPackingList);
  return savedPackingList;
};

// Delete item from packing list
const deleteItem = async (listId, itemId, userId) => {
  const packingList = await getPackingListById(listId, userId);
  const item = packingList.items.id(itemId);
  if (!item) throw new AppError('Packing item not found', 404);

  // Remove item
  item.deleteOne();
  
  // Save and schedule reminder
  const savedPackingList = await packingListRepository.save(packingList);
  await notificationService.schedulePackingListReminder(savedPackingList);
  return savedPackingList;
};

// Duplicate an existing packing list
const duplicatePackingList = async (listId, userId, data) => {
  const source = await getPackingListById(listId, userId);
  const tripFields = await buildTripFields(data.tripId, userId);
  const title = data.title || `${source.title} copy`;

  // Check uniqueness
  await assertUniquePackingListTitle(userId, title);
  await assertUniquePackingTrip(userId, tripFields.tripId);

  // Create duplicate
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
  
  // Schedule reminder
  await notificationService.schedulePackingListReminder(packingList);
  return packingList;
};

// Create a new packing template
const createTemplate = async (userId, data) => {
  const title = data.title?.trim();
  if (!title) throw new AppError('Template title is required.', 400);

  // Check uniqueness
  const templates = await packingTemplateRepository.findByUserId(userId);
  const existingTemplate = templates.find((template) => normalizeName(template.title) === normalizeName(title));
  if (existingTemplate) throw new AppError('A template with this name already exists.', 409);

  // Build trip fields
  const tripFields = await buildTripFields(data.tripId, userId);
  const items = normalizeItems(data.items || []);
  
  // Validate items
  if (items.length === 0) throw new AppError('Add at least one item to save a template.', 400);

  // Check for duplicate item names
  const duplicateItem = items.find(
    (item, index) => items.findIndex((candidate) => normalizeName(candidate.name) === normalizeName(item.name)) !== index
  );
  if (duplicateItem) throw new AppError('Template item names must be unique.', 409);

  // Create template
  return packingTemplateRepository.create({
    userId,
    ...tripFields,
    title,
    destination: data.destination?.trim() || tripFields.destination,
    description: data.description?.trim(),
    items,
  });
};

// Update an existing packing template
const updateTemplate = async (templateId, userId, data) => {
  const existingTemplate = await packingTemplateRepository.findByIdAndUserId(templateId, userId);
  if (!existingTemplate) throw new AppError('Packing template not found', 404);

  // Validate required fields
  const title = data.title?.trim();
  const description = data.description?.trim();
  if (!title) throw new AppError('Template title is required.', 400);
  if (!description) throw new AppError('Template description is required.', 400);

  // Check uniqueness
  const templates = await packingTemplateRepository.findByUserId(userId);
  const duplicateTemplate = templates.find(
    (template) =>
      normalizeName(template.title) === normalizeName(title) &&
      template._id.toString() !== templateId.toString()
  );
  if (duplicateTemplate) throw new AppError('A template with this name already exists.', 409);

  // Validate items
  const items = normalizeItems(data.items || []);
  if (items.length === 0) throw new AppError('Add at least one item to save a template.', 400);

  const duplicateItem = items.find(
    (item, index) => items.findIndex((candidate) => normalizeName(candidate.name) === normalizeName(item.name)) !== index
  );
  if (duplicateItem) throw new AppError('Template item names must be unique.', 409);

  // Update template
  return packingTemplateRepository.updateByIdAndUserId(templateId, userId, {
    title,
    description,
    destination: data.destination?.trim(),
    items,
  });
};

// Delete a packing template
const deleteTemplate = async (templateId, userId) => {
  const template = await packingTemplateRepository.deleteByIdAndUserId(templateId, userId);
  if (!template) throw new AppError('Packing template not found', 404);
  return template;
};

// Get all travel documents for a user
const getTravelDocuments = (userId) => tripDocumentRepository.findByUserId(userId);

// Get document templates (system + user)
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

// Normalize document file data
const normalizeDocumentFile = (file) => ({
  name: file.name.trim(),
  mimeType: file.mimeType,
  size: Number(file.size) || 0,
  dataUrl: file.dataUrl,
  previewType: file.previewType || (file.mimeType.startsWith('image/') ? 'image' : file.mimeType === 'application/pdf' ? 'pdf' : 'office'),
});

// Normalize document items
const normalizeDocumentItems = (items = []) =>
  items
    .filter((item) => item.name?.trim())
    .map((item) => ({
      name: item.name.trim(),
      documentType: allowedDocumentItemTypes.includes(item.documentType) ? item.documentType : 'Custom',
      uploadLabel: item.uploadLabel?.trim() || `Upload ${item.name.trim()}`,
      files: (item.files || []).map(normalizeDocumentFile),
    }));

// Find document template by key (system or user)
const findDocumentTemplate = async (templateKey, userId) => {
  // Check system templates
  const systemTemplate = standardDocumentTemplates.find((template) => template.key === templateKey);
  if (systemTemplate) return systemTemplate;

  // Check user templates
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

// Ensure unique document name per user
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

// Ensure unique document per trip
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

// Get travel document by ID
const getTravelDocumentById = async (documentId, userId) => {
  const document = await tripDocumentRepository.findByIdAndUserId(documentId, userId);
  if (!document) throw new AppError('Travel document not found', 404);
  return document;
};

// Create a new travel document
const createTravelDocument = async (userId, data) => {
  const name = data.name?.trim();
  if (!name) throw new AppError('Document name is required.', 400);

  // Check uniqueness
  await assertUniqueDocumentName(userId, name);
  
  // Build trip fields
  const tripFields = await buildTripFields(data.tripId, userId);
  await assertUniqueDocumentTrip(userId, tripFields.tripId);
  
  // Find template if provided
  const template = data.templateKey ? await findDocumentTemplate(data.templateKey, userId) : null;
  if (data.templateKey && !template) throw new AppError('Travel document template not found', 404);
  
  // Normalize items
  const items = normalizeDocumentItems(data.items?.length ? data.items : template?.items || []);

  // Create document
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

// Update a travel document
const updateTravelDocument = async (documentId, userId, data) => {
  const updateData = {};

  // Handle name update
  if (data.name) {
    await assertUniqueDocumentName(userId, data.name, documentId);
    updateData.name = data.name.trim();
  }

  // Handle type update
  if (data.type) updateData.type = allowedDocumentTypes.includes(data.type) ? data.type : 'Custom';

  // Handle trip update
  if (data.tripId) {
    const tripFields = await buildTripFields(data.tripId, userId);
    await assertUniqueDocumentTrip(userId, tripFields.tripId, documentId);
    updateData.tripId = tripFields.tripId;
  } else if (data.tripId === null) {
    updateData.tripId = null;
  }

  // Update document
  const document = await tripDocumentRepository.updateByIdAndUserId(documentId, userId, updateData);
  if (!document) throw new AppError('Travel document not found', 404);
  return document;
};

// Delete a travel document
const deleteTravelDocument = async (documentId, userId) => {
  const document = await tripDocumentRepository.deleteByIdAndUserId(documentId, userId);
  if (!document) throw new AppError('Travel document not found', 404);
};

// Add files to a travel document
const addTravelDocumentFiles = async (documentId, userId, files, itemId) => {
  const document = await getTravelDocumentById(documentId, userId);
  const nextFiles = (files || []).map(normalizeDocumentFile);

  // Validate files
  if (nextFiles.length === 0) throw new AppError('Upload at least one supported file.', 400);

  const unsupportedFile = nextFiles.find((file) => !allowedDocumentMimeTypes.includes(file.mimeType));
  if (unsupportedFile) throw new AppError('Upload PNG, JPG, JPEG, PDF, Word, PowerPoint, or Excel files only.', 400);

  // Add to item or document root
  if (itemId) {
    const item = document.items.id(itemId);
    if (!item) throw new AppError('Travel document item not found', 404);
    item.files.push(...nextFiles);
  } else {
    document.files.push(...nextFiles);
  }
  
  return tripDocumentRepository.save(document);
};

// Delete a file from a travel document
const deleteTravelDocumentFile = async (documentId, fileId, userId) => {
  const document = await getTravelDocumentById(documentId, userId);
  let file = document.files.id(fileId);
  let parentItem = null;
  
  // Check root files first, then item files
  if (!file) {
    parentItem = document.items.find((item) => item.files.id(fileId));
    file = parentItem?.files.id(fileId);
  }
  
  if (!file) throw new AppError('Travel document file not found', 404);

  // Remove file
  file.deleteOne();
  return tripDocumentRepository.save(document);
};

// Add an item to a travel document
const addTravelDocumentItem = async (documentId, userId, data) => {
  const document = await getTravelDocumentById(documentId, userId);
  const [item] = normalizeDocumentItems([data]);
  if (!item) throw new AppError('Document file name is required.', 400);
  
  document.items.push(item);
  return tripDocumentRepository.save(document);
};

// Delete an item from a travel document
const deleteTravelDocumentItem = async (documentId, itemId, userId) => {
  const document = await getTravelDocumentById(documentId, userId);
  const item = document.items.id(itemId);
  if (!item) throw new AppError('Travel document item not found', 404);

  item.deleteOne();
  return tripDocumentRepository.save(document);
};

// Duplicate a travel document
const duplicateTravelDocument = async (documentId, userId, data = {}) => {
  const source = await getTravelDocumentById(documentId, userId);
  const title = data.name?.trim() || `${source.name} copy`;
  const tripFields = await buildTripFields(data.tripId, userId);

  // Check uniqueness
  await assertUniqueDocumentName(userId, title);
  await assertUniqueDocumentTrip(userId, tripFields.tripId);

  // Create duplicate with all files and items
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

// Create a document template
const createDocumentTemplate = async (userId, data) => {
  const name = data.name?.trim();
  if (!name) throw new AppError('Template name is required.', 400);

  // Check uniqueness
  const templates = await documentTemplateRepository.findByUserId(userId);
  const existingTemplate = templates.find((template) => normalizeName(template.name) === normalizeName(name));
  if (existingTemplate) throw new AppError('A document template with this name already exists.', 409);

  // Get source document if provided
  const sourceDocument = data.documentId ? await getTravelDocumentById(data.documentId, userId) : null;
  const documentType = allowedDocumentTypes.includes(data.documentType)
    ? data.documentType
    : sourceDocument?.type || 'Custom';

  // Create template
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

// Update a document template
const updateDocumentTemplate = async (templateId, userId, data) => {
  const existingTemplate = await documentTemplateRepository.findByIdAndUserId(templateId, userId);
  if (!existingTemplate) throw new AppError('Document template not found', 404);

  // Validate name
  const name = data.name?.trim();
  if (!name) throw new AppError('Template name is required.', 400);

  // Check uniqueness
  const templates = await documentTemplateRepository.findByUserId(userId);
  const duplicateTemplate = templates.find(
    (template) =>
      normalizeName(template.name) === normalizeName(name) &&
      template._id.toString() !== templateId.toString()
  );
  if (duplicateTemplate) throw new AppError('A document template with this name already exists.', 409);

  // Update template
  return documentTemplateRepository.updateByIdAndUserId(templateId, userId, {
    name,
    documentType: allowedDocumentTypes.includes(data.documentType) ? data.documentType : 'Custom',
    description: data.description?.trim() || '',
    items: normalizeDocumentItems(data.items || []),
  });
};

// Delete a document template
const deleteDocumentTemplate = async (templateId, userId) => {
  const template = await documentTemplateRepository.deleteByIdAndUserId(templateId, userId);
  if (!template) throw new AppError('Document template not found', 404);
  return template;
};

// Export all service functions
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