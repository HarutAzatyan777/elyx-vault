import React from 'react';
import styles from './RemoteTerminal.module.css';

export function TerminalToolbar({ onSendInput, onSendCtrlC, onClear }) {
  const handleKeyClick = (keySeq) => {
    onSendInput(keySeq);
  };

  return (
    <div className={styles.terminalToolbar}>
      <button
        type="button"
        className={`${styles.toolbarKeyBtn} ${styles.toolbarKeyDanger}`}
        onClick={onSendCtrlC}
        title="Send SIGINT Interrupt (Ctrl+C)"
      >
        Ctrl+C
      </button>

      <button
        type="button"
        className={styles.toolbarKeyBtn}
        onClick={() => handleKeyClick('\t')}
        title="Tab Autocomplete"
      >
        Tab
      </button>

      <button
        type="button"
        className={styles.toolbarKeyBtn}
        onClick={() => handleKeyClick('\x1b')}
        title="Escape Key"
      >
        Esc
      </button>

      <div className={styles.arrowGroup}>
        <button
          type="button"
          className={styles.toolbarKeyBtn}
          onClick={() => handleKeyClick('\x1b[A')}
          title="Up Arrow (Command History)"
        >
          ↑
        </button>
        <button
          type="button"
          className={styles.toolbarKeyBtn}
          onClick={() => handleKeyClick('\x1b[B')}
          title="Down Arrow (Command History)"
        >
          ↓
        </button>
        <button
          type="button"
          className={styles.toolbarKeyBtn}
          onClick={() => handleKeyClick('\x1b[D')}
          title="Left Arrow"
        >
          ←
        </button>
        <button
          type="button"
          className={styles.toolbarKeyBtn}
          onClick={() => handleKeyClick('\x1b[C')}
          title="Right Arrow"
        >
          →
        </button>
      </div>

      <button
        type="button"
        className={styles.toolbarKeyBtn}
        onClick={onClear}
        title="Clear Terminal Screen"
      >
        Clear Screen
      </button>
    </div>
  );
}

export default TerminalToolbar;
