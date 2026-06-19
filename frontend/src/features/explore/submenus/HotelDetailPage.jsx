/**
 * Explore module.
 * Hotel detail route uses the shared destination detail UI.
 */
import { Building2 } from 'lucide-react';
import { getHotelDetails } from '../../../api/exploreApi';
import SharedDestinationDetailPage from './SharedDestinationDetailPage';

/**
 * Configuration object for hotel detail page
 * Defines all hotel-specific settings for the shared detail page component
 */
const hotelDetailConfig = {
  // State management keys for storing hotel data
  stateKey: 'hotel',
  responseKey: 'hotel',
  favoriteKeysState: 'favoriteHotelKeys',
  
  // Favorite configuration
  favoriteType: 'hotel',
  favoriteSource: 'explore-hotels',
  
  // Label and navigation settings
  singularLabel: 'Hotel',
  singularLower: 'hotel',
  backLabel: 'hotels',
  returnSearch: 'view=hotels',
  
  // Icon and API function
  icon: Building2,
  getDetails: getHotelDetails,
};

/**
 * HotelDetailPage - Renders hotel details using shared destination detail component
 * Passes hotel-specific configuration to the shared page component
 */
function HotelDetailPage() {
  return <SharedDestinationDetailPage config={hotelDetailConfig} />;
}

export default HotelDetailPage;