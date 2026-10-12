import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import styles from './TopBar.module.css';

export function ControlCenter({
  isOpen,
  onClose,
  user,
  access,
  onLogout,
  onLockVault,
  isVaultUnlocked,
  onOpenSettings,
}) {
  const { theme, toggleTheme } = useTheme();
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

  const email = user?.email || 'user@elyx.local';
  const name = user?.displayName || email.split('@')[0];
  const role = access?.role || 'viewer';

  return (
    <div
      ref={flyoutRef}
      className={styles.controlCenterFlyout}
      style={{ top: 'calc(var(--elyx-topbar-height, 38px) + 6px)', right: '8px' }}
      role="dialog"
      aria-label="System Control Center"
    >
      {/* User Card */}
      <div className={styles.userSection}>
        <div className={styles.userAvatarLarge}>
          {name.charAt(0).toUpperCase()}
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{name}</div>
          <div className={styles.userEmail}>{email}</div>
          <span className={styles.userRoleBadge}>{role}</span>
        </div>
      </div>

      <div className={styles.dropdownDivider} />

      {/* Control Toggles */}
      <div className={styles.controlGrid}>
        <button
          type="button"
          className={styles.controlPill}
          onClick={toggleTheme}
          title="Toggle Dark / Light Theme"
        >
          <span className={styles.controlIcon}>{theme === 'light' ? '☀️' : '🌙'}</span>
          <div className={styles.controlPillText}>
            <span className={styles.controlTitle}>Theme</span>
            <span className={styles.controlSub}>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
        </button>

        <button
          type="button"
          className={styles.controlPill}
          onClick={() => {
            if (isVaultUnlocked) onLockVault();
            onClose();
          }}
          title={isVaultUnlocked ? 'Lock Vault immediately' : 'Vault is locked'}
        >
          <span className={styles.controlIcon}>{isVaultUnlocked ? '🔓' : '🔒'}</span>
          <div className={styles.controlPillText}>
            <span className={styles.controlTitle}>Vault Key</span>
            <span className={styles.controlSub}>{isVaultUnlocked ? 'Decrypted (Active)' : 'Locked'}</span>
          </div>
        </button>
      </div>

      <div className={styles.dropdownDivider} />

      {/* Bottom Actions */}
      <div className={styles.flyoutActions}>
        <button
          type="button"
          className={styles.flyoutActionBtn}
          onClick={() => {
            onOpenSettings();
            onClose();
          }}
        >
          ⚙️ Settings
        </button>
        <button
          type="button"
          className={`${styles.flyoutActionBtn} ${styles.dangerBtn}`}
          onClick={() => {
            onLogout();
            onClose();
          }}
        >
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}

export default ControlCenter;
