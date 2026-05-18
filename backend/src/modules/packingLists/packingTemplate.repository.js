const PackingTemplate = require('./packingTemplate.model');

const create = (data) => PackingTemplate.create(data);

const findByUserId = (userId) =>
  PackingTemplate.find({ userId }).sort({ updatedAt: -1, createdAt: -1 });

const findByIdAndUserId = (id, userId) => PackingTemplate.findOne({ _id: id, userId });

const updateByIdAndUserId = (id, userId, data) =>
  PackingTemplate.findOneAndUpdate({ _id: id, userId }, data, {
    returnDocument: 'after',
    runValidators: true,
  });

const deleteByIdAndUserId = (id, userId) => PackingTemplate.findOneAndDelete({ _id: id, userId });

module.exports = {
  create,
  deleteByIdAndUserId,
  findByIdAndUserId,
  findByUserId,
  updateByIdAndUserId,
};
