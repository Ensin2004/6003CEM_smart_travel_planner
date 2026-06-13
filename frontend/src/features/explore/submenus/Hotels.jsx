/**
 * Explore module.
 * Exports and local helpers keep related behavior in a single module.
 */
import PlaceSearchWorkspace from './PlaceSearchWorkspace';
import './Hotels.css';
// HotelsSubmenu renders the main screen and handles nearby interactions.
function HotelsSubmenu(props) {
  return <PlaceSearchWorkspace {...props} />;
}
// Default export registers the primary  value.
export default HotelsSubmenu;
