/**
 * Settings module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { ChevronDown } from 'lucide-react';
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
  return (
    <section className="settings-pane settings-support-pane">
      {renderPaneHeader('FAQ', 'faqs')}
      {isAdmin && editMode ? (
        <>
          <div className="faq-editor-list">
            {content.faqs.map((faq, index) => (
              <div className="faq-editor" key={faq._id || index}>
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
    </section>
  );
}
// Default export registers the primary  value.
export default FaqSettings;
