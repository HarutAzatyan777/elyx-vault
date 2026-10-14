import { useOS } from '../hooks/useOS.js';
import { useFlyoutFocus } from '../hooks/useFlyoutFocus.js';
import React, { useRef } from 'react';
import { useNotifications } from '../hooks/useNotifications.js';
import styles from './TopBar.module.css';

export function NotificationsFlyout({ isOpen, onClose }) {
  const { notifications, dismiss, clearAll, markRead, unreadCount } = useNotifications();
  const { settings } = useOS();
  const flyoutRef = useRef(null);

  useFlyoutFocus(isOpen, flyoutRef, onClose);

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
        <span className={styles.notifTitle}>Notifications · {unreadCount} unread</span><button type="button" onClick={() => markRead()}>Mark all read</button><button type="button" onClick={onClose} aria-label="Close notification center">×</button>
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
                <span className={styles.notifItemTitle}>{!n.read && <span aria-label="Unread">● </span>}{settings.notificationPrivacy ? "New notification" : n.title}</span>
                <button
                  type="button"
                  className={styles.notifDismissBtn}
                  onClick={() => dismiss(n.id)}
                  aria-label="Clear notification"
                >
                  ×
                </button>
              </div>
              {!settings.notificationPrivacy && n.message && <p className={styles.notifItemMessage}>{n.message}</p>}
              <small>{n.category} · {new Date(n.timestamp).toLocaleString()}</small>
              {!n.read && <button type="button" onClick={() => markRead(n.id)}>Mark as read</button>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationsFlyout;
