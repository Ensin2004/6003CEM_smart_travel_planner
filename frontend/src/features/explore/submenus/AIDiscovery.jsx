/**
 * Explore module.
 * Exports and local helpers keep related behavior in a single module.
 */
import './AIDiscovery.css';
// DiscoverySubmenu renders the main screen and handles nearby interactions.
function DiscoverySubmenu({ activeOption }) {
  const ActiveIcon = activeOption.icon;
  return (
    <div className="explore-empty explore-placeholder">
      <ActiveIcon size={34} aria-hidden="true" />
      <h3>{activeOption.label} is ready for integration</h3>
      <p>Use the Attractions tab to test the SerpApi Google Maps connection first.</p>
    </div>
  );
}
// Default export registers the primary  value.
export default DiscoverySubmenu;
