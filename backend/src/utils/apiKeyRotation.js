// Maximum milliseconds per day
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Default key rotation period in days
const DEFAULT_ROTATION_DAYS = 183;

/**
 * Parses a rotation date value into a Date object
 * 
 * @param {string} value - The date string to parse
 * @returns {Date|null} Parsed Date object or null if invalid
 */
const parseRotationDate = (value) => {
  // Return null for falsy values
  if (!value) return null;
  
  // Attempt to create a Date object
  const date = new Date(value);
  
  // Check if the date is valid
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Determines the rotation status of a key
 * 
 * @param {Object} params - The parameters object
 * @param {string} params.key - The key to check
 * @param {string} params.keyName - The name of the key
 * @param {Date} params.now - Current date for comparison
 * @param {string} params.rotatedAt - The rotation date string
 * @param {number} params.rotationDays - Number of days before key expires
 * @returns {Object} Status object containing active state and details
 */
const getKeyRotationStatus = ({
  key,
  keyName,
  now = new Date(),
  rotatedAt,
  rotationDays = DEFAULT_ROTATION_DAYS,
}) => {
  // Check if key exists
  if (!key) {
    return {
      active: false,
      reason: 'missing-key',
    };
  }

  // Parse the rotation date
  const rotationDate = parseRotationDate(rotatedAt);
  
  // Check if rotation date is valid
  if (!rotationDate) {
    return {
      active: false,
      reason: 'missing-rotation-date',
      message: `${keyName} is configured but missing a valid rotation date.`,
    };
  }

  // Calculate the age of the key in days
  const ageDays = Math.floor((now.getTime() - rotationDate.getTime()) / MS_PER_DAY);
  
  // Check if rotation date is in the future
  if (ageDays < 0) {
    return {
      active: false,
      reason: 'future-rotation-date',
      message: `${keyName} rotation date cannot be in the future.`,
    };
  }

  // Check if key has exceeded the maximum allowed age
  if (ageDays > rotationDays) {
    return {
      active: false,
      ageDays,
      reason: 'expired',
      message: `${keyName} is ${ageDays} days old and must be rotated every ${rotationDays} days.`,
    };
  }

  // Key is valid and active
  return {
    active: true,
    ageDays,
    reason: 'active',
  };
};

/**
 * Resolves an API key based on rotation policy
 * 
 * @param {Object} params - The parameters object
 * @param {string} params.key - The key to resolve
 * @param {string} params.keyName - The name of the key
 * @param {string} params.nodeEnv - Node environment (test bypasses validation)
 * @param {Date} params.now - Current date for comparison
 * @param {string} params.rotatedAt - The rotation date string
 * @param {number} params.rotationDays - Number of days before key expires
 * @param {Array} params.warnings - Array to collect warning messages
 * @returns {string} The resolved key or empty string if invalid
 */
const resolveRotatedApiKey = ({
  key,
  keyName,
  nodeEnv,
  now,
  rotatedAt,
  rotationDays,
  warnings = [],
}) => {
  // Return key as-is if missing or in test environment
  if (!key || nodeEnv === 'test') return key || '';

  // Get the rotation status
  const status = getKeyRotationStatus({
    key,
    keyName,
    now,
    rotatedAt,
    rotationDays,
  });

  // Handle inactive key
  if (!status.active) {
    warnings.push(status.message || `${keyName} is unavailable because its rotation policy failed.`);
    return '';
  }

  // Return the valid key
  return key;
};

module.exports = {
  DEFAULT_ROTATION_DAYS,
  getKeyRotationStatus,
  resolveRotatedApiKey,
};