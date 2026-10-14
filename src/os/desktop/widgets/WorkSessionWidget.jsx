import React, { useEffect, useState } from 'react';
import { useSystemStatus } from '../../hooks/useSystemStatus.js';
import styles from './Widgets.module.css';

export function WorkSessionWidget({ onOpenApp, onRemove }) {
  const { session: activeSession } = useSystemStatus();
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  useEffect(() => {
    if (!activeSession?.startTime) {
      setElapsedTime('00:00:00');
      return;
    }

    const interval = setInterval(() => {
      try {
        const start = activeSession.startTime?.toDate
          ? activeSession.startTime.toDate()
          : new Date(activeSession.startTime);
        const diffMs = Math.max(0, Date.now() - start.getTime());
        const hours = Math.floor(diffMs / 3600000);
        const minutes = Math.floor((diffMs % 3600000) / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);

        setElapsedTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      } catch {
        setElapsedTime('00:00:00');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const presetName =
    activeSession?.presetName || 'Custom Session';

  return (
    <div className={styles.widgetCard} role="region" aria-label="Work Session">
      <div className={styles.widgetHeader}>
        <div className={styles.widgetHeaderTitle}>
          <span className={styles.widgetIcon}>⏱️</span>
          <span>Daily Session</span>
        </div>
        {onRemove && (
          <button
            type="button"
            className={styles.widgetCloseBtn}
            onClick={onRemove}
            title="Remove widget"
            aria-label="Remove Session widget"
          >
            ×
          </button>
        )}
      </div>

      <div className={styles.sessionBody}>
        {activeSession ? (
          <div className={styles.sessionActive}>
            <div className={styles.sessionStatusBadge}>
              <span className={styles.pulseDot} />
              <span>Session In Progress</span>
            </div>
            <div className={styles.sessionPresetName}>{presetName}</div>
            <div className={styles.sessionTimer}>{elapsedTime}</div>
          </div>
        ) : (
          <div className={styles.sessionIdle}>
            <p className={styles.sessionIdleText}>No active work session</p>
            <span className={styles.sessionIdleSubtext}>
              Ready to begin your focus block?
            </span>
          </div>
        )}

        <button
          type="button"
          className={styles.widgetActionBtn}
          onClick={() => onOpenApp?.('daily_workspace')}
        >
          {activeSession ? 'Manage Session ➔' : 'Start Daily Session ➔'}
        </button>
      </div>
    </div>
  );
}

export default WorkSessionWidget;
