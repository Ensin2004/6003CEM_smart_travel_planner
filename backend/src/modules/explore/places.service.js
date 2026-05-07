const getAttractionsByDestination = async (destination) => ({
  available: false,
  destination,
  message: 'Places API integration is planned as an optional enhancement',
  items: [],
});

module.exports = { getAttractionsByDestination };
