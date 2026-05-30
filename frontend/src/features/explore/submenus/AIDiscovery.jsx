import './AIDiscovery.css';

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

export default DiscoverySubmenu;
