/**
 * Visited place control.
 * Button, date picker, and saved state display are shared across place cards.
 */
import { CalendarCheck, CheckCircle2, LoaderCircle, PlusCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { markVisitedPlace } from '../../api/visitedPlaceApi';
import './VisitedPlaceControl.css';

// Formats a date value to the YYYY-MM-DD string required by input[type="date"]
const formatInputDate = (date) => {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
};

// Generates a summary string for the visited place based on the record data
const getVisitSummary = (visitedRecord) => {
  if (!visitedRecord) return 'Mark visited';
  const visitCount = visitedRecord.visitCount || visitedRecord.visits?.reduce((total, visit) => total + Number(visit.visitCount || 1), 0) || 1;
  const latestDate = visitedRecord.latestVisitedDate || visitedRecord.visits?.find((visit) => visit.visitedDate)?.visitedDate;

  if (latestDate) return `Visited ${visitCount}x`;
  return `Visited ${visitCount}x`;
};

// Main component for marking and managing visited places with popover form
function VisitedPlaceControl({
  payload,
  visitedRecord,
  onVisitedChange,
  compact = false,
}) {
  const controlRef = useRef(null);
  const popoverRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({});
  const [visitedDate, setVisitedDate] = useState('');
  const [visitCount, setVisitCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Closes the popover and resets error state
  const closePopover = () => {
    setIsOpen(false);
    setError('');
  };

  const updatePopoverPosition = () => {
    const button = controlRef.current?.querySelector('.visited-place-button');
    if (!button) return;

    const buttonRect = button.getBoundingClientRect();
    const popoverWidth = Math.min(260, window.innerWidth - 24);
    const estimatedHeight = 320;
    const gap = 8;
    const viewportPadding = 12;
    const canOpenBelow = buttonRect.bottom + gap + estimatedHeight <= window.innerHeight - viewportPadding;
    const top = canOpenBelow
      ? buttonRect.bottom + gap
      : Math.max(viewportPadding, buttonRect.top - estimatedHeight - gap);
    const left = Math.min(
      Math.max(viewportPadding, buttonRect.right - popoverWidth),
      window.innerWidth - popoverWidth - viewportPadding
    );

    setPopoverStyle({
      left: `${left}px`,
      maxHeight: `${Math.max(220, window.innerHeight - top - viewportPadding)}px`,
      top: `${top}px`,
      width: `${popoverWidth}px`,
    });
  };

  // Sets up click-outside and escape key handlers when popover is open
  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!controlRef.current?.contains(event.target) && !popoverRef.current?.contains(event.target)) {
        closePopover();
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closePopover();
      }
    };

    updatePopoverPosition();

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [isOpen]);

  // Submits the visited place data to the API and notifies parent components
  const saveVisitedPlace = async (event) => {
    event.preventDefault();
    if (!payload || isSaving) return;

    setIsSaving(true);
    setError('');
    try {
      const response = await markVisitedPlace({
        ...payload,
        visitedDate: visitedDate || undefined,
        visitCount,
        notes,
      });
      onVisitedChange?.(response.data?.data?.visitedPlace);
      setVisitedDate('');
      setVisitCount(1);
      setNotes('');
      setIsOpen(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save visited place.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      ref={controlRef}
      className={[
        'visited-place-control',
        compact ? 'is-compact' : '',
        isOpen ? 'is-open' : '',
      ].filter(Boolean).join(' ')}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {/* Main button that toggles the popover */}
      <button
        className={visitedRecord ? 'visited-place-button is-visited' : 'visited-place-button'}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-expanded={isOpen}
      >
        {visitedRecord ? <CheckCircle2 size={15} aria-hidden="true" /> : <CalendarCheck size={15} aria-hidden="true" />}
        {getVisitSummary(visitedRecord)}
      </button>

      {isOpen ? createPortal(
        <form
          ref={popoverRef}
          className="visited-place-popover"
          style={popoverStyle}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onSubmit={saveVisitedPlace}
        >
          <div className="visited-place-popover-header">
            <strong>Add visit details</strong>
            <button
              className="visited-place-close"
              type="button"
              onClick={closePopover}
              aria-label="Close visit details"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          
          {/* Visited date input field */}
          <label>
            <span>Visited date optional</span>
            <input type="date" value={visitedDate} onChange={(event) => setVisitedDate(event.target.value)} />
          </label>
          
          {/* Quick fill button for planned date from payload */}
          {payload?.visitedDate ? (
            <button className="visited-place-secondary" type="button" onClick={() => setVisitedDate(formatInputDate(payload.visitedDate))}>
              Use planned date
            </button>
          ) : null}
          
          {/* Visit count input with min/max constraints */}
          <label>
            <span>Number of visits</span>
            <input
              type="number"
              min="1"
              max="999"
              value={visitCount}
              onChange={(event) => setVisitCount(Math.max(1, Number(event.target.value) || 1))}
            />
          </label>
          
          {/* Optional notes input */}
          <label>
            <span>Note</span>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength="500" placeholder="Optional memory" />
          </label>
          
          {/* Error message display */}
          {error ? <p role="alert">{error}</p> : null}
          
          {/* Submit button with loading state */}
          <button type="submit" disabled={isSaving}>
            {isSaving ? <LoaderCircle className="visited-place-spin" size={14} aria-hidden="true" /> : <PlusCircle size={14} aria-hidden="true" />}
            Add visit
          </button>
        </form>,
        document.body
      ) : null}
    </div>
  );
}

export default VisitedPlaceControl;
