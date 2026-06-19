/**
 * Explore module.
 * Restaurant detail route uses the shared destination detail UI.
 */
import { Utensils } from 'lucide-react';
import { getRestaurantDetails } from '../../../api/exploreApi';
import SharedDestinationDetailPage from './SharedDestinationDetailPage';

/**
 * Configuration object for restaurant detail page.
 * Contains all necessary settings for rendering and managing restaurant details.
 * 
 * @property {string} stateKey - Key used for state management in the detail page
 * @property {string} responseKey - Key used to extract restaurant data from API response
 * @property {string} favoriteKeysState - State key for tracking favorited restaurant IDs
 * @property {string} favoriteType - Type identifier for favorite functionality
 * @property {string} favoriteSource - Source identifier for tracking where favorites originate
 * @property {string} singularLabel - Display label for a single restaurant
 * @property {string} singularLower - Lowercase singular label for text interpolation
 * @property {string} backLabel - Label for the back navigation button
 * @property {string} returnSearch - Query parameter for returning to the food search view
 * @property {Component} icon - Lucide icon component for restaurant representation
 * @property {Function} getDetails - API function for fetching restaurant details
 */
const restaurantDetailConfig = {
  stateKey: 'restaurant',
  responseKey: 'restaurant',
  favoriteKeysState: 'favoriteRestaurantKeys',
  favoriteType: 'restaurant',
  favoriteSource: 'explore-food',
  singularLabel: 'Restaurant',
  singularLower: 'restaurant',
  backLabel: 'restaurants',
  returnSearch: 'view=food',
  icon: Utensils,
  getDetails: getRestaurantDetails,
};

/**
 * RestaurantDetailPage component.
 * Renders the detail page for a specific restaurant using the shared detail page implementation.
 * 
 * @returns {JSX.Element} The rendered restaurant detail page
 */
function RestaurantDetailPage() {
  return <SharedDestinationDetailPage config={restaurantDetailConfig} />;
}

export default RestaurantDetailPage;