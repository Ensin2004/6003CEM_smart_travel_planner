/**
 * Settings module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { Star } from 'lucide-react';
import { dateFormatter, feedbackRatingOptions, feedbackSortOptions } from '../settings.constants';
// FeedbackSettings renders the main screen and handles nearby interactions.
function FeedbackSettings({
  feedbackForm,
  filteredFeedbackEntries,
  isAdmin,
  onFeedbackSubmit,
  renderStatus,
  setFeedbackForm,
  setRatingFilter,
  setSortFilter,
  ratingFilter,
  sortFilter,
}) {
  return (
    <section className="settings-pane settings-support-pane">
      <h3>{isAdmin ? 'Ratings and Feedback' : 'Rate Us & Feedback'}</h3>
      {isAdmin ? (
        <div className="feedback-list">
          <div className="feedback-filter-row">
            <label className="feedback-filter">
              Sort by
              <select value={sortFilter} onChange={(event) => setSortFilter(event.target.value)}>
                {feedbackSortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="feedback-filter">
              Star rating
              <select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)}>
                {feedbackRatingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {filteredFeedbackEntries.length === 0 && <p className="settings-readable">No ratings submitted yet.</p>}
          {filteredFeedbackEntries.map((entry) => (
            <article key={entry._id}>
              <div className="feedback-list-header">
                <div>
                  <strong>{entry.userName}</strong>
                  <span>{entry.userEmail}</span>
                </div>
                {entry.createdAt && (
                  <time dateTime={entry.createdAt}>
                    {dateFormatter.format(new Date(entry.createdAt))}
                  </time>
                )}
              </div>
              <p className="feedback-stars" aria-label={`${entry.rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    size={18}
                    fill={index < entry.rating ? 'currentColor' : 'none'}
                    aria-hidden="true"
                  />
                ))}
              </p>
              {entry.feedback && <p>{entry.feedback}</p>}
            </article>
          ))}
        </div>
      ) : (
        <form className="settings-form feedback-form" onSubmit={onFeedbackSubmit}>
          <div className="rating-picker" aria-label="Rating out of 5">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                className={rating <= feedbackForm.rating ? 'active' : ''}
                aria-label={`${rating} star${rating > 1 ? 's' : ''}`}
                onClick={() => setFeedbackForm((current) => ({ ...current, rating }))}
              >
                <Star size={24} fill={rating <= feedbackForm.rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <label>
            Feedback (optional)
            <textarea
              value={feedbackForm.feedback}
              onChange={(event) => setFeedbackForm((current) => ({ ...current, feedback: event.target.value }))}
              placeholder="Share what worked well or what we can improve"
              rows={5}
            />
          </label>
          <button className="auth-submit settings-action" type="submit">
            Submit rating
          </button>
          {renderStatus('feedback')}
        </form>
      )}
    </section>
  );
}
// Default export registers the primary  value.
export default FeedbackSettings;
