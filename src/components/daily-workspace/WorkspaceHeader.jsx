import React, { useEffect, useState } from 'react';
import styles from './DailyWorkspace.module.css';

export function WorkspaceHeader({ userEmail, selectedPreset, activeSession }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Greeting based on current hour
  const hour = now.getHours();
  let greeting = 'Good Morning';
  if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
  else if (hour >= 17) greeting = 'Good Evening';

  const userName = userEmail ? userEmail.split('@')[0] : 'Developer';
  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <div className={styles.headerBanner}>
      <div className={styles.headerMain}>
        <div className={styles.greetingGroup}>
          <span className={styles.greetingSub}>{formattedDate}</span>
          <h1 className={styles.greetingTitle}>
            {greeting}, <span className={styles.userNameHighlight}>{userName}</span> 👋
          </h1>
          <p className={styles.headerSubtitle}>
            Launch your complete dev setup, manage workspace presets, and start your productive day.
          </p>
        </div>

        <div className={styles.clockCard}>
          <div className={styles.clockTime}>{formattedTime}</div>
          <div className={styles.clockLabel}>
            <span className={styles.livePulse} /> Live Local Time
          </div>
        </div>
      </div>

      {activeSession ? (
        <div className={styles.activePill}>
          <span className={styles.activeDot} />
          <span>Active Session: <strong>{activeSession.presetName}</strong></span>
        </div>
      ) : selectedPreset ? (
        <div className={styles.selectedPill}>
          <span>Selected Preset: <strong>{selectedPreset.name}</strong> ({selectedPreset.urls?.length || 0} links)</span>
        </div>
      ) : null}
    </div>
  );
}

export default WorkspaceHeader;
