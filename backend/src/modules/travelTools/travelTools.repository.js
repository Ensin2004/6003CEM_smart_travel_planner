const {
  DocumentTemplate,
  PackingList,
  PackingTemplate,
  TripDocument,
} = require('./travelTools.model');

const makeOwnedRepository = (Model, sort = { updatedAt: -1, createdAt: -1 }) => ({
  create: (data) => Model.create(data),
  deleteByIdAndUserId: (id, userId) => Model.findOneAndDelete({ _id: id, userId }),
  findByIdAndUserId: (id, userId) => Model.findOne({ _id: id, userId }),
  findByUserId: (userId) => Model.find({ userId }).sort(sort),
  updateByIdAndUserId: (id, userId, data) =>
    Model.findOneAndUpdate({ _id: id, userId }, data, {
      returnDocument: 'after',
      runValidators: true,
    }),
});

const packingListRepository = {
  ...makeOwnedRepository(PackingList),
  save: (packingList) => packingList.save(),
};

const packingTemplateRepository = makeOwnedRepository(PackingTemplate);
const tripDocumentRepository = makeOwnedRepository(TripDocument);
const documentTemplateRepository = makeOwnedRepository(DocumentTemplate, { updatedAt: -1, createdAt: -1 });

module.exports = {
  documentTemplateRepository,
  packingListRepository,
  packingTemplateRepository,
  tripDocumentRepository,
};
