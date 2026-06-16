/**
 * Explore module.
 * Business rules, repository access, and external integrations live in this layer.
 */
import { ArrowLeft, LoaderCircle, TrainFront } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { searchTrainServiceTimetable } from '../../../api/exploreApi';
import { getErrorMessage } from '../explore.helpers';
import './Transportation.css';

/**
 * Format Time converts raw values into readable display text.
 * 
 * @param {string} value - The raw time value
 * @returns {string} Formatted time string or placeholder
 */
const formatTime = (value) => value || '--:--';

/**
 * Format Date converts raw values into readable display text.
 * 
 * @param {string} value - The raw date value
 * @returns {string} Formatted date string or placeholder
 */
const formatDate = (value) => value || 'Date unavailable';

/**
 * Generates a unique key for a train stop.
 * 
 * @param {Object} stop - The stop object
 * @param {string} stop.stationCode - The station code
 * @param {string} stop.stationName - The station name
 * @returns {string} A lowercase key for lookups
 */
const getStopKey = (stop = {}) => [stop.stationCode, stop.stationName].filter(Boolean).join(':').toLowerCase();

/**
 * TrainServiceTimetablePage renders the main screen and handles nearby interactions.
 * Displays detailed timetable information for a specific train service.
 * 
 * @returns {JSX.Element} The rendered train service timetable page
 */
