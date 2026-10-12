import React, { useEffect, useState } from 'react';
import { MOBILE_THEMES } from './types.js';
import styles from './MobileShell.module.css';

export function MobileStatusBar({
  theme = MOBILE_THEMES.IOS,
  isRTDBConnected = false,
  isVaultUnlocked = false,
  currentTrack = null,
  isPlaying = false,
  onToggleQuickSettings,
  onUnlockVault,
  onLockVault,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <header
      className={`${styles.statusBar} ${theme === MOBILE_THEMES.ANDROID ? styles.statusBarAndroid : styles.statusBarIOS}`}
      onClick={onToggleQuickSettings}
      role="banner"
      aria-label="Mobile Status Bar"
    >
      {/* Left: Clock */}
      <div className={styles.statusLeft}>
        <span className={styles.statusClock}>{timeString}</span>
      </div>

      {/* Center: Dynamic Island (iOS) or Punch-hole (Android) */}
      <div className={styles.statusCenter}>
        {theme === MOBILE_THEMES.IOS ? (
          <div
            className={`${styles.dynamicIsland} ${currentTrack && isPlaying ? styles.dynamicIslandExpanded : ''}`}
            title="Elyx Dynamic Island"
          >
            {currentTrack && isPlaying ? (
              <div className={styles.islandMusic}>
                <span className={styles.islandMusicWave}>🎵</span>
                <span className={styles.islandMusicTitle}>{currentTrack.title}</span>
              </div>
            ) : (
              <span className={styles.islandDot} />
            )}
          </div>
        ) : (
          <div className={styles.punchHoleCamera} title="Camera punch-hole" />
        )}
      </div>

      {/* Right: Network, RTDB, Vault Status & Battery */}
      <div className={styles.statusRight}>
        {/* RTDB Cloud Badge */}
        <span
          className={`${styles.statusIconBadge} ${isRTDBConnected ? styles.badgeOnline : styles.badgeOffline}`}
          title={isRTDBConnected ? 'Cloud Realtime DB: Connected' : 'Cloud Realtime DB: Offline'}
        >
          {isRTDBConnected ? '●' : '○'}
        </span>

        {/* Vault Lock Status */}
        <button
          type="button"
          className={styles.statusVaultBtn}
          onClick={(e) => {
            e.stopPropagation();
            if (isVaultUnlocked) {
              onLockVault?.();
            } else {
              onUnlockVault?.();
            }
          }}
          title={isVaultUnlocked ? 'Vault Decrypted (Tap to Lock)' : 'Vault Locked (Tap to Unlock)'}
          aria-label={isVaultUnlocked ? 'Lock Vault' : 'Unlock Vault'}
        >
          {isVaultUnlocked ? '🔓' : '🔒'}
        </button>

        {/* WiFi & Cellular / 5G Icons */}
        <span className={styles.statusSignal}>5G</span>

        {/* Battery Indicator */}
        <div className={styles.batteryIcon} title="100% Battery">
          <div className={styles.batteryLevel} />
        </div>
      </div>
    </header>
  );
}

export default MobileStatusBar;
