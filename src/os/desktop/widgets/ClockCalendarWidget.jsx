import React, { useEffect, useState } from 'react';
import styles from './Widgets.module.css';

export function ClockCalendarWidget({ onRemove }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const seconds = String(time.getSeconds()).padStart(2, '0');
  const dayName = time.toLocaleDateString([], { weekday: 'long' });
  const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  const hourNum = time.getHours();
  const greeting =
    hourNum < 12
      ? 'Good morning'
      : hourNum < 18
      ? 'Good afternoon'
      : 'Good evening';

  return (
    <div className={styles.widgetCard} role="region" aria-label="Clock and Calendar">
      <div className={styles.widgetHeader}>
        <div className={styles.widgetHeaderTitle}>
          <span className={styles.widgetIcon}>🕒</span>
          <span>Time & Date</span>
        </div>
        {onRemove && (
          <button
            type="button"
            className={styles.widgetCloseBtn}
            onClick={onRemove}
            title="Remove widget"
            aria-label="Remove Clock widget"
          >
            ×
          </button>
        )}
      </div>

      <div className={styles.clockBody}>
        <div className={styles.greetingText}>{greeting}</div>
        <div className={styles.clockDisplay}>
          <span className={styles.clockTime}>{hours}</span>
          <span className={styles.clockSeconds}>:{seconds}</span>
        </div>
        <div className={styles.dateDisplay}>
          <span className={styles.dayBadge}>{dayName}</span>
          <span className={styles.dateText}>{dateStr}</span>
        </div>
      </div>
    </div>
  );
}

export default ClockCalendarWidget;
