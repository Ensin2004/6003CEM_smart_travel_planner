const { body, param } = require('express-validator');
const { priorityLevels } = require('./travelTools.constants');

const objectIdRule = param('id').isMongoId().withMessage('Invalid packing list id');
const itemIdRule = param('itemId').isMongoId().withMessage('Invalid packing item id');
const templateIdRule = param('templateId').isMongoId().withMessage('Invalid packing template id');
const documentTemplateIdRule = param('templateId').isMongoId().withMessage('Invalid document template id');
const documentIdRule = param('documentId').isMongoId().withMessage('Invalid travel document id');
const fileIdRule = param('fileId').isMongoId().withMessage('Invalid travel document file id');
const documentItemIdRule = param('itemId').isMongoId().withMessage('Invalid travel document item id');
const documentTypes = ['Passport', 'Visa', 'Insurance', 'Ticket', 'Booking', 'Custom'];
const documentItemTypes = ['Passport', 'Visa', 'Insurance', 'Ticket', 'Booking', 'Transport', 'Health', 'Contact', 'Custom'];
const documentMimeTypes = [
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

const itemRules = (path = '') => [
  body(`${path}name`).trim().isLength({ min: 1, max: 120 }).withMessage('Item name is required'),
  body(`${path}category`).optional().trim().isLength({ min: 1, max: 80 }).withMessage('Category must be 80 characters or fewer'),
  body(`${path}priority`).optional().isIn(priorityLevels).withMessage('Invalid priority'),
  body(`${path}quantity`).optional().isInt({ min: 1, max: 999 }).withMessage('Quantity must be at least 1'),
  body(`${path}isPacked`).optional().isBoolean().withMessage('Packed status must be true or false'),
];

const createPackingListRules = [
  body('title').trim().isLength({ min: 1, max: 120 }).withMessage('Packing list title is required'),
  body('tripId').optional().isMongoId().withMessage('Invalid trip id'),
  body('destination').optional().trim().isLength({ max: 120 }),
  body('tripStartDate').optional().isISO8601().withMessage('Trip start date must be valid'),
  body('tripEndDate').optional().isISO8601().withMessage('Trip end date must be valid'),
  body('templateKey').optional().trim().isLength({ min: 1, max: 60 }),
  body('items').optional().isArray(),
  body('items.*.name').optional().trim().isLength({ min: 1, max: 120 }),
  body('items.*.category').optional().trim().isLength({ min: 1, max: 80 }),
  body('items.*.priority').optional().isIn(priorityLevels),
  body('items.*.quantity').optional().isInt({ min: 1, max: 999 }),
  body('items.*.isPacked').optional().isBoolean(),
  body('reminder.enabled').optional().isBoolean(),
  body('reminder.daysBeforeTrip').optional().isInt({ min: 0, max: 30 }),
];

const updatePackingListRules = [
  objectIdRule,
  body('title').optional().trim().isLength({ min: 1, max: 120 }),
  body('tripId').optional({ nullable: true }).isMongoId().withMessage('Invalid trip id'),
  body('destination').optional().trim().isLength({ min: 1, max: 120 }),
  body('tripStartDate').optional().isISO8601().withMessage('Trip start date must be valid'),
  body('tripEndDate').optional().isISO8601().withMessage('Trip end date must be valid'),
  body('templateKey').optional().trim().isLength({ min: 1, max: 60 }),
  body('items').optional().isArray(),
  body('items.*.name').optional().trim().isLength({ min: 1, max: 120 }),
  body('items.*.category').optional().trim().isLength({ min: 1, max: 80 }),
  body('items.*.priority').optional().isIn(priorityLevels),
  body('items.*.quantity').optional().isInt({ min: 1, max: 999 }),
  body('items.*.isPacked').optional().isBoolean(),
  body('reminder.enabled').optional().isBoolean(),
  body('reminder.daysBeforeTrip').optional().isInt({ min: 0, max: 30 }),
];

const addItemRules = [
  objectIdRule,
  ...itemRules(),
];

const updateItemRules = [
  objectIdRule,
  itemIdRule,
  body('name').optional().trim().isLength({ min: 1, max: 120 }),
  body('category').optional().trim().isLength({ min: 1, max: 80 }).withMessage('Category must be 80 characters or fewer'),
  body('priority').optional().isIn(priorityLevels).withMessage('Invalid priority'),
  body('quantity').optional().isInt({ min: 1, max: 999 }).withMessage('Quantity must be at least 1'),
  body('isPacked').optional().isBoolean().withMessage('Packed status must be true or false'),
];

const duplicatePackingListRules = [
  objectIdRule,
  body('title').optional().trim().isLength({ min: 1, max: 120 }),
  body('tripId').optional().isMongoId().withMessage('Invalid trip id'),
  body('destination').optional().trim().isLength({ max: 120 }),
  body('tripStartDate').optional().isISO8601(),
  body('tripEndDate').optional().isISO8601(),
];

const duplicateTravelDocumentRules = [
  documentIdRule,
  body('name').optional().trim().isLength({ min: 1, max: 160 }).withMessage('Document name is required'),
  body('tripId').optional().isMongoId().withMessage('Invalid trip id'),
];

const createTemplateRules = [
  body('title').trim().isLength({ min: 1, max: 120 }).withMessage('Template title is required'),
  body('destination').optional().trim().isLength({ max: 120 }),
  body('description').optional().trim().isLength({ max: 180 }),
  body('tripId').optional().isMongoId().withMessage('Invalid trip id'),
  body('items').optional().isArray(),
  body('items.*.name').optional().trim().isLength({ min: 1, max: 120 }),
  body('items.*.category').optional().trim().isLength({ min: 1, max: 80 }),
  body('items.*.priority').optional().isIn(priorityLevels),
  body('items.*.quantity').optional().isInt({ min: 1, max: 999 }),
];

const updateTemplateRules = [
  templateIdRule,
  ...createTemplateRules,
];

const createTravelDocumentRules = [
  body('name').trim().isLength({ min: 1, max: 160 }).withMessage('Document name is required'),
  body('type').optional().isIn(documentTypes).withMessage('Invalid document type'),
  body('tripId').optional().isMongoId().withMessage('Invalid trip id'),
  body('templateKey').optional().trim().isLength({ min: 1, max: 80 }),
  body('items').optional().isArray(),
  body('items.*.name').optional().trim().isLength({ min: 1, max: 140 }),
  body('items.*.documentType').optional().isIn(documentItemTypes).withMessage('Invalid document item type'),
  body('items.*.uploadLabel').optional().trim().isLength({ max: 180 }),
];

const updateTravelDocumentRules = [
  documentIdRule,
  body('name').optional().trim().isLength({ min: 1, max: 160 }).withMessage('Document name is required'),
  body('type').optional().isIn(documentTypes).withMessage('Invalid document type'),
  body('tripId').optional({ nullable: true }).isMongoId().withMessage('Invalid trip id'),
];

const uploadTravelDocumentFilesRules = [
  documentIdRule,
  body('itemId').optional().isMongoId().withMessage('Invalid travel document item id'),
  body('files').isArray({ min: 1, max: 10 }).withMessage('Upload between 1 and 10 files'),
  body('files.*.name').trim().isLength({ min: 1, max: 180 }).withMessage('File name is required'),
  body('files.*.mimeType').isIn(documentMimeTypes).withMessage('Unsupported file type'),
  body('files.*.size').isInt({ min: 1, max: 10 * 1024 * 1024 }).withMessage('File must be 10 MB or smaller'),
  body('files.*.previewType').optional().isIn(['image', 'pdf', 'office']).withMessage('Invalid preview type'),
  body('files.*.dataUrl')
    .matches(/^data:(image\/png|image\/jpeg|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.ms-powerpoint|application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet);base64,/)
    .withMessage('File content must be a supported base64 data URL'),
];

const deleteTravelDocumentFileRules = [
  documentIdRule,
  fileIdRule,
];

const createDocumentTemplateRules = [
  body('name').trim().isLength({ min: 1, max: 120 }).withMessage('Template name is required'),
  body('documentType').optional().isIn(documentTypes).withMessage('Invalid document type'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('documentId').optional().isMongoId().withMessage('Invalid travel document id'),
  body('items').optional().isArray(),
  body('items.*.name').optional().trim().isLength({ min: 1, max: 140 }),
  body('items.*.documentType').optional().isIn(documentItemTypes).withMessage('Invalid document item type'),
  body('items.*.uploadLabel').optional().trim().isLength({ max: 180 }),
];

const updateDocumentTemplateRules = [
  documentTemplateIdRule,
  ...createDocumentTemplateRules,
];

const addTravelDocumentItemRules = [
  documentIdRule,
  body('name').trim().isLength({ min: 1, max: 140 }).withMessage('Document file name is required'),
  body('documentType').optional().isIn(documentItemTypes).withMessage('Invalid document item type'),
  body('uploadLabel').optional().trim().isLength({ max: 180 }),
];

const deleteTravelDocumentItemRules = [
  documentIdRule,
  documentItemIdRule,
];

module.exports = {
  addItemRules,
  addTravelDocumentItemRules,
  createDocumentTemplateRules,
  createTravelDocumentRules,
  createTemplateRules,
  deleteTravelDocumentItemRules,
  deleteTravelDocumentFileRules,
  documentIdRule,
  documentTemplateIdRule,
  duplicatePackingListRules,
  duplicateTravelDocumentRules,
  objectIdRule,
  templateIdRule,
  updateItemRules,
  updateDocumentTemplateRules,
  updatePackingListRules,
  updateTravelDocumentRules,
  updateTemplateRules,
  uploadTravelDocumentFilesRules,
  createPackingListRules,
};
