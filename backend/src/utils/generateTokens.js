/**
 * Generate Tokens module.
 * Exports and local helpers keep related behavior in a single module.
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Creates a short-lived access token containing user identification and role information
const generateAccessToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

// Creates a long-lived refresh token for obtaining new access tokens after expiration
const generateRefreshToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, env.refreshJwtSecret, {
    expiresIn: env.refreshJwtExpiresIn,
  });

// Exports both token generation functions for use in authentication flows.
module.exports = { generateAccessToken, generateRefreshToken };