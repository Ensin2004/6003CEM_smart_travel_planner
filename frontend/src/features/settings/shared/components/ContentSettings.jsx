/**
 * Settings module.
 * Exports and local helpers keep related behavior in a single module.
 */

// ===== CONTENT SETTINGS COMPONENT =====
// Renders the content settings pane for editing or viewing privacy policy and terms
// Supports both admin edit mode and read-only display for regular users
function ContentSettings({ content, editKey, editMode, isAdmin, onContentChange, onContentSave, renderPaneHeader, renderStatus, title }) {
  return (
    <section className="settings-pane">
      {/* Pane header with title and optional edit button for admin users */}
      {renderPaneHeader(title, editKey)}
      
      {/* Admin edit mode: shows textarea with save functionality */}
      {isAdmin && editMode ? (
        <>
          <textarea
            value={content[editKey]}
            onChange={(event) => onContentChange(editKey, event.target.value)}
            rows={10}
          />
          <button className="auth-submit settings-action" type="button" onClick={() => onContentSave(editKey)}>
            Save
          </button>
          {/* Displays status messages specific to this content section */}
          {renderStatus(editKey)}
        </>
      ) : (
        /* Read-only display: shows content or empty state message */
        <p className={content[editKey] ? 'settings-readable' : 'settings-empty'}>
          {content[editKey] || `${title} has not been added yet.`}
        </p>
      )}
    </section>
  );
}

// ===== EXPORT =====
// Default export registers the primary ContentSettings component
export default ContentSettings;