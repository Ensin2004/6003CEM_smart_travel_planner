/**
 * Settings module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { ChevronDown, Trash2 } from 'lucide-react';
import { useState } from 'react';

// FaqSettings renders the main screen and handles nearby interactions.
function FaqSettings({
  content,
  editMode,
  isAdmin,
  onContentSave,
  openFaq,
  renderPaneHeader,
  renderStatus,
  setContent,
  setOpenFaq,
}) {
  // State management for the FAQ deletion confirmation dialog
  // Stores the index of the FAQ pending deletion, or null when no deletion is pending
  const [faqToDelete, setFaqToDelete] = useState(null);

  // Handles the confirmation of FAQ deletion
  // Filters out the FAQ at the stored index and resets the deletion state
  const confirmDeleteFaq = () => {
    // Guard clause: exit if no FAQ is marked for deletion
    if (faqToDelete === null) return;

    // Update the content state by filtering out the FAQ at the target index
    setContent((current) => ({
      ...current,
      faqs: current.faqs.filter((_, faqIndex) => faqIndex !== faqToDelete),
    }));
    // Reset the deletion dialog state after removal
    setFaqToDelete(null);
  };

  return (
    <section className="settings-pane settings-support-pane">
      {/* Render the pane header with the FAQ section identifier */}
      {renderPaneHeader('FAQ', 'faqs')}

      {/* Conditional rendering based on admin privileges and edit mode */}
      {isAdmin && editMode ? (
        <>
          {/* Editor interface for managing FAQ entries */}
          <div className="faq-editor-list">
            {/* Map through each FAQ to display its editing controls */}
            {content.faqs.map((faq, index) => (
              <div className="faq-editor" key={faq._id || index}>
                {/* Header section displaying the FAQ number and delete action */}
                <div className="faq-editor-header">
                  <strong>FAQ {index + 1}</strong>
                  {/* Delete button that triggers the confirmation dialog */}
                  <button
                    className="faq-delete-button"
                    type="button"
                    onClick={() => setFaqToDelete(index)}
                    aria-label={`Delete FAQ ${index + 1}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete
                  </button>
                </div>
                {/* Input field for editing the FAQ question */}
                <input
                  value={faq.question}
                  onChange={(event) => {
                    // Create a shallow copy of the FAQs array for immutability
                    const faqs = [...content.faqs];
                    // Update the specific FAQ's question while preserving other properties
                    faqs[index] = { ...faqs[index], question: event.target.value };
                    // Update the entire content state with the modified FAQs array
                    setContent((current) => ({ ...current, faqs }));
                  }}
                  placeholder="Question"
                />
                {/* Textarea field for editing the FAQ answer */}
                <textarea
                  value={faq.answer}
                  onChange={(event) => {
                    // Create a shallow copy of the FAQs array for immutability
                    const faqs = [...content.faqs];
                    // Update the specific FAQ's answer while preserving other properties
                    faqs[index] = { ...faqs[index], answer: event.target.value };
                    // Update the entire content state with the modified FAQs array
                    setContent((current) => ({ ...current, faqs }));
                  }}
                  placeholder="Answer"
                  rows={4}
                />
              </div>
            ))}
          </div>

          {/* Button to add a new empty FAQ entry to the list */}
          <button
            className="secondary-action settings-secondary"
            type="button"
            onClick={() =>
              setContent((current) => ({
                ...current,
                faqs: [...current.faqs, { question: '', answer: '' }],
              }))
            }
          >
            Add FAQ
          </button>

          {/* Save button that triggers the content save operation for FAQs */}
          <button className="auth-submit settings-action" type="button" onClick={() => onContentSave('faqs')}>
            Save
          </button>

          {/* Display the status of the FAQ save operation */}
          {renderStatus('faqs')}
        </>
      ) : (
        // Read-only display mode for non-admin users or when not in edit mode
        <div className="faq-list">
          {/* Conditionally render empty state or FAQ list */}
          {content.faqs.length === 0 ? (
            <p className="settings-empty">FAQ has not been added yet.</p>
          ) : (
            // Map through each FAQ to display as an expandable accordion item
            content.faqs.map((faq, index) => (
              <article key={faq._id || faq.question}>
                {/* Accordion header button that toggles the display of the answer */}
                <button type="button" onClick={() => setOpenFaq(openFaq === index ? '' : index)}>
                  <span>{faq.question}</span>
                  {/* Chevron icon that rotates when the FAQ is expanded */}
                  <ChevronDown
                    className={openFaq === index ? 'faq-chevron open' : 'faq-chevron'}
                    size={18}
                    aria-hidden="true"
                  />
                </button>
                {/* Conditionally rendered answer section when the FAQ is expanded */}
                {openFaq === index && <p>{faq.answer}</p>}
              </article>
            ))
          )}
        </div>
      )}

      {/* Deletion confirmation dialog - rendered conditionally when an FAQ is marked for deletion */}
      {faqToDelete !== null && (
        <div className="faq-dialog-backdrop" role="presentation" onMouseDown={() => setFaqToDelete(null)}>
          <div
            className="faq-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="faq-delete-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* Icon section of the dialog */}
            <div className="faq-dialog-icon">
              <Trash2 size={22} aria-hidden="true" />
            </div>
            {/* Dialog content with title and descriptive message */}
            <div>
              <h3 id="faq-delete-title">Delete this FAQ?</h3>
              <p>
                This FAQ will be removed from the editor. Click Save afterward to publish the change.
              </p>
            </div>
            {/* Action buttons for canceling or confirming the deletion */}
            <div className="faq-dialog-actions">
              <button type="button" onClick={() => setFaqToDelete(null)}>
                Cancel
              </button>
              <button type="button" onClick={confirmDeleteFaq}>
                <Trash2 size={16} aria-hidden="true" />
                Delete FAQ
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Default export registers the primary value.
export default FaqSettings;
