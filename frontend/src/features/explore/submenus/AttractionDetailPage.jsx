/**
 * Explore module.
 * Attraction detail route uses the shared destination detail UI.
 */
import { MapPinned } from 'lucide-react';
import { getAttractionDetails } from '../../../api/exploreApi';
import SharedDestinationDetailPage from './SharedDestinationDetailPage';

const attractionDetailConfig = {
  stateKey: 'attraction',
  responseKey: 'attraction',
  favoriteKeysState: 'favoriteAttractionKeys',
  favoriteType: 'attraction',
  favoriteSource: 'explore-attractions',
  singularLabel: 'Attraction',
  singularLower: 'attraction',
  backLabel: 'attractions',
  returnSearch: 'view=attractions',
  icon: MapPinned,
  getDetails: getAttractionDetails,
};

function AttractionDetailPage() {
  return <SharedDestinationDetailPage config={attractionDetailConfig} />;
}

export default AttractionDetailPage;
