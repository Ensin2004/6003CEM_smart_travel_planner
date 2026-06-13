/**
 * Auth module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const userRepository = require('../users/user.repository');
module.exports = userRepository;
