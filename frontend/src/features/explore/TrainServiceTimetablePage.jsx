import { ArrowLeft, LoaderCircle, TrainFront } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { searchTrainServiceTimetable } from '../../api/exploreApi';
import { getErrorMessage } from './explore.helpers';
import './submenus/Transportation.css';

const formatTime = (value) => value || '--:--';
const formatDate = (value) => value || 'Date unavailable';
const getStopKey = (stop = {}) => [stop.stationCode, stop.stationName].filter(Boolean).join(':').toLowerCase();

function TrainServiceTimetablePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [timetable, setTimetable] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const request = useMemo(
    () => ({
      serviceIdentifier: searchParams.get('serviceIdentifier') || '',
      trainUid: searchParams.get('trainUid') || '',
      serviceDate: searchParams.get('serviceDate') || '',
      actualRid: searchParams.get('actualRid') || '',
    }),
    [searchParams]
  );

  const context = {
    destinationName: searchParams.get('destinationName') || '',
    originName: searchParams.get('originName') || '',
    operatorName: searchParams.get('operatorName') || '',
    stationName: searchParams.get('stationName') || '',
    stationCode: searchParams.get('stationCode') || '',
  };

  useEffect(() => {
    let isActive = true;

    const loadTimetable = async () => {
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

    return () => {
      isActive = false;
    };
  }, [request]);

  const performanceStopsByKey = useMemo(() => {
    const stops = timetable?.performance?.stops || [];
    return new Map(stops.map((stop) => [getStopKey(stop), stop]));
  }, [timetable]);

  const displayStops = timetable?.performance?.stops?.length ? timetable.performance.stops : timetable?.stops || [];
  const headerTitle = timetable?.destinationName || context.destinationName || 'Service timetable';
  const railOperatorTitle = timetable?.operatorName || timetable?.performance?.operatorName || context.operatorName || 'Train service';
  const trainUidLabel = request.trainUid || timetable?.trainUid || 'Train UID unavailable';
  const railRouteTitle = [timetable?.originName || timetable?.performance?.originName || context.originName, headerTitle]
    .filter(Boolean)
    .join(' -> ');
  const cancellationCode = timetable?.cancellationCode || timetable?.performance?.cancellationCode;
  const cancellationReason = timetable?.cancellationReason || timetable?.performance?.cancellationReason;
  const runningLateReason = timetable?.runningLateReason || timetable?.performance?.runningLateReason;
  const runningLateCode = timetable?.runningLateCode || timetable?.performance?.runningLateCode;
  const getSegmentDistanceLabel = (stop = {}, index) => (index === 0 ? 'Start' : stop.segmentEstimate?.display || 'Estimate unavailable');
  const getSegmentPriceLabel = (stop = {}, index) => (index === 0 ? 'Start' : stop.segmentEstimate?.priceEstimate?.display || 'Estimate unavailable');

  const handleBackToSearch = () => {
    navigate('/explore?view=transport', {
      state: location.state || null,
    });
  };

  return (
    <section className="explore-page">
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
        {isLoading ? (
          <section className="explore-results-shell">
            <div className="explore-empty explore-placeholder">
              <LoaderCircle className="explore-spin" size={34} aria-hidden="true" />
              <h3>Loading service timetable</h3>
              <p>Fetching calling points and rail performance details.</p>
            </div>
          </section>
        ) : error ? (
          <p className="form-error explore-status">{error}</p>
        ) : timetable?.available ? (
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
              <div className="explore-train-stop-list">
                {displayStops.map((stop, index) => {
                  const performanceStop = performanceStopsByKey.get(getStopKey(stop)) || {};
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
                      <div>
                        <strong>{stationLabel}</strong>
                        <span>{stop.platform ? `Platform ${stop.platform}` : 'Platform not provided'}</span>
                      </div>
                      <div>
                        <small>Estimated arrival</small>
                        <strong>{formatTime(stop.expectedArrivalTime || stop.aimedArrivalTime || stop.actualArrivalTime || performanceStop.expectedArrivalTime)}</strong>
                        <span>{formatDate(stop.expectedArrivalDate || stop.arrivalDate || stop.actualArrivalDate || performanceStop.arrivalDate)}</span>
                      </div>
                      <div>
                        <small>Estimated depart</small>
                        <strong>{formatTime(stop.expectedDepartureTime || stop.aimedDepartureTime || stop.actualDepartureTime || performanceStop.expectedDepartureTime)}</strong>
                        <span>{formatDate(stop.expectedDepartureDate || stop.departureDate || stop.actualDepartureDate || performanceStop.departureDate)}</span>
                      </div>
                      <div>
                        <small>{stopCancelled ? 'Cancelled' : statusReason ? 'Late' : 'Status'}</small>
                        <strong className={statusClassName}>{statusLabel}</strong>
                        <span>{[statusCode, statusReason].filter(Boolean).join(' - ')}</span>
                      </div>
                      <div>
                        <small>Estimated distance</small>
                        <strong>{getSegmentDistanceLabel(stop, index)}</strong>
                        <span>{index === 0 ? 'Journey origin' : 'From previous stop'}</span>
                      </div>
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

export default TrainServiceTimetablePage;
