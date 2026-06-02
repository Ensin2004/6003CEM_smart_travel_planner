/**
 * Explore module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const weatherService = require('./weather.service');
const placesService = require('./places.service');
const hotelsService = require('./hotels.service');
const restaurantService = require('./restaurant.service');
const exploreAiService = require('./exploreAi.service');
module.exports = {
  getWeatherByDestination: weatherService.getWeatherByDestination,
  getAttractionsByDestination: placesService.getAttractionsByDestination,
  getHotelDetail: hotelsService.getHotelDetail,
  getHotelsByDestination: hotelsService.getHotelsByDestination,
  getRestaurantDetail: restaurantService.getRestaurantDetail,
  getRestaurantsByDestination: restaurantService.getRestaurantsByDestination,
  getAiRecommendations: exploreAiService.getAiRecommendations,
};
