/**
 * Compare tray.
 * A bottom basket keeps comparison available without adding a separate menu item.
 */
import { GitCompareArrows, LoaderCircle, Sparkles, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { getComparisonRecommendation } from '../../api/comparisonApi';
import useCompare from '../../hooks/useCompare';
import './CompareTray.css';

const fields = [
  ['category', 'Category'],
  ['hours', 'Working hour'],
  ['price', 'Price'],
  ['rating', 'Rating'],
  ['reviewCount', 'Reviews'],
  ['address', 'Location'],
];

const formatValue = (field, item) => {
  if (field === 'rating') return item.rating ? `${Number(item.rating).toFixed(1)} / 5` : 'No rating';
  if (field === 'reviewCount') return item.reviewCount ? Number(item.reviewCount).toLocaleString() : 'No reviews';
  return item[field] || 'Unavailable';
};

function CompareTray() {
  const compare = useCompare();
  const [isOpen, setIsOpen] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  if (!compare || compare.items.length === 0) {
    return null;
  }

  const canCompare = compare.items.length >= 2;

  const handleOpen = () => {
    setIsOpen(true);
    setError('');
  };

  const handleRecommend = async () => {
    if (!canCompare) {
      setError('Select at least two places first.');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const response = await getComparisonRecommendation({
        items: compare.items,
        context: { page: window.location.pathname },
      });
      setRecommendation(response.data?.data?.recommendation || null);
      setStatus('success');
    } catch (requestError) {
      setStatus('error');
      setError(requestError.response?.data?.message || 'Unable to choose the best option right now.');
    }
  };

  return (
    <>
      <aside className="compare-tray" aria-label="Selected places for comparison">
        <div className="compare-tray-summary">
          <GitCompareArrows size={18} aria-hidden="true" />
          <span>{compare.items.length}/{compare.maxCompareItems} selected</span>
          <small>{compare.notice || 'Pick places from this page, then compare.'}</small>
        </div>
        <div className="compare-tray-items">
          {compare.items.map((item) => (
            <span key={item.id}>
              {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <GitCompareArrows size={14} aria-hidden="true" />}
              <em>{item.name}</em>
              <button type="button" aria-label={`Remove ${item.name}`} onClick={() => compare.removeItem(item.id)}>
                <X size={13} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
        <div className="compare-tray-actions">
          <button type="button" onClick={compare.clearItems}>
            <Trash2 size={15} aria-hidden="true" />
            Clear
          </button>
          <button className="compare-tray-primary" type="button" onClick={handleOpen} disabled={!canCompare}>
            <GitCompareArrows size={15} aria-hidden="true" />
            Compare
          </button>
        </div>
      </aside>

      {isOpen && (
        <div className="compare-modal-backdrop" role="presentation">
          <section className="compare-modal" role="dialog" aria-modal="true" aria-labelledby="compare-modal-title">
            <div className="compare-modal-header">
              <div>
                <span>Smart comparison</span>
                <h2 id="compare-modal-title">Compare selected places</h2>
              </div>
              <button type="button" aria-label="Close comparison" onClick={() => setIsOpen(false)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="compare-table-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th scope="col">Feature</th>
                    {compare.items.map((item) => (
                      <th scope="col" key={item.id}>{item.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map(([field, label]) => (
                    <tr key={field}>
                      <th scope="row">{label}</th>
                      {compare.items.map((item) => (
                        <td key={`${item.id}-${field}`}>{formatValue(field, item)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="compare-ai-panel">
              <div>
                <Sparkles size={18} aria-hidden="true" />
                <strong>AI best pick</strong>
              </div>
              {recommendation?.bestPick ? (
                <article>
                  <h3>{recommendation.bestPick.name}</h3>
                  <p>{recommendation.bestPick.reason}</p>
                  <small>{recommendation.summary}</small>
                  <em>{recommendation.bestPick.caution}</em>
                </article>
              ) : (
                <p>Ask the planner to choose the strongest option from rating, reviews, price, and working hours.</p>
              )}
              {error && <p className="compare-error" role="alert">{error}</p>}
              <button type="button" onClick={handleRecommend} disabled={status === 'loading'}>
                {status === 'loading' ? <LoaderCircle className="compare-spin" size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
                {status === 'loading' ? 'Choosing...' : 'Pick best one'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default CompareTray;
