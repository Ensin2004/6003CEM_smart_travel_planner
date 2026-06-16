/**
 * Travel Tools Documents module.
 * Assertions cover expected behavior, error handling, and response shape.
 */

// Import JWT for generating authentication tokens in tests
const jwt = require('jsonwebtoken');
// Import HTTP testing utilities and the application instance
const request = require('supertest');
const env = require('../src/config/env');

// Mock the user repository to control user authentication data during route tests
jest.mock('../src/modules/users/user.repository', () => ({
  findById: jest.fn(),
}));

// Mock the travel tools service to isolate controller tests from service logic
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

// Import mocked modules after jest.mock calls for reference in tests
const userRepository = require('../src/modules/users/user.repository');
const travelToolsService = require('../src/modules/travelTools/travelTools.service');
const app = require('../src/app');

// Define a valid user ID for authenticated test requests
const userId = '507f1f77bcf86cd799439011';
// Generate a valid JWT token for authenticated test requests using the secret from environment
const token = jwt.sign({ userId }, env.jwtSecret);

// Test group covers route protection, request validation, and CRUD operations for travel documents.
describe('Travel document routes', () => {
  // Setup prepares shared data before assertions - reset mocks and configure default authenticated user.
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock user repository to return an active authenticated user by default
    userRepository.findById.mockResolvedValue({
      id: userId,
      email: 'traveler@example.com',
      role: 'user',
      status: 'active',
    });
  });

  // Scenario verifies that unauthenticated requests are rejected with proper error response.
  test('rejects travel document list request without JWT', async () => {
    // Send GET request without authentication header
    const response = await request(app).get('/api/v1/travel-tools/documents');

    // Verify unauthorized status code is returned
    expect(response.statusCode).toBe(401);
    // Verify appropriate error message is returned to client
    expect(response.body.message).toBe('Authentication token is required');
  });

  // Scenario verifies successful document creation for authenticated user.
  test('creates a travel document for the authenticated user', async () => {
    // Mock service to return a newly created document with generated ID
    travelToolsService.createTravelDocument.mockResolvedValue({
      _id: '507f1f77bcf86cd799439012',
      userId,
      name: 'Passport scan',
      type: 'Passport',
      files: [],
    });
    // Send POST request with valid authentication and document data
    const response = await request(app)
      .post('/api/v1/travel-tools/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Passport scan', type: 'Passport' });

    // Verify successful creation status code
    expect(response.statusCode).toBe(201);
    // Verify response contains the created document with correct name
    expect(response.body.data.document.name).toBe('Passport scan');
    // Verify service was called with correct user ID and document data
    expect(travelToolsService.createTravelDocument).toHaveBeenCalledWith(userId, {
      name: 'Passport scan',
      type: 'Passport',
    });
  });

  // Scenario verifies that unsupported file upload payloads are rejected.
  test('rejects unsupported travel document upload payload', async () => {
    // Send POST request with potentially malicious executable file payload
    const response = await request(app)
      .post('/api/v1/travel-tools/documents/507f1f77bcf86cd799439012/files')
      .set('Authorization', `Bearer ${token}`)
      .send({
        files: [
          {
            name: 'script.exe',  // Executable file extension - not allowed
            mimeType: 'application/octet-stream',  // Binary file type
            size: 1200,
            dataUrl: 'data:application/octet-stream;base64,AAAA',  // Base64 encoded binary
          },
        ],
      });

    // Verify bad request status code for validation failure
    expect(response.statusCode).toBe(400);
    // Verify service was not called due to validation rejection
    expect(travelToolsService.addTravelDocumentFiles).not.toHaveBeenCalled();
  });

  // Scenario verifies successful document duplication for authenticated user.
  test('duplicates a travel document for the authenticated user', async () => {
    // Mock service to return duplicated document with new ID and name
    travelToolsService.duplicateTravelDocument.mockResolvedValue({
      _id: '507f1f77bcf86cd799439013',
      userId,
      name: 'Passport scan copy',
      type: 'Passport',
      files: [],
    });
    // Send POST request to duplicate endpoint with custom name
    const response = await request(app)
      .post('/api/v1/travel-tools/documents/507f1f77bcf86cd799439012/duplicate')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Passport scan copy' });

    // Verify successful creation status code
    expect(response.statusCode).toBe(201);
    // Verify response contains duplicated document with correct name
    expect(response.body.data.document.name).toBe('Passport scan copy');
    // Verify service was called with correct source ID, user ID, and options
    expect(travelToolsService.duplicateTravelDocument).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      userId,
      { name: 'Passport scan copy' }
    );
  });

  // Scenario verifies successful template creation for authenticated user.
  test('saves a travel document template for the authenticated user', async () => {
    // Mock service to return newly created template with generated ID
    travelToolsService.createDocumentTemplate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439014',
      userId,
      name: 'Passport document set',
      documentType: 'Passport',
    });
    // Send POST request to create template from existing document
    const response = await request(app)
      .post('/api/v1/travel-tools/document-templates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Passport document set',
        documentType: 'Passport',
        documentId: '507f1f77bcf86cd799439012',
      });

    // Verify successful creation status code
    expect(response.statusCode).toBe(201);
    // Verify response contains created template with correct name
    expect(response.body.data.template.name).toBe('Passport document set');
    // Verify service was called with correct user ID and template data
    expect(travelToolsService.createDocumentTemplate).toHaveBeenCalledWith(userId, {
      name: 'Passport document set',
      documentType: 'Passport',
      documentId: '507f1f77bcf86cd799439012',
    });
  });

  // Scenario verifies successful deletion of an item within a travel document.
  test('deletes a travel document item for the authenticated user', async () => {
    // Mock service to return updated document with items array cleared
    travelToolsService.deleteTravelDocumentItem.mockResolvedValue({
      _id: '507f1f77bcf86cd799439012',
      userId,
      name: 'Europe Vacation',
      items: [],  // Items array empty after deletion
    });
    // Send DELETE request to remove specific item from document
    const response = await request(app)
      .delete('/api/v1/travel-tools/documents/507f1f77bcf86cd799439012/items/507f1f77bcf86cd799439015')
      .set('Authorization', `Bearer ${token}`);

    // Verify successful operation status code
    expect(response.statusCode).toBe(200);
    // Verify response shows empty items array after deletion
    expect(response.body.data.document.items).toEqual([]);
    // Verify service was called with correct document ID, item ID, and user ID
    expect(travelToolsService.deleteTravelDocumentItem).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439015',
      userId
    );
  });

  // Scenario verifies successful template update for authenticated user.
  test('updates a saved travel document template for the authenticated user', async () => {
    // Mock service to return updated template with modified content
    travelToolsService.updateDocumentTemplate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439014',
      userId,
      name: 'Updated Europe Vacation',
      documentType: 'Custom',
      items: [{ name: 'Passport', documentType: 'Passport', uploadLabel: 'Upload scan' }],
    });
    // Send PATCH request to update existing template
    const response = await request(app)
      .patch('/api/v1/travel-tools/document-templates/507f1f77bcf86cd799439014')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Europe Vacation',
        documentType: 'Custom',
        items: [{ name: 'Passport', documentType: 'Passport', uploadLabel: 'Upload scan' }],
      });

    // Verify successful update status code
    expect(response.statusCode).toBe(200);
    // Verify response contains updated template with new name
    expect(response.body.data.template.name).toBe('Updated Europe Vacation');
    // Verify service was called with correct template ID, user ID, and update data
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

  // Scenario verifies successful template deletion for authenticated user.
  test('deletes a saved travel document template for the authenticated user', async () => {
    // Mock service to return deleted template metadata
    travelToolsService.deleteDocumentTemplate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439014',
      userId,
      name: 'Europe Vacation',
    });
    // Send DELETE request to remove existing template
    const response = await request(app)
      .delete('/api/v1/travel-tools/document-templates/507f1f77bcf86cd799439014')
      .set('Authorization', `Bearer ${token}`);

    // Verify successful deletion status code (no content)
    expect(response.statusCode).toBe(204);
    // Verify service was called with correct template ID and user ID
    expect(travelToolsService.deleteDocumentTemplate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439014',
      userId
    );
  });
});