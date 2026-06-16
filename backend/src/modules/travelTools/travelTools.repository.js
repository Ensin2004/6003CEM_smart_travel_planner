/**
 * Travel Tools module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const {
  DocumentTemplate,
  PackingList,
  PackingTemplate,
  TripDocument,
} = require('./travelTools.model');

// Make Owned Repository transforms source data into the shape required nearby.
const makeOwnedRepository = (Model, sort = { updatedAt: -1, createdAt: -1 }) => ({
  // Create a new document
  create: (data) => Model.create(data),
  
  // Delete a document by ID and user ID
  deleteByIdAndUserId: (id, userId) => Model.findOneAndDelete({ _id: id, userId }),
  
  // Find a document by ID and user ID
  findByIdAndUserId: (id, userId) => Model.findOne({ _id: id, userId }),
  
  // Find all documents for a user with sorting
  findByUserId: (userId) => Model.find({ userId }).sort(sort),
  
  // Update a document by ID and user ID
  updateByIdAndUserId: (id, userId, data) =>
    Model.findOneAndUpdate({ _id: id, userId }, data, {
      returnDocument: 'after',
      runValidators: true,
    }),
});

// Packing list repository with additional methods
const packingListRepository = {
  ...makeOwnedRepository(PackingList), // Inherit base CRUD operations
  
  // Find packing lists by trip and user
  findByTripIdAndUserId: (tripId, userId) => PackingList.find({ tripId, userId }),
  
  // Save an existing packing list instance
  save: (packingList) => packingList.save(),
};

// Packing template repository (base CRUD only)
const packingTemplateRepository = makeOwnedRepository(PackingTemplate);

// Trip document repository with additional methods
const tripDocumentRepository = {
  ...makeOwnedRepository(TripDocument), // Inherit base CRUD operations
  
  // Save an existing trip document instance
  save: (document) => document.save(),
};

// Document template repository with custom sort order
const documentTemplateRepository = makeOwnedRepository(DocumentTemplate, { updatedAt: -1, createdAt: -1 });

// Export all repositories
module.exports = {
  documentTemplateRepository,
  packingListRepository,
  packingTemplateRepository,
  tripDocumentRepository,
};