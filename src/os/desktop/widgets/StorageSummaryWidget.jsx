import React from 'react';
import styles from './Widgets.module.css';

export function StorageSummaryWidget({
  projectsCount = 0,
  devicesCount = 0,
  isRTDBConnected = false,
  isVaultUnlocked = false,
  role = 'viewer',
  onOpenApp,
  onRemove,
}) {
  return (
    <div className={styles.widgetCard} role="region" aria-label="Storage and Security Summary">
      <div className={styles.widgetHeader}>
        <div className={styles.widgetHeaderTitle}>
          <span className={styles.widgetIcon}>🔐</span>
          <span>Vault & Security</span>
        </div>
        {onRemove && (
          <button
            type="button"
            className={styles.widgetCloseBtn}
            onClick={onRemove}
            title="Remove widget"
            aria-label="Remove Storage widget"
          >
            ×
          </button>
        )}
      </div>

      <div className={styles.storageGrid}>
        <div
          className={styles.storageMetric}
          onClick={() => onOpenApp?.('general')}
          title="Open Encrypted Projects"
        >
          <span className={styles.metricNumber}>{projectsCount}</span>
          <span className={styles.metricLabel}>Encrypted Projects</span>
        </div>

        <div
          className={styles.storageMetric}
          onClick={() => onOpenApp?.('devices')}
          title="Open Device Manager"
        >
          <span className={styles.metricNumber}>{devicesCount}</span>
          <span className={styles.metricLabel}>Enrolled Devices</span>
        </div>
      </div>

      <div className={styles.securityPills}>
        <div className={styles.securityPill}>
          <span className={`${styles.statusDot} ${isVaultUnlocked ? styles.dotGreen : styles.dotAmber}`} />
          <span>{isVaultUnlocked ? 'Vault: Decrypted' : 'Vault: Locked'}</span>
        </div>

        <div className={styles.securityPill}>
          <span className={`${styles.statusDot} ${isRTDBConnected ? styles.dotGreen : styles.dotDim}`} />
          <span>{isRTDBConnected ? 'RTDB: Live' : 'RTDB: Standby'}</span>
        </div>

        <div className={styles.securityPill}>
          <span className={styles.statusBadgeText}>Role: {role}</span>
        </div>
      </div>
    </div>
  );
}

export default StorageSummaryWidget;
