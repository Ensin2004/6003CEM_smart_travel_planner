/**
 * Auth module.
 * Database queries stay isolated behind focused persistence helpers.
 */

// Re-export user repository for authentication-related database operations.
// Auth service uses this repository for user lookups, creation, and updates.
// This abstraction keeps database access centralized and consistent across modules.
const userRepository = require('../users/user.repository');

module.exports = userRepository;