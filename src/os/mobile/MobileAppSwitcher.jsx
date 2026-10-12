import React from 'react';
import { getAppById } from '../registry/appRegistry.js';
import styles from './MobileShell.module.css';

export function MobileAppSwitcher({
  isOpen,
  onClose,
  runningAppIds = [],
  activeAppId = null,
  onSelectApp,
  onCloseApp,
  onCloseAllApps,
}) {
  if (!isOpen) return null;

  return (
    <div
      className={styles.switcherOverlay}
      onClick={onClose}
      role="dialog"
      aria-label="Mobile Multitasking Switcher"
    >
      <div className={styles.switcherContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.switcherTopBar}>
          <span className={styles.switcherHeading}>Running Apps ({runningAppIds.length})</span>
          {runningAppIds.length > 0 && (
            <button
              type="button"
              className={styles.switcherClearBtn}
              onClick={onCloseAllApps}
            >
              Clear All
            </button>
          )}
        </div>

        {runningAppIds.length === 0 ? (
          <div className={styles.switcherEmpty}>
            <span className={styles.switcherEmptyIcon}>📱</span>
            <span>No running applications</span>
          </div>
        ) : (
          <div className={styles.switcherDeck}>
            {runningAppIds.map((appId) => {
              const app = getAppById(appId);
              if (!app) return null;
              const isActive = appId === activeAppId;

              return (
                <div
                  key={appId}
                  className={`${styles.switcherCard} ${isActive ? styles.switcherCardActive : ''}`}
                  onClick={() => {
                    onSelectApp(appId);
                    onClose();
                  }}
                >
                  <div className={styles.switcherCardHeader}>
                    <div className={styles.switcherCardAppInfo}>
                      <span
                        className={styles.switcherCardBadge}
                        style={{ backgroundColor: app.icon?.badgeColor || '#6366f1' }}
                      >
                        {app.icon?.symbol || '📱'}
                      </span>
                      <span className={styles.switcherCardTitle}>{app.name}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.switcherCardCloseBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseApp(appId);
                      }}
                      title="Close application"
                      aria-label={`Close ${app.name}`}
                    >
                      ×
                    </button>
                  </div>

                  <div className={styles.switcherCardBody}>
                    <div className={styles.switcherCardMockup}>
                      <span className={styles.switcherMockupIcon}>
                        {app.icon?.symbol || '📱'}
                      </span>
                      <span className={styles.switcherMockupDesc}>{app.name} Active</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileAppSwitcher;
