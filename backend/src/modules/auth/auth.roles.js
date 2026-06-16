/**
 * Auth module.
 * Exports and local helpers keep related behavior in a single module.
 */

// Role definitions for the application's access control system.
// These roles are used throughout the authorization middleware and services.
const roles = {
  USER: 'user',   // Standard user role for authenticated travelers
  ADMIN: 'admin', // Administrator role with elevated privileges
};

module.exports = roles;