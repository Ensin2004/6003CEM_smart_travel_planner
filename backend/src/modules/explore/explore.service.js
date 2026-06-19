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

// Maximum number of review pages to fetch
const MAX_REVIEW_PAGES = 5;

/**
 * Retrieves reviews for a Google Maps place.
 * Fetches multiple pages of reviews based on the allPages flag.
 * Deduplicates reviews by ID or composite key.
 * 
 * @param {Object} params - Review request parameters
 * @param {string} params.dataId - Google Maps data ID
 * @param {string} params.placeId - Google Maps place ID
 * @param {boolean} params.allPages - Whether to fetch all available pages
 * @returns {Promise<Object>} Review results with items and pagination info
 */
const getPlaceReviews = async ({ dataId, placeId, allPages = true }) => {
  // Validate that at least one identifier is provided
  if (!dataId && !placeId) {
    return {
      available: false,
      message: 'Google review identifier is unavailable for this search result.',
      items: [],
    };
  }

  // Check if SerpApi key is configured
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

    // Fetch up to MAX_REVIEW_PAGES of reviews
    for (let pageIndex = 0; pageIndex < MAX_REVIEW_PAGES; pageIndex += 1) {
      const page = await searchGoogleMapsReviews({ dataId, placeId, nextPageToken });
      reviewPages.push(page);
      nextPageToken = page.nextPageToken || '';

      // Stop if all pages are not requested or no more pages exist
      if (!allPages || !nextPageToken) {
        break;
      }
    }

    // Deduplicate reviews across pages
    const seenReviewIds = new Set();
    const items = reviewPages
      .flatMap((page) => page.items || [])
      .filter((review) => {
        // Use review ID if available, otherwise create composite key from author, date, and text
        const key = review.id || `${review.author}:${review.date}:${review.text}`;
        if (seenReviewIds.has(key)) return false; // Skip duplicate
        seenReviewIds.add(key);
        return true;
      });

    return {
      available: reviewPages.some((page) => page.available), // Available if any page returned results
      items,
      message: reviewPages.find((page) => page.message)?.message || '',
      nextPageToken, // Token for fetching next page if needed
      pagesFetched: reviewPages.length,
      lastUpdated: reviewPages[reviewPages.length - 1]?.lastUpdated || new Date().toISOString(),
    };
  } catch (error) {
    // Handle and log API failures
    const { errorCode, message, statusCode } = getGoogleMapsFailureMessage(error);
    recordGoogleMapsFailure('place-reviews', message, statusCode, { dataId, placeId }, errorCode);

    return {
      available: false,
      errorCode,
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