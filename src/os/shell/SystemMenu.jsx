import React, { useEffect, useRef } from 'react';
import styles from './TopBar.module.css';

export function SystemMenu({
  isOpen,
  onClose,
  onOpenSettings,
  onLockVault,
  onSwitchToClassic,
  onLogout,
  onOpenAbout,
  isVaultUnlocked,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
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
      ref={menuRef}
      className={styles.dropdownMenu}
      style={{ top: 'calc(var(--elyx-topbar-height, 38px) + 4px)', left: '8px' }}
      role="menu"
      aria-label="Elyx OS System Menu"
    >
      <button
        type="button"
        className={styles.dropdownItem}
        onClick={() => {
          onOpenAbout();
          onClose();
        }}
      >
        <span className={styles.itemIcon}>ℹ️</span>
        <span>About Elyx OS 1.0</span>
      </button>

      <div className={styles.dropdownDivider} />

      <button
        type="button"
        className={styles.dropdownItem}
        onClick={() => {
          onOpenSettings();
          onClose();
        }}
      >
        <span className={styles.itemIcon}>⚙️</span>
        <span>System Settings…</span>
      </button>

      {isVaultUnlocked && (
        <button
          type="button"
          className={styles.dropdownItem}
          onClick={() => {
            onLockVault();
            onClose();
          }}
        >
          <span className={styles.itemIcon}>🔒</span>
          <span>Lock Vault (Zero-Knowledge)</span>
        </button>
      )}

      <button
        type="button"
        className={styles.dropdownItem}
        onClick={() => {
          onSwitchToClassic();
          onClose();
        }}
      >
        <span className={styles.itemIcon}>⚡</span>
        <span>Switch to Classic Dashboard</span>
      </button>

      <div className={styles.dropdownDivider} />

      <button
        type="button"
        className={`${styles.dropdownItem} ${styles.dropdownDanger}`}
        onClick={() => {
          onLogout();
          onClose();
        }}
      >
        <span className={styles.itemIcon}>🚪</span>
        <span>Log Out</span>
      </button>
    </div>
  );
}

export default SystemMenu;
