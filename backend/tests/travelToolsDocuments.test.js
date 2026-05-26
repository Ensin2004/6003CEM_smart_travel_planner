const jwt = require('jsonwebtoken');
const request = require('supertest');
const env = require('../src/config/env');

jest.mock('../src/modules/users/user.repository', () => ({
  findById: jest.fn(),
}));

jest.mock('../src/modules/travelTools/travelTools.service', () => ({
  addTravelDocumentFiles: jest.fn(),
  deleteTravelDocumentItem: jest.fn(),
  deleteDocumentTemplate: jest.fn(),
  createDocumentTemplate: jest.fn(),
  createTravelDocument: jest.fn(),
  duplicateTravelDocument: jest.fn(),
  getTravelDocuments: jest.fn(),
  updateDocumentTemplate: jest.fn(),
}));

const userRepository = require('../src/modules/users/user.repository');
const travelToolsService = require('../src/modules/travelTools/travelTools.service');
const app = require('../src/app');

const userId = '507f1f77bcf86cd799439011';
const token = jwt.sign({ userId }, env.jwtSecret);

describe('Travel document routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userRepository.findById.mockResolvedValue({
      id: userId,
      email: 'traveler@example.com',
      role: 'user',
      status: 'active',
    });
  });

  test('rejects travel document list request without JWT', async () => {
    const response = await request(app).get('/api/v1/travel-tools/documents');

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe('Authentication token is required');
  });

  test('creates a travel document for the authenticated user', async () => {
    travelToolsService.createTravelDocument.mockResolvedValue({
      _id: '507f1f77bcf86cd799439012',
      userId,
      name: 'Passport scan',
      type: 'Passport',
      files: [],
    });

    const response = await request(app)
      .post('/api/v1/travel-tools/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Passport scan', type: 'Passport' });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.document.name).toBe('Passport scan');
    expect(travelToolsService.createTravelDocument).toHaveBeenCalledWith(userId, {
      name: 'Passport scan',
      type: 'Passport',
    });
  });

  test('rejects unsupported travel document upload payload', async () => {
    const response = await request(app)
      .post('/api/v1/travel-tools/documents/507f1f77bcf86cd799439012/files')
      .set('Authorization', `Bearer ${token}`)
      .send({
        files: [
          {
            name: 'script.exe',
            mimeType: 'application/octet-stream',
            size: 1200,
            dataUrl: 'data:application/octet-stream;base64,AAAA',
          },
        ],
      });

    expect(response.statusCode).toBe(400);
    expect(travelToolsService.addTravelDocumentFiles).not.toHaveBeenCalled();
  });

  test('duplicates a travel document for the authenticated user', async () => {
    travelToolsService.duplicateTravelDocument.mockResolvedValue({
      _id: '507f1f77bcf86cd799439013',
      userId,
      name: 'Passport scan copy',
      type: 'Passport',
      files: [],
    });

    const response = await request(app)
      .post('/api/v1/travel-tools/documents/507f1f77bcf86cd799439012/duplicate')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Passport scan copy' });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.document.name).toBe('Passport scan copy');
    expect(travelToolsService.duplicateTravelDocument).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      userId,
      { name: 'Passport scan copy' }
    );
  });

  test('saves a travel document template for the authenticated user', async () => {
    travelToolsService.createDocumentTemplate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439014',
      userId,
      name: 'Passport document set',
      documentType: 'Passport',
    });

    const response = await request(app)
      .post('/api/v1/travel-tools/document-templates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Passport document set',
        documentType: 'Passport',
        documentId: '507f1f77bcf86cd799439012',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.template.name).toBe('Passport document set');
    expect(travelToolsService.createDocumentTemplate).toHaveBeenCalledWith(userId, {
      name: 'Passport document set',
      documentType: 'Passport',
      documentId: '507f1f77bcf86cd799439012',
    });
  });

  test('deletes a travel document item for the authenticated user', async () => {
    travelToolsService.deleteTravelDocumentItem.mockResolvedValue({
      _id: '507f1f77bcf86cd799439012',
      userId,
      name: 'Europe Vacation',
      items: [],
    });

    const response = await request(app)
      .delete('/api/v1/travel-tools/documents/507f1f77bcf86cd799439012/items/507f1f77bcf86cd799439015')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.document.items).toEqual([]);
    expect(travelToolsService.deleteTravelDocumentItem).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439015',
      userId
    );
  });

  test('updates a saved travel document template for the authenticated user', async () => {
    travelToolsService.updateDocumentTemplate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439014',
      userId,
      name: 'Updated Europe Vacation',
      documentType: 'Custom',
      items: [{ name: 'Passport', documentType: 'Passport', uploadLabel: 'Upload scan' }],
    });

    const response = await request(app)
      .patch('/api/v1/travel-tools/document-templates/507f1f77bcf86cd799439014')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Europe Vacation',
        documentType: 'Custom',
        items: [{ name: 'Passport', documentType: 'Passport', uploadLabel: 'Upload scan' }],
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.data.template.name).toBe('Updated Europe Vacation');
    expect(travelToolsService.updateDocumentTemplate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439014',
      userId,
      {
        name: 'Updated Europe Vacation',
        documentType: 'Custom',
        items: [{ name: 'Passport', documentType: 'Passport', uploadLabel: 'Upload scan' }],
      }
    );
  });

  test('deletes a saved travel document template for the authenticated user', async () => {
    travelToolsService.deleteDocumentTemplate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439014',
      userId,
      name: 'Europe Vacation',
    });

    const response = await request(app)
      .delete('/api/v1/travel-tools/document-templates/507f1f77bcf86cd799439014')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(204);
    expect(travelToolsService.deleteDocumentTemplate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439014',
      userId
    );
  });
});
