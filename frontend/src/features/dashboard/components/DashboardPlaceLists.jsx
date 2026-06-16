/**
 * Dashboard place lists component.
 * Search, category filters, and row actions stay grouped with the list UI.
 */
import { ChevronDown, MoreVertical, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPlaceImageStyle, getTypeLabel } from '../dashboard.utils';

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
  handleVisitedPlaceAction,
  openCategoryMenu,
  placeRows,
  searchTerm,
  setActivePlaceMenu,
  setOpenCategoryMenu,
  setSearchTerm,
  setVisitedCategory,
  visitedCategories,
  visitedCategory,
}) {
  const totalVisits = placeRows.reduce((total, place) => total + Number(place.totalVisits || 0), 0);
  const categoryCount = new Set(placeRows.map((place) => place.type).filter(Boolean)).size;
  const mostVisitedPlace = placeRows.reduce(
    (mostVisited, place) => (
      !mostVisited || Number(place.totalVisits || 0) > Number(mostVisited.totalVisits || 0)
        ? place
        : mostVisited
    ),
    null,
  );

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
        <div className="visited-place-stats" aria-label="Visited place statistics">
          <div>
            <small>Places shown</small>
            <strong>{placeRows.length}</strong>
          </div>
          <div>
            <small>Total visits</small>
            <strong>{totalVisits}</strong>
          </div>
          <div>
            <small>Categories explored</small>
            <strong>{categoryCount}</strong>
          </div>
          <div>
            <small>Most visited</small>
            <strong>{mostVisitedPlace?.title || 'No visits yet'}</strong>
            {mostVisitedPlace ? <span>{mostVisitedPlace.totalVisits} visit{mostVisitedPlace.totalVisits === 1 ? '' : 's'}</span> : null}
          </div>
        </div>
        {placeRows.length ? (
          <div className="place-list compact">
            {placeRows.map((place) => {
              const menuId = `visited-${place._id || place.placeKey}`;
              return (
                <article key={place._id || place.placeKey}>
                  <div className="place-thumb" style={getPlaceImageStyle(place)} aria-hidden="true" />
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

    </section>
  );
}

export default DashboardPlaceLists;
