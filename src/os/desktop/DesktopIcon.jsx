import React from 'react';
import styles from './DesktopIcon.module.css';

export function DesktopIcon({
  app,
  isSelected = false,
  onSelect,
  onLaunch,
}) {
  const handleClick = (e) => {
    e.stopPropagation();
    onSelect?.(app.id, e.shiftKey || e.metaKey || e.ctrlKey);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    onLaunch?.(app.id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onLaunch?.(app.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${app.name} application`}
      aria-selected={isSelected}
      className={`${styles.iconContainer} ${isSelected ? styles.isSelected : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.iconVisualWrapper}>
        <div
          className={styles.iconBadge}
          style={{
            backgroundColor: app.icon?.badgeColor || 'var(--elyx-brand-primary, #6366f1)',
          }}
        >
          <svg
            fill="none"
            stroke="currentColor"
            viewBox={app.icon?.viewBox || '0 0 24 24'}
            className={styles.iconSvg}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={app.icon?.path}
            />
          </svg>
        </div>

        {app.requiresMasterPassword && (
          <div className={styles.lockIndicator} title="Requires Master Password">
            <svg fill="currentColor" viewBox="0 0 20 20" width="10" height="10">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>

      <span className={styles.iconLabel}>{app.name}</span>
    </div>
  );
}

export default DesktopIcon;
