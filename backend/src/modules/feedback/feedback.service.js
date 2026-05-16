const AppError = require('../../utils/AppError');
const feedbackRepository = require('./feedback.repository');
const userRepository = require('../users/user.repository');

const submitFeedback = async (userId, data) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  return feedbackRepository.create({
    user: user.id,
    userName: user.name,
    userEmail: user.email,
    rating: data.rating,
    feedback: data.feedback,
  });
};

const getFeedback = (role) => {
  if (role !== 'admin') {
    throw new AppError('Administrator access is required', 403);
  }

  return feedbackRepository.findAll();
};

module.exports = { submitFeedback, getFeedback };
