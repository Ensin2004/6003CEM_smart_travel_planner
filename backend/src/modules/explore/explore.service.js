const weatherService = require('./weather.service');
const placesService = require('./places.service');
const hotelsService = require('./hotels.service');

module.exports = {
  getWeatherByDestination: weatherService.getWeatherByDestination,
  getAttractionsByDestination: placesService.getAttractionsByDestination,
  getHotelsByDestination: hotelsService.getHotelsByDestination,
};
