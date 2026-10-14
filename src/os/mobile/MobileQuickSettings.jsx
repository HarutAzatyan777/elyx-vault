import React, { useRef } from 'react';
import { useFlyoutFocus } from '../hooks/useFlyoutFocus.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import SystemControls from '../shell/SystemControls.jsx';
import NotificationsFlyout from '../shell/NotificationsFlyout.jsx';
import { useState } from 'react';
import { MOBILE_NAV_STYLES, MOBILE_THEMES } from './types.js';
import styles from './MobileShell.module.css';

export function MobileQuickSettings({
  isOpen,
  onClose,
  theme = MOBILE_THEMES.IOS,
  onToggleTheme,
  navStyle = MOBILE_NAV_STYLES.GESTURE_BAR,
  onToggleNavStyle,
  isRTDBConnected = false,
  isVaultUnlocked = false,
  onUnlockVault,
  onLockVault,
  onSwitchToDesktop,
  onSwitchToClassic,
  onLogout,
  user,
}) {
  const ref = useRef(null);
  const { theme: colorTheme, toggleTheme } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  useFlyoutFocus(isOpen && !notificationsOpen, ref, onClose);
  if (!isOpen) return null;

  const userName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <div
      className={styles.quickSettingsOverlay}
      onClick={onClose}
      role="dialog"
      aria-label="Quick Settings Shade"
    >
      <div ref={ref} className={styles.quickSettingsSheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHandle} onClick={onClose} />

        {/* User Card */}
        <div className={styles.quickUserCard}>
          <div className={styles.quickAvatarCircle}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className={styles.quickUserInfo}>
            <span className={styles.quickUserName}>{userName}</span>
            <span className={styles.quickUserEmail}>{user?.email || 'Cloud User'}</span>
          </div>
          <button
            type="button"
            className={styles.quickCloseBtn}
            onClick={onClose}
            aria-label="Close Quick Settings"
          >
            ×
          </button>
        </div>

        {/* Quick Tiles Grid */}
        <div className={styles.quickTilesGrid}>
          {/* Tile 1: Mobile Style (iOS vs Android) */}
          <button
            type="button"
            className={`${styles.quickTile} ${theme === MOBILE_THEMES.IOS ? styles.tileActive : ''}`}
            onClick={onToggleTheme}
          >
            <span className={styles.tileIcon}>🎨</span>
            <div className={styles.tileTexts}>
              <span className={styles.tileLabel}>OS Style</span>
              <span className={styles.tileValue}>
                {theme === MOBILE_THEMES.IOS ? 'Apple iOS' : 'Android Material'}
              </span>
            </div>
          </button>

          {/* Tile 2: Elyx Vault Lock */}
          <button
            type="button"
            className={`${styles.quickTile} ${isVaultUnlocked ? styles.tileWarning : styles.tileActive}`}
            onClick={() => {
              if (isVaultUnlocked) onLockVault?.();
              else onUnlockVault?.();
            }}
          >
            <span className={styles.tileIcon}>{isVaultUnlocked ? '🔓' : '🔒'}</span>
            <div className={styles.tileTexts}>
              <span className={styles.tileLabel}>Security Vault</span>
              <span className={styles.tileValue}>{isVaultUnlocked ? 'Decrypted' : 'Locked'}</span>
            </div>
          </button>

          {/* Tile 3: RTDB Live Connection */}
          <div className={`${styles.quickTile} ${isRTDBConnected ? styles.tileActive : ''}`}>
            <span className={styles.tileIcon}>⚡</span>
            <div className={styles.tileTexts}>
              <span className={styles.tileLabel}>Realtime DB</span>
              <span className={styles.tileValue}>{isRTDBConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>

          {/* Tile 4: Navigation Style (Gesture Bar vs 3-Button) */}
          <button
            type="button"
            className={`${styles.quickTile} ${navStyle === MOBILE_NAV_STYLES.GESTURE_BAR ? styles.tileActive : ''}`}
            onClick={onToggleNavStyle}
          >
            <span className={styles.tileIcon}>📱</span>
            <div className={styles.tileTexts}>
              <span className={styles.tileLabel}>Navigation</span>
              <span className={styles.tileValue}>
                {navStyle === MOBILE_NAV_STYLES.GESTURE_BAR ? 'Gesture Bar' : '3-Button Bar'}
              </span>
            </div>
          </button>

          {/* Tile 5: Switch to Desktop OS Shell */}
          <button
            type="button"
            className={styles.quickTile}
            onClick={() => {
              onClose();
              onSwitchToDesktop?.();
            }}
          >
            <span className={styles.tileIcon}>🖥️</span>
            <div className={styles.tileTexts}>
              <span className={styles.tileLabel}>Desktop Shell</span>
              <span className={styles.tileValue}>Desktop View</span>
            </div>
          </button>

          {/* Tile 6: Switch to Classic Dashboard */}
          <button
            type="button"
            className={styles.quickTile}
            onClick={() => {
              onClose();
              onSwitchToClassic?.();
            }}
          >
            <span className={styles.tileIcon}>📊</span>
            <div className={styles.tileTexts}>
              <span className={styles.tileLabel}>Classic View</span>
              <span className={styles.tileValue}>Web Dashboard</span>
            </div>
          </button>
        </div>

        <button type="button" onClick={() => { onClose(); window.dispatchEvent(new Event('elyx:open-settings')); }}>System Settings</button>
        <button type="button" onClick={toggleTheme}>Theme: {colorTheme}</button>
        <button type="button" onClick={() => setNotificationsOpen(true)}>Notifications</button>
        <NotificationsFlyout isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
        <SystemControls />
        {/* Bottom Actions */}
        <div className={styles.quickSettingsFooter}>
          <button
            type="button"
            className={styles.quickLogoutBtn}
            onClick={() => {
              onClose();
              onLogout?.();
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileQuickSettings;
