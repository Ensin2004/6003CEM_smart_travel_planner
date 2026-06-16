const toCategoryValue = (name = '') =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

module.exports = { toCategoryValue };
