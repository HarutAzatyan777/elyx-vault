import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../hooks/useNotifications.js';
import styles from './TopBar.module.css';

export function NotificationsFlyout({ isOpen, onClose }) {
  const { notifications, dismiss, clearAll } = useNotifications();
  const flyoutRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleDown = (e) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={flyoutRef}
      className={styles.notificationsFlyout}
      style={{ top: 'calc(var(--elyx-topbar-height, 38px) + 6px)', right: '110px' }}
      role="dialog"
      aria-label="Notification Center"
    >
      <div className={styles.notifHeader}>
        <span className={styles.notifTitle}>Notifications</span>
        {notifications.length > 0 && (
          <button
            type="button"
            className={styles.clearAllBtn}
            onClick={clearAll}
          >
            Clear All
          </button>
        )}
      </div>

      <div className={styles.notifList}>
        {notifications.length === 0 ? (
          <div className={styles.emptyNotifs}>
            <span>No new notifications</span>
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={styles.notifItem}>
              <div className={styles.notifItemHeader}>
                <span className={styles.notifItemTitle}>{n.title}</span>
                <button
                  type="button"
                  className={styles.notifDismissBtn}
                  onClick={() => dismiss(n.id)}
                  title="Dismiss notification"
                >
                  ×
                </button>
              </div>
              {n.message && <p className={styles.notifItemMessage}>{n.message}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationsFlyout;
