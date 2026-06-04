/**
 * Explore module.
 * Exports and local helpers keep related behavior in a single module.
 */
import {
  Building2,
  CalendarDays,
  CloudLightning,
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
import { attractionCategoryOptions, foodCategoryOptions, roomTypeOptions } from '../explore.constants';
import { formatPercent, formatSpeed, formatTemperature, formatWeatherDate, getDateKey, getMaxWeatherDate, getMinWeatherDate } from '../explore.helpers';
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
  getFavoriteRecord,
  getConvertedPriceText,
  getOriginalPriceText,
  handleCountryChange,
  handleLoadMoreFilteredItems,
  handleSearch,
  handleTravelDateChange,
  hasMoreFilteredItems,
  hasResults,
  isItemFavorite,
  detailReturnState,
  isAiLoading,
  isAttractionsView,
  isFilteredSearchView,
  isFoodView,
  isHotelsView,
  isLoadingMore,
  isSearching,
  isWeatherLoading,
  onHotelFavoriteChange,
  onAttractionFavoriteChange,
  onRestaurantFavoriteChange,
  pricedCount,
  ratedCount,
  resultCount,
  searchConfig,
  selectedAttractionCategory,
  selectedAttractionCategoryLabel,
  selectedFoodCategory,
  selectedFoodCategoryLabel,
  selectedCurrency,
  selectedRoomLabel,
  selectedRoomType,
  stateOptions,
  status,
  topRatedCount,
  travelDate,
  updateDestinationQuery,
  updateFilterField,
}) {
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const visitedLookup = useMemo(() => buildVisitedLookup(visitedPlaces), [visitedPlaces]);
  const cardType = isHotelsView ? 'hotels' : isFoodView ? 'food' : 'attractions';
  const visitedType = isHotelsView ? 'hotel' : isFoodView ? 'restaurant' : 'attraction';
  const visitedSource = `explore-${cardType}`;
  const usesPriceMetric = isHotelsView || isFoodView;
  const categoryOptions = isHotelsView ? roomTypeOptions : isFoodView ? foodCategoryOptions : attractionCategoryOptions;
  const categoryValue = isHotelsView
    ? activeFilters.roomType
    : isFoodView
      ? activeFilters.foodCategory
      : activeFilters.attractionCategory;
  const categoryField = isHotelsView ? 'roomType' : isFoodView ? 'foodCategory' : 'attractionCategory';
  const categoryLabel = isHotelsView ? 'Room type' : isFoodView ? 'Food category' : 'Attraction category';
  const searchClassName = isHotelsView
    ? 'explore-search explore-search-hotels'
    : isFoodView
      ? 'explore-search explore-search-restaurants'
      : 'explore-search explore-search-attractions';
  const weatherTemperature = activeWeather?.available ? formatTemperature(activeWeather.temperature?.mean) : '--';
  const weatherCondition = activeWeather?.available ? activeWeather.condition : 'Weather data unavailable';
  const weatherRain = activeWeather?.available
    ? Number.isFinite(Number(activeWeather.precipitation?.probability))
      ? `${formatPercent(activeWeather.precipitation.probability)} rain`
      : Number.isFinite(Number(activeWeather.precipitation?.amountMm))
        ? `${Number(activeWeather.precipitation.amountMm).toFixed(1)} mm rain`
        : '-- rain'
    : '-- rain';
  const weatherWind = activeWeather?.available ? formatSpeed(activeWeather.windSpeed?.max, activeWeather.windSpeed?.unit || 'km/h') : '--';
  const weatherTip = activeWeather?.available
    ? activeWeather.travelTip
    : 'Live weather could not be reached. Search results are still available while the forecast refreshes.';

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
      <form className={searchClassName} onSubmit={handleSearch}>
        <div className="explore-search-copy">
          <span>{searchConfig.finderLabel}</span>
          <strong>{searchConfig.searchTitle}</strong>
        </div>
        <div className="explore-search-field explore-search-destination">
          <span className="explore-field-label">Search</span>
          <label>
            <span className="sr-only">Destination</span>
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={destination}
              onChange={(event) => updateDestinationQuery(event.target.value)}
              placeholder={
                isHotelsView
                  ? 'Hotel, country or location'
                  : isFoodView
                    ? 'Restaurant, country or location'
                    : 'Attraction, country or location'
              }
            />
          </label>
        </div>
        <div className="explore-search-field explore-search-date">
          <span className="explore-field-label">Travel date</span>
          <label>
            <span className="sr-only">Travel date</span>
            <CalendarDays size={18} aria-hidden="true" />
            <input
              type="date"
              value={travelDate}
              min={getMinWeatherDate()}
              max={getMaxWeatherDate()}
              onChange={(event) => handleTravelDateChange(event.target.value)}
            />
          </label>
        </div>
        {isFilteredSearchView && (
          <div
            className="explore-filter-row explore-search-filters"
            aria-label={isHotelsView ? 'Hotel filters' : isFoodView ? 'Restaurant filters' : 'Attraction filters'}
          >
            <div className="explore-filter-control">
              <span className="explore-field-label">Country</span>
              <label className="explore-filter-field">
                <span className="sr-only">Country</span>
                <select
                  value={activeFilters.countryCode}
                  onChange={(event) =>
                    handleCountryChange(event.target.value, isHotelsView ? 'hotel' : isFoodView ? 'restaurant' : 'attraction')
                  }
                >
                  <option value="">Country</option>
                  {countryOptions.map((country) => (
                    <option key={country.isoCode} value={country.isoCode}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="explore-filter-control">
              <span className="explore-field-label">State</span>
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
            </div>
            <div className="explore-filter-control">
              <span className="explore-field-label">{categoryLabel}</span>
              <label className="explore-filter-field">
                <span className="sr-only">{categoryLabel}</span>
                <select
                  value={categoryValue}
                  onChange={(event) => updateFilterField(categoryField, event.target.value)}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value || `any-${cardType}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}
        <button className="primary-action explore-search-action" type="submit" disabled={isSearching}>
          {isSearching ? <LoaderCircle className="explore-spin" size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="form-error explore-status">{error}</p>}
      {status && <p className="form-success explore-status">{status}</p>}

      <section className="explore-briefing" aria-label={`${activeOption.label} travel briefing`}>
        {hasResults ? (
          <>
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
                  <strong>{usesPriceMetric ? pricedCount || '--' : topRatedCount || '--'}</strong>
                  <span>{usesPriceMetric ? 'With prices' : 'Highly rated'}</span>
                </div>
              </article>
            </div>

            <div className="explore-guidance-grid">
              <article className="explore-briefing-card explore-weather-summary">
                <div className="explore-briefing-title">
                  <CloudSun size={17} aria-hidden="true" />
                  <div>
                    <span>Destination weather</span>
                    {!activeWeather?.available && <strong>{isWeatherLoading ? 'Checking forecast' : 'Current location or search area'}</strong>}
                  </div>
                </div>
                {isWeatherLoading ? (
                  <p className="explore-briefing-text">
                    <LoaderCircle className="explore-spin" size={15} aria-hidden="true" />
                    Checking {formatWeatherDate(travelDate || getDateKey())}
                  </p>
                ) : activeWeather ? (
                  <>
                    <div className="explore-weather-current">
                      <CloudLightning className="explore-weather-current-icon" size={64} aria-hidden="true" />
                      <div className="explore-weather-current-detail">
                        <div className="explore-weather-line">
                          <strong>{weatherTemperature}</strong>
                          <span>{weatherCondition}</span>
                        </div>
                        <div className="explore-briefing-meta explore-weather-metrics">
                          <span><Droplets size={14} aria-hidden="true" />{weatherRain}</span>
                          <span><Wind size={14} aria-hidden="true" />{weatherWind}</span>
                        </div>
                      </div>
                    </div>
                    <p className="explore-briefing-text">{weatherTip}</p>
                  </>
                ) : (
                  <p className="explore-briefing-text">Checking weather for the current location or selected search area.</p>
                )}
              </article>

              <article className="explore-briefing-card explore-quick-tips-card">
                <div className="explore-briefing-title">
                  <Sparkles size={17} aria-hidden="true" />
                  <div>
                    <span>Quick tips</span>
                    <strong>{activeAi?.available ? 'Search-aware tips' : 'Planning tips'}</strong>
                  </div>
                </div>
                {isAiLoading ? (
                  <p className="explore-briefing-text">Preparing tips from ratings, prices, hours, and weather.</p>
                ) : activeAi?.available ? (
                  <ul className="explore-quick-tips-list">
                    <li>{activeAi.summary}</li>
                    {activeAi.picks?.slice(0, 2).map((pick) => (
                      <li key={`${pick.itemName}-${pick.score}`}>{pick.bestFor || pick.reason}</li>
                    ))}
                  </ul>
                ) : (
                  <ul className="explore-quick-tips-list">
                    <li>Check weather before selecting outdoor stops.</li>
                    <li>Compare rating, price, and opening status before saving.</li>
                    <li>Refresh AI insights after search results load.</li>
                  </ul>
                )}
              </article>
            </div>
          </>
        ) : (
          <div className="explore-presearch-grid">
            <article className="explore-presearch-card explore-presearch-weather">
              <div className="explore-briefing-title">
                <CloudSun size={17} aria-hidden="true" />
                <div>
                  <span>Destination weather</span>
                </div>
              </div>
              <div className="explore-presearch-center">
                {isWeatherLoading ? (
                  <>
                    <LoaderCircle className="explore-spin" size={32} aria-hidden="true" />
                    <h3>Checking current location weather</h3>
                    <p>Weather will update automatically for a selected country, state, or search area.</p>
                  </>
                ) : activeWeather ? (
                  <>
                    <CloudLightning className="explore-weather-current-icon" size={52} aria-hidden="true" />
                    <h3>{weatherTemperature} {weatherCondition}</h3>
                    <p>{weatherTip}</p>
                  </>
                ) : (
                  <>
                    <CloudSun size={52} aria-hidden="true" />
                    <h3>Checking current location weather</h3>
                    <p>Weather will update automatically for a selected country, state, or search area.</p>
                  </>
                )}
              </div>
            </article>

            <article className="explore-presearch-card explore-presearch-tips">
              <div className="explore-briefing-title">
                <Sparkles size={17} aria-hidden="true" />
                <div>
                  <span>Quick tips</span>
                </div>
              </div>
              <div className="explore-presearch-center">
                <Sparkles size={52} aria-hidden="true" />
                <h3>Planning tips ready after search</h3>
                <ul className="explore-quick-tips-list">
                  <li>Check weather before selecting outdoor stops.</li>
                  <li>Compare rating, price, and opening status before saving.</li>
                  <li>Use the right Ask AI panel for follow-up questions.</li>
                </ul>
              </div>
            </article>
          </div>
        )}
      </section>

      <section className="explore-results-shell">
        <div className="explore-results-heading">
          <div>
            <span>{searchConfig.resultLabel}</span>
            <h3>{hasResults ? `${isHotelsView ? 'Rooms' : isFoodView ? 'Food' : 'Places'} for ${destinationLabel}` : searchConfig.resultLabel}</h3>
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
              <h3>No results yet</h3>
              <p>{searchConfig.emptyText}</p>
            </div>
          ) : (
            activeItems.map((item, index) => (
              <PlaceCard
                categoryLabel={
                  isHotelsView && selectedRoomType
                    ? selectedRoomLabel
                    : isFoodView && selectedFoodCategory
                      ? selectedFoodCategoryLabel
                      : isAttractionsView && selectedAttractionCategory
                        ? selectedAttractionCategoryLabel
                      : item.category
                }
                convertedPriceText={getConvertedPriceText(item)}
                favoriteRecord={getFavoriteRecord?.(item)}
                index={index}
                isInitiallyFavorite={isItemFavorite?.(item)}
                item={item}
                key={`${item.id}-${index}`}
                onFavoriteChange={
                  isHotelsView
                    ? onHotelFavoriteChange
                    : isFoodView
                      ? onRestaurantFavoriteChange
                      : onAttractionFavoriteChange
                }
                onVisitedChange={handleVisitedChange}
                originalPriceText={getOriginalPriceText(item)}
                returnState={detailReturnState}
                selectedCurrency={selectedCurrency}
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
