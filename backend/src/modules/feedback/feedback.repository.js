const Feedback = require('./feedback.model');

const create = (data) => Feedback.create(data);

const findAll = () => Feedback.find().sort({ createdAt: -1 });

module.exports = { create, findAll };
