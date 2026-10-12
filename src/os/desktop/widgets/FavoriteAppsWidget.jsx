import React from 'react';
import { getPinnedDockApps } from '../../registry/appRegistry.js';
import styles from './Widgets.module.css';

export function FavoriteAppsWidget({ onOpenApp, onRemove }) {
  const favoriteApps = getPinnedDockApps().slice(0, 6);

  return (
    <div className={styles.widgetCard} role="region" aria-label="Favorite Applications">
      <div className={styles.widgetHeader}>
        <div className={styles.widgetHeaderTitle}>
          <span className={styles.widgetIcon}>⭐</span>
          <span>Favorite Apps</span>
        </div>
        {onRemove && (
          <button
            type="button"
            className={styles.widgetCloseBtn}
            onClick={onRemove}
            title="Remove widget"
            aria-label="Remove Favorite Apps widget"
          >
            ×
          </button>
        )}
      </div>

      <div className={styles.favGrid}>
        {favoriteApps.map((app) => (
          <button
            key={app.id}
            type="button"
            className={styles.favAppPill}
            onClick={() => onOpenApp?.(app.id)}
            title={`Open ${app.name}`}
          >
            <div
              className={styles.favAppIcon}
              style={{ backgroundColor: app.icon?.badgeColor || '#6366f1' }}
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox={app.icon?.viewBox || '0 0 24 24'}
                width="15"
                height="15"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={app.icon?.path}
                />
              </svg>
            </div>
            <span className={styles.favAppName}>{app.shortName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default FavoriteAppsWidget;
