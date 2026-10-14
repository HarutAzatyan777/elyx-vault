import React, { useEffect, useState } from 'react';
import styles from './Widgets.module.css';


export function QuickNotesWidget({ onOpenApp, onRemove }) {
  const [content, setContent] = useState('');
  const savedStatus = 'Session draft';
  useEffect(() => {
    const clear = () => setContent('');
    window.addEventListener('elyx:vault-locked', clear);
    return () => window.removeEventListener('elyx:vault-locked', clear);
  }, []);

  const handleChange = (e) => {
    setContent(e.target.value);
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
        placeholder="Session draft. Locking clears it; save important notes in Notepad."
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
