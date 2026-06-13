/**
 * Dashboard place lists component.
 * Search, category filters, and row actions stay grouped with the list UI.
 */
import { ChevronDown, MoreVertical, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDateRange, getPlaceImageStyle, getTypeLabel } from '../dashboard.utils';

function DashboardFilterMenu({ activeCategory, categories, isOpen, labelResolver, onSelect, onToggle }) {
  return (
    <div className="dashboard-filter-menu">
      <button type="button" onClick={onToggle} aria-expanded={isOpen}>
        {labelResolver(activeCategory)}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {isOpen ? (
        <div role="menu">
          {categories.map((category) => (
            <button type="button" role="menuitem" key={category} onClick={() => onSelect(category)}>
              {labelResolver(category)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DashboardPlaceLists({
  activePlaceMenu,
  handleDestinationAction,
  handleVisitedPlaceAction,
  openCategoryMenu,
  placeRows,
  searchTerm,
  setActivePlaceMenu,
  setOpenCategoryMenu,
  setSearchTerm,
  setToVisitCategory,
  setVisitedCategory,
  toVisitCategories,
  toVisitCategory,
  tripPlaceRows,
  visitedCategories,
  visitedCategory,
}) {
  return (
    <section className="dashboard-list-grid">
      <article className="dashboard-card dashboard-list-card">
        <div className="list-card-toolbar">
          <h3>Visited Places ({placeRows.length})</h3>
          <label>
            <Search size={15} aria-hidden="true" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search visited places..." />
          </label>
          <DashboardFilterMenu
            activeCategory={visitedCategory}
            categories={visitedCategories}
            isOpen={openCategoryMenu === 'visited'}
            labelResolver={(category) => (category === 'all' ? 'All Categories' : getTypeLabel(category))}
            onSelect={(category) => {
              setVisitedCategory(category);
              setOpenCategoryMenu('');
            }}
            onToggle={() => setOpenCategoryMenu((currentMenu) => (currentMenu === 'visited' ? '' : 'visited'))}
          />
        </div>
        {placeRows.length ? (
          <div className="place-list compact">
            {placeRows.slice(0, 4).map((place) => {
              const menuId = `visited-${place._id || place.placeKey}`;
              return (
                <article key={place._id || place.placeKey}>
                  <div className="place-thumb" style={getPlaceImageStyle(place.title)} aria-hidden="true" />
                  <div>
                    <h4>{place.title}</h4>
                    <p>{place.address || 'Address unavailable'}</p>
                    <small>Visited on {place.latestVisitLabel} - {place.totalVisits} total visit{place.totalVisits === 1 ? '' : 's'}</small>
                  </div>
                  <span>{getTypeLabel(place.type)}</span>
                  <div className="place-row-actions">
                    <button
                      type="button"
                      aria-label={`More options for ${place.title}`}
                      aria-expanded={activePlaceMenu === menuId}
                      onClick={() => setActivePlaceMenu((currentMenu) => (currentMenu === menuId ? '' : menuId))}
                    >
                      <MoreVertical size={16} aria-hidden="true" />
                    </button>
                    {activePlaceMenu === menuId ? (
                      <div role="menu">
                        <button type="button" role="menuitem" onClick={() => handleVisitedPlaceAction(place)}>Show only this</button>
                        <Link role="menuitem" to="/map">Open map</Link>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="dashboard-muted">No visited places match this search.</p>
        )}
      </article>

      <article className="dashboard-card dashboard-list-card">
        <div className="list-card-toolbar">
          <h3>Places To Visit ({tripPlaceRows.length})</h3>
          <label>
            <Search size={15} aria-hidden="true" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search places to visit..." />
          </label>
          <DashboardFilterMenu
            activeCategory={toVisitCategory}
            categories={toVisitCategories}
            isOpen={openCategoryMenu === 'to-visit'}
            labelResolver={(category) => (category === 'all' ? 'All Categories' : category)}
            onSelect={(category) => {
              setToVisitCategory(category);
              setOpenCategoryMenu('');
            }}
            onToggle={() => setOpenCategoryMenu((currentMenu) => (currentMenu === 'to-visit' ? '' : 'to-visit'))}
          />
        </div>
        {tripPlaceRows.length ? (
          <div className="place-list">
            {tripPlaceRows.slice(0, 4).map((destination) => {
              const menuId = `visit-${destination.tripId}-${destination.title}`;
              return (
                <article key={`${destination.tripId}-${destination.title}-${destination.address}`}>
                  <div className="place-thumb" style={getPlaceImageStyle(destination.title)} aria-hidden="true" />
                  <div>
                    <h4>{destination.title}</h4>
                    <p>{destination.address || 'Destination address unavailable'}</p>
                    <small>Added for {formatDateRange(destination.startDate, destination.endDate)}</small>
                  </div>
                  <span>Attraction</span>
                  <div className="place-row-actions">
                    <button
                      type="button"
                      aria-label={`More options for ${destination.title}`}
                      aria-expanded={activePlaceMenu === menuId}
                      onClick={() => setActivePlaceMenu((currentMenu) => (currentMenu === menuId ? '' : menuId))}
                    >
                      <MoreVertical size={16} aria-hidden="true" />
                    </button>
                    {activePlaceMenu === menuId ? (
                      <div role="menu">
                        <button type="button" role="menuitem" onClick={() => handleDestinationAction(destination)}>Show only this</button>
                        <Link role="menuitem" to={`/trips/${destination.tripId}`}>Open trip</Link>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="dashboard-muted">No places to visit match this search.</p>
        )}
      </article>
    </section>
  );
}

export default DashboardPlaceLists;
