/**
 * Categories module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const Category = require('./category.model');

const findAll = () => Category.find().sort({ type: 1, name: 1 });
const findById = (id) => Category.findById(id);
const findByTypeAndValue = (type, value, excludedId) =>
  Category.findOne({
    type,
    value,
    ...(excludedId ? { _id: { $ne: excludedId } } : {}),
  });
const create = (data) => Category.create(data);
const updateById = (id, data) =>
  Category.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
const deleteById = (id) => Category.findByIdAndDelete(id);

module.exports = {
  findAll,
  findById,
  findByTypeAndValue,
  create,
  updateById,
  deleteById,
};
