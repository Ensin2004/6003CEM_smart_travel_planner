/**
 * Explore module.
 * Hotel detail route uses the shared destination detail UI.
 */
import { Building2 } from 'lucide-react';
import { getHotelDetails } from '../../../api/exploreApi';
import SharedDestinationDetailPage from './SharedDestinationDetailPage';

const hotelDetailConfig = {
  stateKey: 'hotel',
  responseKey: 'hotel',
  favoriteKeysState: 'favoriteHotelKeys',
  favoriteType: 'hotel',
  favoriteSource: 'explore-hotels',
  singularLabel: 'Hotel',
  singularLower: 'hotel',
  backLabel: 'hotels',
  returnSearch: 'view=hotels',
  icon: Building2,
  getDetails: getHotelDetails,
};

function HotelDetailPage() {
  return <SharedDestinationDetailPage config={hotelDetailConfig} />;
}

export default HotelDetailPage;
