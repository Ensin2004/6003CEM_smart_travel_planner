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
  const [faqToDelete, setFaqToDelete] = useState(null);
  const confirmDeleteFaq = () => {
    if (faqToDelete === null) return;

    setContent((current) => ({
      ...current,
      faqs: current.faqs.filter((_, faqIndex) => faqIndex !== faqToDelete),
    }));
    setFaqToDelete(null);
  };

  return (
    <section className="settings-pane settings-support-pane">
      {renderPaneHeader('FAQ', 'faqs')}
      {isAdmin && editMode ? (
        <>
          <div className="faq-editor-list">
            {content.faqs.map((faq, index) => (
              <div className="faq-editor" key={faq._id || index}>
                <div className="faq-editor-header">
                  <strong>FAQ {index + 1}</strong>
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
                <input
                  value={faq.question}
                  onChange={(event) => {
                    const faqs = [...content.faqs];
                    faqs[index] = { ...faqs[index], question: event.target.value };
                    setContent((current) => ({ ...current, faqs }));
                  }}
                  placeholder="Question"
                />
                <textarea
                  value={faq.answer}
                  onChange={(event) => {
                    const faqs = [...content.faqs];
                    faqs[index] = { ...faqs[index], answer: event.target.value };
                    setContent((current) => ({ ...current, faqs }));
                  }}
                  placeholder="Answer"
                  rows={4}
                />
              </div>
            ))}
          </div>
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
          <button className="auth-submit settings-action" type="button" onClick={() => onContentSave('faqs')}>
            Save
          </button>
          {renderStatus('faqs')}
        </>
      ) : (
        <div className="faq-list">
          {content.faqs.length === 0 ? (
            <p className="settings-empty">FAQ has not been added yet.</p>
          ) : (
            content.faqs.map((faq, index) => (
              <article key={faq._id || faq.question}>
                <button type="button" onClick={() => setOpenFaq(openFaq === index ? '' : index)}>
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={openFaq === index ? 'faq-chevron open' : 'faq-chevron'}
                    size={18}
                    aria-hidden="true"
                  />
                </button>
                {openFaq === index && <p>{faq.answer}</p>}
              </article>
            ))
          )}
        </div>
      )}
      {faqToDelete !== null && (
        <div className="faq-dialog-backdrop" role="presentation" onMouseDown={() => setFaqToDelete(null)}>
          <div
            className="faq-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="faq-delete-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="faq-dialog-icon">
              <Trash2 size={22} aria-hidden="true" />
            </div>
            <div>
              <h3 id="faq-delete-title">Delete this FAQ?</h3>
              <p>
                This FAQ will be removed from the editor. Click Save afterward to publish the change.
              </p>
            </div>
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
// Default export registers the primary  value.
export default FaqSettings;
