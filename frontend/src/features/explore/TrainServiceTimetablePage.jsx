import { ArrowLeft, CircleAlert, LoaderCircle, TrainFront } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { searchTrainServiceTimetable } from '../../api/exploreApi';
import { getErrorMessage } from './explore.helpers';
import './submenus/Transportation.css';

const formatTime = (value) => value || '--:--';
const formatDate = (value) => value || 'Date unavailable';
const formatValue = (value) => value || 'Not provided';
const getStatusClassName = (isLate, isCancelled) =>
  `explore-train-status-pill ${isCancelled || isLate ? 'late' : 'on-time'}`;

const getStopKey = (stop = {}) => [stop.stationCode, stop.stationName].filter(Boolean).join(':').toLowerCase();
const uniqueCoaches = (coaches = []) => [
  ...new Map(
    coaches
      .filter((coach) => coach?.number || coach?.id || coach?.class)
      .map((coach) => [`${coach.number || coach.id}:${coach.class}`, coach])
  ).values(),
];

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

  const serviceCoaches = uniqueCoaches([
    ...(timetable?.coaches || []),
    ...(timetable?.performance?.coaches || []),
  ]);
  const displayStops = timetable?.performance?.stops?.length ? timetable.performance.stops : timetable?.stops || [];
  const headerTitle = timetable?.destinationName || context.destinationName || 'Service timetable';
  const cancellationCode = timetable?.cancellationCode || timetable?.performance?.cancellationCode;
  const cancellationReason = timetable?.cancellationReason || timetable?.performance?.cancellationReason;
  const runningLateReason = timetable?.runningLateReason || timetable?.performance?.runningLateReason;
  const runningLateCode = timetable?.runningLateCode || timetable?.performance?.runningLateCode;

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
          <h2>{headerTitle}</h2>
          <p>{[timetable?.operatorName || context.operatorName, timetable?.originName || context.originName, timetable?.destinationName || context.destinationName].filter(Boolean).join(' / ') || 'Service timetable details'}</p>
        </div>
        <div className="explore-hero-panel" aria-label="Train service summary">
          <div>
            <span>Service date</span>
            <strong>{formatDate(timetable?.date || request.serviceDate)}</strong>
          </div>
          <small>{request.trainUid || timetable?.trainUid || 'Train UID unavailable'}</small>
          <div className="explore-hero-meter" aria-hidden="true">
            <span style={{ width: timetable?.available ? '100%' : '38%' }} />
          </div>
        </div>
      </div>

      <div className="explore-workspace">
        <div className="explore-transport-toolbar">
          <button className="explore-train-back-link" type="button" onClick={handleBackToSearch}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back to train search
          </button>
        </div>

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
            <section className="explore-flight-results-board">
              <div className="explore-flight-board-title">
                <div>
                  <span>Main train</span>
                  <h3>{headerTitle}</h3>
                </div>
                <strong>{displayStops.length} stop{displayStops.length === 1 ? '' : 's'}</strong>
              </div>
              <div className="explore-train-main-summary">
                <span>
                  <small>TOC</small>
                  <strong>{formatValue(timetable.operatorName || timetable.performance?.operatorName || context.operatorName)}</strong>
                </span>
                <span>
                  <small>Origin</small>
                  <strong>{formatValue(timetable.originName || timetable.performance?.originName || context.originName)}</strong>
                </span>
                <span>
                  <small>Destination</small>
                  <strong>{formatValue(timetable.destinationName || timetable.performance?.destinationName || context.destinationName)}</strong>
                </span>
                <span>
                  <small>Date</small>
                  <strong>{formatDate(timetable.date || timetable.performance?.date || request.serviceDate)}</strong>
                </span>
                <span>
                  <small>AI distance estimate</small>
                  <strong>{formatValue(timetable.distanceEstimate?.display)}</strong>
                </span>
              </div>
              <div className="explore-train-stop-list">
                {displayStops.map((stop, index) => {
                  const performanceStop = performanceStopsByKey.get(getStopKey(stop)) || {};
                  const stopCoaches = uniqueCoaches([...(stop.coaches || []), ...(performanceStop.coaches || []), ...serviceCoaches]);
                  const stopCancelled = stop.cancelled || performanceStop.cancelled || timetable.cancelled || timetable.performance?.cancelled;
                  const statusCode =
                    stop.cancellationCode ||
                    performanceStop.cancellationCode ||
                    (stopCancelled ? cancellationCode : runningLateCode);
                  const statusReason =
                    stop.cancellationReason ||
                    performanceStop.cancellationReason ||
                    (stopCancelled ? cancellationReason : runningLateReason);

                  return (
                    <article className="explore-train-stop explore-train-stop-detail" key={`${stop.id}-${index}`}>
                      <div>
                        <strong>{stop.stationName || stop.stationCode || 'Station unavailable'}</strong>
                        <span>{stop.stationCode}{stop.platform ? ` - Platform ${stop.platform}` : ''}</span>
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
                        <strong className={getStatusClassName(Boolean(statusReason), stopCancelled)}>
                          {stopCancelled ? 'Cancelled' : statusReason ? 'Late' : 'On time'}
                        </strong>
                        <span>{[statusCode, statusReason].filter(Boolean).join(' - ')}</span>
                      </div>
                      <div>
                        <small>Coach / class</small>
                        <strong>{stopCoaches.length ? stopCoaches.map((coach) => coach.number || coach.id).filter(Boolean).join(', ') : 'Not provided'}</strong>
                        <span>{stopCoaches.length ? stopCoaches.map((coach) => coach.class).filter(Boolean).join(', ') || 'Class not provided' : 'Class not provided'}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="explore-flight-results-board explore-train-service-side">
              <div className="explore-flight-board-title">
                <div>
                  <span>Rail performance</span>
                  <h3>Status details</h3>
                </div>
              </div>
              <div className="explore-train-service-summary">
                <span>
                  <small>Cancellation code</small>
                  <strong>{formatValue(cancellationCode)}</strong>
                </span>
                <span>
                  <small>Cancellation reason</small>
                  <strong>{formatValue(cancellationReason)}</strong>
                </span>
                <span>
                  <small>Running late reason</small>
                  <strong>{formatValue(runningLateReason)}</strong>
                </span>
              </div>
              <div className="explore-train-coach-list">
                <h3>Coaches</h3>
                {serviceCoaches.length ? (
                  serviceCoaches.map((coach, index) => (
                    <span key={`${coach.id}-${index}`}>
                      <strong>{coach.number || coach.id || `Coach ${index + 1}`}</strong>
                      <small>{coach.class || 'Class not provided'}</small>
                    </span>
                  ))
                ) : (
                  <p>
                    <CircleAlert size={15} aria-hidden="true" />
                    Coach data was not returned for this service.
                  </p>
                )}
              </div>
            </aside>
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
