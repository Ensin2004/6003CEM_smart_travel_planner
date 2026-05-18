const weatherService = require('./weather.service');
const placesService = require('./places.service');

module.exports = {
  getWeatherByDestination: weatherService.getWeatherByDestination,
  getAttractionsByDestination: placesService.getAttractionsByDestination,
};
