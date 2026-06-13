/**
 * Explore module.
 * Restaurant detail route uses the shared destination detail UI.
 */
import { Utensils } from 'lucide-react';
import { getRestaurantDetails } from '../../../api/exploreApi';
import SharedDestinationDetailPage from './SharedDestinationDetailPage';

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

function RestaurantDetailPage() {
  return <SharedDestinationDetailPage config={restaurantDetailConfig} />;
}

export default RestaurantDetailPage;
