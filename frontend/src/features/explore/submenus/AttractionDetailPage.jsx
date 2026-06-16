/**
 * Explore module.
 * Attraction detail route uses the shared destination detail UI.
 */
import { MapPinned } from 'lucide-react';
import { getAttractionDetails } from '../../../api/exploreApi';
import SharedDestinationDetailPage from './SharedDestinationDetailPage';

/**
 * Configuration object for attraction detail page
 * Defines all attraction-specific settings for the shared detail page component
 */
const attractionDetailConfig = {
  // State management keys for storing attraction data
  stateKey: 'attraction',
  responseKey: 'attraction',
  favoriteKeysState: 'favoriteAttractionKeys',
  
  // Favorite configuration
  favoriteType: 'attraction',
  favoriteSource: 'explore-attractions',
  
  // Label and navigation settings
  singularLabel: 'Attraction',
  singularLower: 'attraction',
  backLabel: 'attractions',
  returnSearch: 'view=attractions',
  
  // Icon and API function
  icon: MapPinned,
  getDetails: getAttractionDetails,
};

/**
 * AttractionDetailPage - Renders attraction details using shared destination detail component
 * Passes attraction-specific configuration to the shared page component
 */
function AttractionDetailPage() {
  return <SharedDestinationDetailPage config={attractionDetailConfig} />;
}

export default AttractionDetailPage;
