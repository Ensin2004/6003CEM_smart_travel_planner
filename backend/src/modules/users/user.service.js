const AppError = require('../../utils/AppError');
const userRepository = require('./user.repository');

const getProfile = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  return user;
};

const updateProfile = async (userId, data) => {
  const allowed = {
    name: data.name,
    preferences: data.preferences,
  };

  const user = await userRepository.updateById(userId, allowed);
  if (!user) throw new AppError('User not found', 404);
  return user;
};

const getAllUsers = () => userRepository.findAll();

const disableUser = async (userId) => {
  const user = await userRepository.updateById(userId, { status: 'disabled' });
  if (!user) throw new AppError('User not found', 404);
  return user;
};

module.exports = {
  getProfile,
  updateProfile,
  getAllUsers,
  disableUser,
};