function TrainServiceTimetablePage() {
  // Navigation and location hooks for routing and state management
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State for timetable data, error messages, and loading status
  const [timetable, setTimetable] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Memoized request object containing all service identification parameters
   * Extracted from URL search parameters
   */
  const request = useMemo(
    () => ({
      serviceIdentifier: searchParams.get('serviceIdentifier') || '',
      trainUid: searchParams.get('trainUid') || '',
      serviceDate: searchParams.get('serviceDate') || '',
      actualRid: searchParams.get('actualRid') || '',
    }),
    [searchParams]
  );

  /**
   * Context object containing display information for the service
   * Extracted from URL search parameters for fallback display
   */
  const context = {
    destinationName: searchParams.get('destinationName') || '',
    originName: searchParams.get('originName') || '',
    operatorName: searchParams.get('operatorName') || '',
    stationName: searchParams.get('stationName') || '',
    stationCode: searchParams.get('stationCode') || '',
  };

  /**
   * Effect hook that loads the train service timetable when component mounts
   * or when request parameters change
   */
  useEffect(() => {
    let isActive = true;

    const loadTimetable = async () => {
      // Validate required parameters before making API call
      if (!request.serviceDate || (!request.serviceIdentifier && !request.trainUid)) {
        setError('Service details are missing. Return to the station timetable and choose a train again.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const response = await searchTrainServiceTimetable(request);
        if (!isActive) return;
        console.log('Train service timetable API response:', response.data);
        setTimetable(response.data.data.timetable);
      } catch (requestError) {
        if (!isActive) return;
        setError(getErrorMessage(requestError));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadTimetable();
    
    // Cleanup prevents state updates after component unmount.
    return () => {
      isActive = false;
    };
  }, [request]);

  /**
   * Memoized map of performance stops keyed by stop key for fast lookup
   */
  const performanceStopsByKey = useMemo(() => {
    const stops = timetable?.performance?.stops || [];
    return new Map(stops.map((stop) => [getStopKey(stop), stop]));
  }, [timetable]);

  // Determine which stops to display - prefer performance stops if available
  const displayStops = timetable?.performance?.stops?.length ? timetable.performance.stops : timetable?.stops || [];
  
  // Extract display values with fallbacks to context data
  const headerTitle = timetable?.destinationName || context.destinationName || 'Service timetable';
  const railOperatorTitle = timetable?.operatorName || timetable?.performance?.operatorName || context.operatorName || 'Train service';
  const trainUidLabel = request.trainUid || timetable?.trainUid || 'Train UID unavailable';
  const railRouteTitle = [timetable?.originName || timetable?.performance?.originName || context.originName, headerTitle]
    .filter(Boolean)
    .join(' -> ');
  
  // Extract cancellation and delay information
  const cancellationCode = timetable?.cancellationCode || timetable?.performance?.cancellationCode;
  const cancellationReason = timetable?.cancellationReason || timetable?.performance?.cancellationReason;
  const runningLateReason = timetable?.runningLateReason || timetable?.performance?.runningLateReason;
  const runningLateCode = timetable?.runningLateCode || timetable?.performance?.runningLateCode;
  
  /**
   * Helper function to get segment distance display label
   * 
   * @param {Object} stop - The stop object
   * @param {number} index - The index of the stop in the list
   * @returns {string} Display label for distance
   */
  const getSegmentDistanceLabel = (stop = {}, index) => (index === 0 ? 'Start' : stop.segmentEstimate?.display || 'Estimate unavailable');
  
  /**
   * Helper function to get segment price display label
   * 
   * @param {Object} stop - The stop object
   * @param {number} index - The index of the stop in the list
   * @returns {string} Display label for price
   */
  const getSegmentPriceLabel = (stop = {}, index) => (index === 0 ? 'Start' : stop.segmentEstimate?.priceEstimate?.display || 'Estimate unavailable');

  /**
   * Navigation handler that returns to the transport search view
   */
  const handleBackToSearch = () => {
    navigate('/explore?view=transport', {
      state: location.state || null,
    });
  };

  return (
    <section className="explore-page">
      {/* Hero section with service summary */}
      <div className="explore-hero">
        <div>
          <span className="explore-eyebrow">
            <TrainFront size={15} aria-hidden="true" />
            Rail information
          </span>
          <h2>{railOperatorTitle}</h2>
          <p>{trainUidLabel}</p>
          <p>{railRouteTitle || 'Service timetable details'}</p>
        </div>
        <div className="explore-hero-panel" aria-label="Train service summary">
          <div>
            <span>Service date</span>
            <strong>{formatDate(timetable?.date || request.serviceDate)}</strong>
          </div>
          <div className="explore-hero-meter" aria-hidden="true">
            <span style={{ width: timetable?.available ? '100%' : '38%' }} />
          </div>
        </div>
      </div>

      <div className="explore-workspace">
        {/* Loading state display */}
        {isLoading ? (
          <section className="explore-results-shell">
            <div className="explore-empty explore-placeholder">
              <LoaderCircle className="explore-spin" size={34} aria-hidden="true" />
              <h3>Loading service timetable</h3>
              <p>Fetching calling points and rail performance details.</p>
            </div>
          </section>
        ) : error ? (
          /* Error display */
          <p className="form-error explore-status">{error}</p>
        ) : timetable?.available ? (
          /* Main timetable display when data is available */
          <section className="explore-train-service-layout">
            <section className="explore-results-board">
              <div className="explore-results-board-title">
                <div>
                  <span className="explore-train-title-with-back">
                    <button type="button" onClick={handleBackToSearch} aria-label="Back to train search">
                      <ArrowLeft size={15} aria-hidden="true" />
                    </button>
                    Main train to
                  </span>
                  <h3>{headerTitle}</h3>
                </div>
                <strong>{displayStops.length} stop{displayStops.length === 1 ? '' : 's'}</strong>
              </div>
              
              {/* List of train stops with detailed information */}
              <div className="explore-train-stop-list">
                {displayStops.map((stop, index) => {
                  // Look up performance data for this stop
                  const performanceStop = performanceStopsByKey.get(getStopKey(stop)) || {};
                  
                  // Determine cancellation and status information
                  const stopCancelled = stop.cancelled || performanceStop.cancelled || timetable.cancelled || timetable.performance?.cancelled;
                  const statusCode =
                    stop.cancellationCode ||
                    performanceStop.cancellationCode ||
                    (stopCancelled ? cancellationCode : runningLateCode);
                  const statusReason =
                    stop.cancellationReason ||
                    performanceStop.cancellationReason ||
                    (stopCancelled ? cancellationReason : runningLateReason);
                  const statusLabel = stopCancelled ? 'Cancelled' : statusReason ? 'Late' : 'On time';
                  const statusClassName = `explore-train-status-text ${stopCancelled || statusReason ? 'late' : 'on-time'}`;
                  const stationLabel = stop.stationName && stop.stationCode ? `${stop.stationName} (${stop.stationCode})` : stop.stationName || stop.stationCode || 'Station unavailable';

                  return (
                    <article className="explore-train-stop explore-train-stop-detail" key={`${stop.id}-${index}`}>
                      {/* Station name and platform */}
                      <div>
                        <strong>{stationLabel}</strong>
                        <span>{stop.platform ? `Platform ${stop.platform}` : 'Platform not provided'}</span>
                      </div>
                      
                      {/* Estimated arrival time */}
                      <div>
                        <small>Estimated arrival</small>
                        <strong>{formatTime(stop.expectedArrivalTime || stop.aimedArrivalTime || stop.actualArrivalTime || performanceStop.expectedArrivalTime)}</strong>
                        <span>{formatDate(stop.expectedArrivalDate || stop.arrivalDate || stop.actualArrivalDate || performanceStop.arrivalDate)}</span>
                      </div>
                      
                      {/* Estimated departure time */}
                      <div>
                        <small>Estimated depart</small>
                        <strong>{formatTime(stop.expectedDepartureTime || stop.aimedDepartureTime || stop.actualDepartureTime || performanceStop.expectedDepartureTime)}</strong>
                        <span>{formatDate(stop.expectedDepartureDate || stop.departureDate || stop.actualDepartureDate || performanceStop.departureDate)}</span>
                      </div>
                      
                      {/* Status information (cancelled, late, on time) */}
                      <div>
                        <small>{stopCancelled ? 'Cancelled' : statusReason ? 'Late' : 'Status'}</small>
                        <strong className={statusClassName}>{statusLabel}</strong>
                        <span>{[statusCode, statusReason].filter(Boolean).join(' - ')}</span>
                      </div>
                      
                      {/* Segment distance information */}
                      <div>
                        <small>Estimated distance</small>
                        <strong>{getSegmentDistanceLabel(stop, index)}</strong>
                        <span>{index === 0 ? 'Journey origin' : 'From previous stop'}</span>
                      </div>
                      
                      {/* Segment price information */}
                      <div>
                        <small>Estimated price</small>
                        <strong>{getSegmentPriceLabel(stop, index)}</strong>
                        <span>{index === 0 ? 'Journey origin' : 'Segment fare'}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </section>
        ) : (
          /* Empty state when no timetable is available */
          <section className="explore-results-shell">
            <div className="explore-empty explore-placeholder">
              <TrainFront size={34} aria-hidden="true" />
              <h3>{timetable?.message || 'No service timetable found'}</h3>
              <p>Return to the station timetable and choose another train.</p>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

// Default export registers the primary value.
export default TrainServiceTimetablePage;
