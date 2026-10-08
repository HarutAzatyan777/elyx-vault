import React, { useEffect, useState } from 'react';
import styles from './DailyWorkspace.module.css';

export function SessionStatusBanner({
  activeSession,
  selectedPreset,
  onStartWork,
  onEndWork,
  presets,
  onSelectPreset,
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Real-time ticker for active session timer
  useEffect(() => {
    if (!activeSession?.startTime) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      const start = activeSession.startTime;
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - start) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.startTime]);

  // Format elapsed time as HH:MM:SS
  const formatTimer = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs > 0 ? String(hrs).padStart(2, '0') + ':' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className={`${styles.statusBanner} ${activeSession ? styles.statusBannerActive : ''}`}>
      <div className={styles.statusInfo}>
        <div className={styles.statusBadgeGroup}>
          <span className={`${styles.statusIndicator} ${activeSession ? styles.statusActive : styles.statusInactive}`}>
            <span className={styles.indicatorDot} />
            {activeSession ? 'WORKSPACE ACTIVE' : 'NO ACTIVE SESSION'}
          </span>

          {activeSession && (
            <span className={styles.timerDisplay}>
              ⏱️ {formatTimer(elapsedSeconds)}
            </span>
          )}
        </div>

        <div className={styles.statusDetails}>
          {activeSession ? (
            <div>
              <h3 className={styles.statusTitle}>
                Currently running: <span style={{ color: activeSession.presetColor || '#8b5cf6' }}>{activeSession.presetName}</span>
              </h3>
              <p className={styles.statusSub}>
                Session started at {new Date(activeSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Click End Work when finished to record session metrics.
              </p>
            </div>
          ) : (
            <div>
              <h3 className={styles.statusTitle}>Ready to start your morning routine?</h3>
              <p className={styles.statusSub}>
                Select a preset below and click <strong>Start Work</strong> to open all your configured web applications and tools simultaneously.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={styles.statusControls}>
        {!activeSession && presets && presets.length > 0 && (
          <select
            className={styles.presetSelectDropdown}
            value={selectedPreset?.id || ''}
            onChange={(e) => onSelectPreset(e.target.value)}
            aria-label="Select workspace preset"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.urls?.length || 0} links)
              </option>
            ))}
          </select>
        )}

        {activeSession ? (
          <button
            type="button"
            className={styles.endWorkBtn}
            onClick={onEndWork}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>End Work</span>
          </button>
        ) : (
          <button
            type="button"
            className={styles.startWorkBtn}
            onClick={() => onStartWork(selectedPreset)}
            disabled={!selectedPreset}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Start Work ({selectedPreset?.urls?.length || 0})</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default SessionStatusBanner;
