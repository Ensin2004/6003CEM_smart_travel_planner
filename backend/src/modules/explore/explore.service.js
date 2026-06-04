/**
 * Explore module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const weatherService = require('./weather.service');
const placesService = require('./places.service');
const hotelsService = require('./hotels.service');
const restaurantService = require('./restaurant.service');
const exploreAiService = require('./exploreAi.service');
const env = require('../../config/env');
const {
  fetchGooglePlaceImage,
  getGoogleMapsFailureMessage,
  recordGoogleMapsFailure,
  searchGoogleMapsReviews,
} = require('./googleMaps.service');

const MAX_REVIEW_PAGES = 5;
const getPlaceReviews = async ({ dataId, placeId, allPages = true }) => {
  if (!dataId && !placeId) {
    return {
      available: false,
      message: 'Google review identifier is unavailable for this search result.',
      items: [],
    };
  }

  if (!env.serpApiKey || env.nodeEnv === 'test') {
    return {
      available: false,
      message: 'SerpApi key is not configured',
      items: [],
    };
  }

  try {
    const reviewPages = [];
    let nextPageToken = '';

    for (let pageIndex = 0; pageIndex < MAX_REVIEW_PAGES; pageIndex += 1) {
      const page = await searchGoogleMapsReviews({ dataId, placeId, nextPageToken });
      reviewPages.push(page);
      nextPageToken = page.nextPageToken || '';

      if (!allPages || !nextPageToken) {
        break;
      }
    }

    const seenReviewIds = new Set();
    const items = reviewPages
      .flatMap((page) => page.items || [])
      .filter((review) => {
        const key = review.id || `${review.author}:${review.date}:${review.text}`;
        if (seenReviewIds.has(key)) return false;
        seenReviewIds.add(key);
        return true;
      });

    return {
      available: reviewPages.some((page) => page.available),
      items,
      message: reviewPages.find((page) => page.message)?.message || '',
      nextPageToken,
      pagesFetched: reviewPages.length,
      lastUpdated: reviewPages[reviewPages.length - 1]?.lastUpdated || new Date().toISOString(),
    };
  } catch (error) {
    const { message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('place-reviews', message, statusCode, { dataId, placeId });

    return {
      available: false,
      message,
      items: [],
    };
  }
};
module.exports = {
  fetchGooglePlaceImage,
  getWeatherByDestination: weatherService.getWeatherByDestination,
  getAttractionDetail: placesService.getAttractionDetail,
  getAttractionsByDestination: placesService.getAttractionsByDestination,
  getHotelDetail: hotelsService.getHotelDetail,
  getHotelsByDestination: hotelsService.getHotelsByDestination,
  getRestaurantDetail: restaurantService.getRestaurantDetail,
  getRestaurantsByDestination: restaurantService.getRestaurantsByDestination,
  getAiRecommendations: exploreAiService.getAiRecommendations,
  getPlaceReviews,
};
