/**
 * Category utilities module.
 * Provides helper functions for category value normalization.
 */

/**
 * Converts a category name to a normalized value for consistent storage and matching.
 * Performs the following transformations:
 * 1. Trims whitespace from both ends
 * 2. Converts to lowercase
 * 3. Replaces all non-alphanumeric characters with spaces
 * 4. Trims resulting whitespace
 * 5. Replaces multiple spaces with a single space
 * 
 * Example: "  Luxury   Hotels  " -> "luxury hotels"
 * 
 * @param {string} name - Raw category name to normalize
 * @returns {string} Normalized category value
 */
const toCategoryValue = (name = '') =>
  name
    .trim() // Remove leading/trailing whitespace
    .toLowerCase() // Convert to lowercase for case-insensitive matching
    .replace(/[^a-z0-9]+/g, ' ') // Replace non-alphanumeric characters with spaces
    .trim() // Remove leading/trailing spaces after replacement
    .replace(/\s+/g, ' '); // Collapse multiple spaces into single space

module.exports = { toCategoryValue };