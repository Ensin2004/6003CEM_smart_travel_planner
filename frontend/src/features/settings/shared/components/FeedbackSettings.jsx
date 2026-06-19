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
      {/* Dynamic heading that changes based on admin role */}
      <h3>{isAdmin ? 'Ratings and Feedback' : 'Rate Us & Feedback'}</h3>
      
      {/* Conditional rendering based on admin privileges */}
      {isAdmin ? (
        // Admin view: displays all feedback entries with filtering and sorting capabilities
        <div className="feedback-list">
          {/* Filter and sort controls row */}
          <div className="feedback-filter-row">
            {/* Sort filter dropdown */}
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
            
            {/* Rating filter dropdown */}
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
          
          {/* Empty state message when no feedback exists */}
          {filteredFeedbackEntries.length === 0 && <p className="settings-readable">No ratings submitted yet.</p>}
          
          {/* Map through filtered feedback entries to display each submission */}
          {filteredFeedbackEntries.map((entry) => (
            <article key={entry._id}>
              {/* Header section with user information and timestamp */}
              <div className="feedback-list-header">
                <div>
                  <strong>{entry.userName}</strong>
                  <span>{entry.userEmail}</span>
                </div>
                {/* Conditional rendering of creation date with proper datetime attribute */}
                {entry.createdAt && (
                  <time dateTime={entry.createdAt}>
                    {dateFormatter.format(new Date(entry.createdAt))}
                  </time>
                )}
              </div>
              
              {/* Star rating display with accessibility label */}
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
              
              {/* Optional feedback text content */}
              {entry.feedback && <p>{entry.feedback}</p>}
            </article>
          ))}
        </div>
      ) : (
        // Public view: displays the feedback submission form for non-admin users
        <form className="settings-form feedback-form" onSubmit={onFeedbackSubmit}>
          {/* Star rating picker component */}
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
          
          {/* Feedback text input field (optional) */}
          <label>
            Feedback (optional)
            <textarea
              value={feedbackForm.feedback}
              onChange={(event) => setFeedbackForm((current) => ({ ...current, feedback: event.target.value }))}
              placeholder="Share what worked well or what we can improve"
              rows={5}
            />
          </label>
          
          {/* Submit button for the feedback form */}
          <button className="auth-submit settings-action" type="submit">
            Submit rating
          </button>
          
          {/* Status display for feedback submission operations */}
          {renderStatus('feedback')}
        </form>
      )}
    </section>
  );
}

// Default export registers the primary value.
export default FeedbackSettings;
