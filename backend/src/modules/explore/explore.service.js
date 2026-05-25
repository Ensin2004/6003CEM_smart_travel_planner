const weatherService = require('./weather.service');
const placesService = require('./places.service');
const hotelsService = require('./hotels.service');
const restaurantService = require('./restaurant.service');
const exploreAiService = require('./exploreAi.service');

module.exports = {
  getWeatherByDestination: weatherService.getWeatherByDestination,
  getAttractionsByDestination: placesService.getAttractionsByDestination,
  getHotelsByDestination: hotelsService.getHotelsByDestination,
  getRestaurantsByDestination: restaurantService.getRestaurantsByDestination,
  getAiRecommendations: exploreAiService.getAiRecommendations,
};
