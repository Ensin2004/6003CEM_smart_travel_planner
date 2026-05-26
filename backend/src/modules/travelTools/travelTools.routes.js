const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const travelToolsController = require('./travelTools.controller');
const {
  addItemRules,
  addTravelDocumentItemRules,
  createDocumentTemplateRules,
  createPackingListRules,
  createTemplateRules,
  createTravelDocumentRules,
  deleteTravelDocumentItemRules,
  deleteTravelDocumentFileRules,
  documentIdRule,
  duplicatePackingListRules,
  duplicateTravelDocumentRules,
  objectIdRule,
  templateIdRule,
  updateItemRules,
  updatePackingListRules,
  updateTravelDocumentRules,
  updateTemplateRules,
  uploadTravelDocumentFilesRules,
} = require('./travelTools.validation');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Packing Lists
 *   description: User packing checklist management
 *
 * /packing-lists/templates:
 *   get:
 *     summary: Get ready-made packing list templates
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Packing list templates returned
 *
 * /packing-lists:
 *   get:
 *     summary: Get the authenticated user's packing lists
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Packing lists returned
 *       401:
 *         description: Missing or invalid token
 *   post:
 *     summary: Create a packing list manually or from a template
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Japan spring trip
 *               tripId:
 *                 type: string
 *               destination:
 *                 type: string
 *                 example: Tokyo
 *               templateKey:
 *                 type: string
 *                 example: overseas-trip
 *               reminder:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   daysBeforeTrip:
 *                     type: integer
 *                     example: 2
 *     responses:
 *       201:
 *         description: Packing list created
 *       400:
 *         description: Validation error
 *
 * /packing-lists/{id}:
 *   get:
 *     summary: Get one packing list owned by the authenticated user
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Packing list returned
 *       404:
 *         description: Packing list not found
 *   patch:
 *     summary: Update packing list metadata or reminder settings
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Packing list updated
 *   delete:
 *     summary: Delete a packing list
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Packing list deleted
 *
 * /packing-lists/{id}/duplicate:
 *   post:
 *     summary: Duplicate a previous packing list for another trip
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Packing list duplicated
 *
 * /packing-lists/{id}/items:
 *   post:
 *     summary: Add an item to a packing list
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Passport
 *               category:
 *                 type: string
 *                 example: documents
 *               priority:
 *                 type: string
 *                 example: High
 *               quantity:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Packing item added
 *
 * /packing-lists/{id}/items/{itemId}:
 *   patch:
 *     summary: Edit an item or tick it packed or unpacked
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Packing item updated
 *   delete:
 *     summary: Remove an item from a packing list
 *     tags: [Packing Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Packing item deleted
 */
/**
 * @swagger
 * tags:
 *   name: Travel Documents
 *   description: User travel document records and uploaded files
 *
 * /travel-tools/documents:
 *   get:
 *     summary: Get the authenticated user's travel documents
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Travel documents returned
 *       401:
 *         description: Missing or invalid token
 *   post:
 *     summary: Create a travel document workspace
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Passport scan
 *               type:
 *                 type: string
 *                 example: Passport
 *               tripId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Travel document created
 *       400:
 *         description: Validation error
 *
 * /travel-tools/documents/{documentId}/files:
 *   post:
 *     summary: Upload image or document files to a travel document
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, mimeType, size, dataUrl]
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: passport.pdf
 *                     mimeType:
 *                       type: string
 *                       example: application/pdf
 *                     size:
 *                       type: integer
 *                       example: 240000
 *                     dataUrl:
 *                       type: string
 *                       example: data:application/pdf;base64,JVBERi0x
 *                     previewType:
 *                       type: string
 *                       example: pdf
 *     responses:
 *       201:
 *         description: Files uploaded
 *       404:
 *         description: Travel document not found
 *
 * /travel-tools/documents/{documentId}/files/{fileId}:
 *   delete:
 *     summary: Remove one uploaded travel document file
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted
 *
 * /travel-tools/documents/{documentId}/duplicate:
 *   post:
 *     summary: Duplicate a travel document and its uploaded files
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Passport scan copy
 *     responses:
 *       201:
 *         description: Travel document duplicated
 *       404:
 *         description: Travel document not found
 *
 * /travel-tools/document-templates:
 *   get:
 *     summary: Get saved travel document templates
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Travel document templates returned
 *   post:
 *     summary: Save a travel document as a reusable template
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Passport document set
 *               documentType:
 *                 type: string
 *                 example: Passport
 *               documentId:
 *                 type: string
 *               description:
 *                 type: string
 *                 example: Reusable passport template for future trips
 *     responses:
 *       201:
 *         description: Travel document template created
 *       400:
 *         description: Validation error
 *
 * /travel-tools/documents/{documentId}:
 *   patch:
 *     summary: Update travel document metadata
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Travel document updated
 *   delete:
 *     summary: Delete a travel document and its files
 *     tags: [Travel Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Travel document deleted
 */
router
  .route('/documents')
  .get(travelToolsController.getTravelDocuments)
  .post(createTravelDocumentRules, validate, travelToolsController.createTravelDocument);
router.post('/documents/:documentId/files', uploadTravelDocumentFilesRules, validate, travelToolsController.addTravelDocumentFiles);
router.post('/documents/:documentId/items', addTravelDocumentItemRules, validate, travelToolsController.addTravelDocumentItem);
router.delete('/documents/:documentId/items/:itemId', deleteTravelDocumentItemRules, validate, travelToolsController.deleteTravelDocumentItem);
router.delete('/documents/:documentId/files/:fileId', deleteTravelDocumentFileRules, validate, travelToolsController.deleteTravelDocumentFile);
router.post('/documents/:documentId/duplicate', duplicateTravelDocumentRules, validate, travelToolsController.duplicateTravelDocument);
router
  .route('/documents/:documentId')
  .patch(updateTravelDocumentRules, validate, travelToolsController.updateTravelDocument)
  .delete(documentIdRule, validate, travelToolsController.deleteTravelDocument);
router
  .route('/document-templates')
  .get(travelToolsController.getDocumentTemplates)
  .post(createDocumentTemplateRules, validate, travelToolsController.createDocumentTemplate);

router.get('/templates', travelToolsController.getTemplates);
router.post('/templates', createTemplateRules, validate, travelToolsController.createTemplate);
router
  .route('/templates/:templateId')
  .patch(updateTemplateRules, validate, travelToolsController.updateTemplate)
  .delete(templateIdRule, validate, travelToolsController.deleteTemplate);

router
  .route('/')
  .get(travelToolsController.getMyPackingLists)
  .post(createPackingListRules, validate, travelToolsController.createPackingList);

router.post('/:id/duplicate', duplicatePackingListRules, validate, travelToolsController.duplicatePackingList);
router.post('/:id/items', addItemRules, validate, travelToolsController.addItem);

router
  .route('/:id/items/:itemId')
  .patch(updateItemRules, validate, travelToolsController.updateItem)
  .delete(updateItemRules.slice(0, 2), validate, travelToolsController.deleteItem);

router
  .route('/:id')
  .get(objectIdRule, validate, travelToolsController.getPackingList)
  .patch(updatePackingListRules, validate, travelToolsController.updatePackingList)
  .delete(objectIdRule, validate, travelToolsController.deletePackingList);

module.exports = router;
