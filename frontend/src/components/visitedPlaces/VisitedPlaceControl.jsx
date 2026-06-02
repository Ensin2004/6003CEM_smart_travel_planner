/**
 * Visited place control.
 * Button, date picker, and saved state display are shared across place cards.
 */
import { CalendarCheck, CheckCircle2, LoaderCircle, PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { markVisitedPlace } from '../../api/visitedPlaceApi';
import './VisitedPlaceControl.css';

const formatInputDate = (date) => {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
};

const getVisitSummary = (visitedRecord) => {
  if (!visitedRecord) return 'Mark visited';
  const visitCount = visitedRecord.visitCount || visitedRecord.visits?.reduce((total, visit) => total + Number(visit.visitCount || 1), 0) || 1;
  const latestDate = visitedRecord.latestVisitedDate || visitedRecord.visits?.find((visit) => visit.visitedDate)?.visitedDate;

  if (latestDate) return `Visited ${visitCount}x`;
  return `Visited ${visitCount}x`;
};

function VisitedPlaceControl({
  payload,
  visitedRecord,
  onVisitedChange,
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [visitedDate, setVisitedDate] = useState('');
  const [visitCount, setVisitCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

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
    <div className={compact ? 'visited-place-control is-compact' : 'visited-place-control'} onClick={(event) => event.stopPropagation()}>
      <button
        className={visitedRecord ? 'visited-place-button is-visited' : 'visited-place-button'}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        {visitedRecord ? <CheckCircle2 size={15} aria-hidden="true" /> : <CalendarCheck size={15} aria-hidden="true" />}
        {getVisitSummary(visitedRecord)}
      </button>

      {isOpen ? (
        <form className="visited-place-popover" onSubmit={saveVisitedPlace}>
          <label>
            <span>Visited date optional</span>
            <input type="date" value={visitedDate} onChange={(event) => setVisitedDate(event.target.value)} />
          </label>
          {payload?.visitedDate ? (
            <button className="visited-place-secondary" type="button" onClick={() => setVisitedDate(formatInputDate(payload.visitedDate))}>
              Use planned date
            </button>
          ) : null}
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
          <label>
            <span>Note</span>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength="500" placeholder="Optional memory" />
          </label>
          {error ? <p role="alert">{error}</p> : null}
          <button type="submit" disabled={isSaving}>
            {isSaving ? <LoaderCircle className="visited-place-spin" size={14} aria-hidden="true" /> : <PlusCircle size={14} aria-hidden="true" />}
            Add visit
          </button>
        </form>
      ) : null}
    </div>
  );
}

export default VisitedPlaceControl;
