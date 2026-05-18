function ContentSettings({ content, editKey, editMode, isAdmin, onContentChange, onContentSave, renderPaneHeader, renderStatus, title }) {
  return (
    <section className="settings-pane">
      {renderPaneHeader(title, editKey)}
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
          {renderStatus(editKey)}
        </>
      ) : (
        <p className={content[editKey] ? 'settings-readable' : 'settings-empty'}>
          {content[editKey] || `${title} has not been added yet.`}
        </p>
      )}
    </section>
  );
}

export default ContentSettings;
