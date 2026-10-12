import React, { useEffect, useState } from 'react';
import styles from './Widgets.module.css';

const QUICK_NOTE_STORAGE_KEY = 'elyx_desktop_quick_note';

export function QuickNotesWidget({ onOpenApp, onRemove }) {
  const [content, setContent] = useState(() => {
    try {
      return localStorage.getItem(QUICK_NOTE_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [savedStatus, setSavedStatus] = useState('Saved');

  useEffect(() => {
    try {
      localStorage.setItem(QUICK_NOTE_STORAGE_KEY, content);
      setSavedStatus('Saved');
    } catch {
      setSavedStatus('Draft');
    }
  }, [content]);

  const handleChange = (e) => {
    setContent(e.target.value);
    setSavedStatus('Saving…');
  };

  return (
    <div className={styles.widgetCard} role="region" aria-label="Quick Notes">
      <div className={styles.widgetHeader}>
        <div className={styles.widgetHeaderTitle}>
          <span className={styles.widgetIcon}>📝</span>
          <span>Quick Note</span>
        </div>
        <div className={styles.widgetHeaderActions}>
          <span className={styles.savedStatusText}>{savedStatus}</span>
          {onRemove && (
            <button
              type="button"
              className={styles.widgetCloseBtn}
              onClick={onRemove}
              title="Remove widget"
              aria-label="Remove Quick Note widget"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <textarea
        className={styles.quickNoteTextarea}
        value={content}
        onChange={handleChange}
        placeholder="Type a quick scratchpad note or paste a snippet…"
        rows={4}
        aria-label="Quick note content"
      />

      <div className={styles.quickNoteFooter}>
        <button
          type="button"
          className={styles.openNotepadBtn}
          onClick={() => onOpenApp?.('notepad')}
        >
          Open in Notepad ➔
        </button>
      </div>
    </div>
  );
}

export default QuickNotesWidget;
