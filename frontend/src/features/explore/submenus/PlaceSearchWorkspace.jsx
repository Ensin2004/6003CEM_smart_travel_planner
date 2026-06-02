/**
 * Explore module.
 * Exports and local helpers keep related behavior in a single module.
 */
import {
  Building2,
  CalendarDays,
  CloudSun,
  Droplets,
  LoaderCircle,
  MapPinned,
  Search,
  Sparkles,
  Star,
  Utensils,
  Wind,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getVisitedPlaces } from '../../../api/visitedPlaceApi';
import PlaceCard from '../../../components/place/PlaceCard';
import { buildVisitedLookup, getVisitedPlacePayload } from '../../../components/visitedPlaces/visitedPlaceUtils';
import { foodCategoryOptions, roomTypeOptions } from '../explore.constants';
import { formatTemperature, formatWeatherDate, getDateKey, getMaxWeatherDate } from '../explore.helpers';
// PlaceSearchWorkspace renders the main screen and handles nearby interactions.
function PlaceSearchWorkspace({
  activeAi,
  activeFilters,
  activeItems,
  activeOption,
  activeWeather,
  countryOptions,
  destination,
  destinationLabel,
  error,
  getConvertedPriceText,
  getOriginalPriceText,
  handleCountryChange,
  handleGenerateAiRecommendations,
  handleLoadMoreFilteredItems,
  handleSearch,
  handleTravelDateChange,
  hasMoreFilteredItems,
  hasResults,
  isItemFavorite,
  detailReturnState,
  isAiLoading,
  isFilteredSearchView,
  isFoodView,
  isHotelsView,
  isLoadingMore,
  isSearching,
  isWeatherLoading,
  onHotelFavoriteChange,
  onRestaurantFavoriteChange,
  pricedCount,
  ratedCount,
  resultCount,
  searchConfig,
  selectedFoodCategoryLabel,
  selectedRoomLabel,
  stateOptions,
  status,
  topRatedCount,
  travelDate,
  updateDestinationQuery,
  updateFilterField,
  weatherLocationLabel,
}) {
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const visitedLookup = useMemo(() => buildVisitedLookup(visitedPlaces), [visitedPlaces]);
  const cardType = isHotelsView ? 'hotels' : isFoodView ? 'food' : 'attractions';
  const visitedType = isHotelsView ? 'hotel' : isFoodView ? 'restaurant' : 'attraction';
  const visitedSource = `explore-${cardType}`;

  useEffect(() => {
    let isActive = true;

    getVisitedPlaces()
      .then((response) => {
        if (!isActive) return;
        setVisitedPlaces(response.data?.data?.visitedPlaces || []);
      })
      .catch(() => {
        if (isActive) setVisitedPlaces([]);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleVisitedChange = (visitedPlace) => {
    if (!visitedPlace?.placeKey) return;
    setVisitedPlaces((currentPlaces) => {
      const withoutCurrent = currentPlaces.filter((place) => place.placeKey !== visitedPlace.placeKey);
      return [visitedPlace, ...withoutCurrent];
    });
  };

  return (
    <div className="explore-workspace">
      <form className={isFilteredSearchView ? 'explore-search explore-search-hotels' : 'explore-search'} onSubmit={handleSearch}>
        <div className="explore-search-copy">
          <span>{searchConfig.finderLabel}</span>
          <strong>{searchConfig.searchTitle}</strong>
        </div>
        <label>
          <span className="sr-only">Destination</span>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={destination}
            onChange={(event) => updateDestinationQuery(event.target.value)}
            placeholder={isHotelsView ? 'Hotel, country or location' : isFoodView ? 'Restaurant, country or location' : 'Tokyo, Paris, Kuala Lumpur'}
          />
        </label>
        <label>
          <span className="sr-only">Travel date</span>
          <CalendarDays size={18} aria-hidden="true" />
          <input
            type="date"
            value={travelDate}
            min={getDateKey()}
            max={getMaxWeatherDate()}
            onChange={(event) => handleTravelDateChange(event.target.value)}
          />
        </label>
        {isFilteredSearchView && (
          <div className="explore-filter-row" aria-label={isHotelsView ? 'Hotel filters' : 'Restaurant filters'}>
            <label className="explore-filter-field">
              <span className="sr-only">Country</span>
              <select
                value={activeFilters.countryCode}
                onChange={(event) => handleCountryChange(event.target.value, isFoodView ? 'restaurant' : 'hotel')}
              >
                <option value="">Country</option>
                {countryOptions.map((country) => (
                  <option key={country.isoCode} value={country.isoCode}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="explore-filter-field">
              <span className="sr-only">Location or state</span>
              <select
                value={activeFilters.state}
                onChange={(event) => updateFilterField('state', event.target.value)}
                disabled={!activeFilters.countryCode}
              >
                <option value="">State</option>
                {stateOptions.map((state) => (
                  <option key={state.isoCode} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="explore-filter-field">
              <span className="sr-only">{isFoodView ? 'Food category' : 'Room type'}</span>
              <select
                value={isFoodView ? activeFilters.foodCategory : activeFilters.roomType}
                onChange={(event) => updateFilterField(isFoodView ? 'foodCategory' : 'roomType', event.target.value)}
              >
                {(isFoodView ? foodCategoryOptions : roomTypeOptions).map((option) => (
                  <option key={option.value || (isFoodView ? 'any-food' : 'any-room')} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <button className="primary-action" type="submit" disabled={isSearching}>
          {isSearching ? <LoaderCircle className="explore-spin" size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="form-error explore-status">{error}</p>}
      {status && <p className="form-success explore-status">{status}</p>}

      <section className="explore-briefing" aria-label={`${activeOption.label} travel briefing`}>
        <div className="explore-stats-row" aria-label={`${activeOption.label} result summary`}>
          <article>
            <Search size={17} aria-hidden="true" />
            <div>
              <strong>{resultCount || '--'}</strong>
              <span>{isHotelsView ? 'Hotels loaded' : isFoodView ? 'Restaurants loaded' : 'Places loaded'}</span>
            </div>
          </article>
          <article>
            <Star size={17} aria-hidden="true" />
            <div>
              <strong>{ratedCount || '--'}</strong>
              <span>Rated results</span>
            </div>
          </article>
          <article>
            {isHotelsView ? (
              <Building2 size={17} aria-hidden="true" />
            ) : isFoodView ? (
              <Utensils size={17} aria-hidden="true" />
            ) : (
              <Sparkles size={17} aria-hidden="true" />
            )}
            <div>
              <strong>{isFilteredSearchView ? pricedCount || '--' : topRatedCount || '--'}</strong>
              <span>{isFilteredSearchView ? 'With prices' : 'Highly rated'}</span>
            </div>
          </article>
        </div>

        <div className="explore-guidance-grid">
          <article className="explore-briefing-card explore-weather-summary">
            <div className="explore-briefing-title">
              <CloudSun size={17} aria-hidden="true" />
              <div>
                <span>Destination weather</span>
                <strong>{isWeatherLoading ? 'Checking forecast' : activeWeather?.available ? weatherLocationLabel : 'Ready after search'}</strong>
              </div>
            </div>
            {isWeatherLoading ? (
              <p className="explore-briefing-text">
                <LoaderCircle className="explore-spin" size={15} aria-hidden="true" />
                Checking {formatWeatherDate(travelDate || getDateKey())}
              </p>
            ) : activeWeather?.available ? (
              <>
                <div className="explore-weather-line">
                  <strong>{formatTemperature(activeWeather.temperature?.mean)}</strong>
                  <span>{activeWeather.condition}</span>
                </div>
                <div className="explore-briefing-meta">
                  <span><Droplets size={14} aria-hidden="true" />{activeWeather.precipitation?.probability ?? '--'}% rain</span>
                  <span><Wind size={14} aria-hidden="true" />{activeWeather.windSpeed?.max ?? '--'} {activeWeather.windSpeed?.unit || 'km/h'}</span>
                </div>
                <p className="explore-briefing-text">{activeWeather.travelTip}</p>
              </>
            ) : (
              <p className="explore-briefing-text">{activeWeather?.message || 'Weather appears after a destination search.'}</p>
            )}
          </article>

          <article className="explore-briefing-card explore-briefing-ai">
            <div className="explore-briefing-title">
              <Sparkles size={17} aria-hidden="true" />
              <div>
                <span>AI guide</span>
                <strong>{activeAi?.available ? 'Recommended next moves' : 'Travel guidance'}</strong>
              </div>
              <button
                className="explore-ai-action"
                type="button"
                onClick={() => handleGenerateAiRecommendations({ manual: true })}
                disabled={!hasResults || isAiLoading}
              >
                {isAiLoading ? <LoaderCircle className="explore-spin" size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
                {isAiLoading ? 'Preparing' : activeAi?.available ? 'Refresh' : activeAi ? 'Retry' : 'Prepare'}
              </button>
            </div>
            {isAiLoading ? (
              <p className="explore-briefing-text">Reviewing ratings, prices, hours, and weather.</p>
            ) : activeAi?.available ? (
              <>
                <p className="explore-briefing-main">{activeAi.summary}</p>
                {activeAi.picks?.length > 0 && (
                  <details className="explore-ai-details">
                    <summary>{activeAi.picks.length} recommended pick{activeAi.picks.length === 1 ? '' : 's'}</summary>
                    <div className="explore-ai-picks">
                      {activeAi.picks.map((pick) => (
                        <article key={`${pick.itemName}-${pick.score}`}>
                          <div>
                            <strong>{pick.itemName}</strong>
                            <span>{pick.score}/100</span>
                          </div>
                          <p>{pick.reason}</p>
                          <small>{pick.bestFor}{pick.caution ? ` - ${pick.caution}` : ''}</small>
                        </article>
                      ))}
                    </div>
                  </details>
                )}
              </>
            ) : (
              <p className="explore-briefing-text">{activeAi?.message || 'Loads after results are ready.'}</p>
            )}
          </article>
        </div>
      </section>

      <section className="explore-results-shell">
        <div className="explore-results-heading">
          <div>
            <span>{searchConfig.resultLabel}</span>
            <h3>{hasResults ? `${isHotelsView ? 'Rooms' : isFoodView ? 'Food' : 'Places'} for ${destinationLabel}` : 'Ready when you are'}</h3>
          </div>
          <small>{hasResults ? `${resultCount} ${searchConfig.matchesLabel}` : searchConfig.readyText}</small>
        </div>

        <div className="explore-results">
          {activeItems.length === 0 ? (
            <div className="explore-empty">
              {isHotelsView ? (
                <Building2 size={34} aria-hidden="true" />
              ) : isFoodView ? (
                <Utensils size={34} aria-hidden="true" />
              ) : (
                <MapPinned size={34} aria-hidden="true" />
              )}
              <h3>{searchConfig.emptyTitle}</h3>
              <p>{searchConfig.emptyText}</p>
            </div>
          ) : (
            activeItems.map((item, index) => (
              <PlaceCard
                categoryLabel={
                  isHotelsView && activeFilters.roomType
                    ? selectedRoomLabel
                    : isFoodView && activeFilters.foodCategory
                      ? selectedFoodCategoryLabel
                      : item.category
                }
                convertedPriceText={getConvertedPriceText(item)}
                index={index}
                isInitiallyFavorite={isHotelsView || isFoodView ? isItemFavorite?.(item) : false}
                item={item}
                key={`${item.id}-${index}`}
                onFavoriteChange={isHotelsView ? onHotelFavoriteChange : isFoodView ? onRestaurantFavoriteChange : undefined}
                onVisitedChange={handleVisitedChange}
                originalPriceText={getOriginalPriceText(item)}
                returnState={detailReturnState}
                type={cardType}
                visitedDefaultDate={travelDate || getDateKey()}
                visitedRecord={
                  visitedLookup[
                    getVisitedPlacePayload({
                      item,
                      type: visitedType,
                      source: visitedSource,
                      defaultDate: travelDate || getDateKey(),
                    }).placeKey
                  ]
                }
                visitedSource={visitedSource}
              />
            ))
          )}
        </div>
        {isFilteredSearchView && hasMoreFilteredItems && (
          <button className="explore-view-more" type="button" onClick={handleLoadMoreFilteredItems} disabled={isLoadingMore}>
            {isLoadingMore ? <LoaderCircle className="explore-spin" size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
            {isLoadingMore ? 'Loading...' : 'View more'}
          </button>
        )}
      </section>
    </div>
  );
}
// Default export registers the primary  value.
export default PlaceSearchWorkspace;
