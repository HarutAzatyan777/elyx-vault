import React, { useEffect, useRef, useState } from 'react';
import { WALLPAPER_PRESETS } from './types.js';
import styles from './DesktopContextMenu.module.css';

export function DesktopContextMenu({
  x,
  y,
  onClose,
  currentWallpaperId,
  onChangeWallpaper,
  visibleWidgets,
  onToggleWidget,
  isVaultUnlocked,
  onLockVault,
  onUnlockVault,
  onOpenSettings,
  onSwitchToClassic,
}) {
  const menuRef = useRef(null);
  const [activeSubmenu, setActiveSubmenu] = useState(null); // 'wallpaper' | 'widgets' | null

  // Ensure menu does not overflow viewport
  const [position, setPosition] = useState({ top: y, left: x });

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + rect.width > viewportW - 12) {
      adjustedX = Math.max(12, viewportW - rect.width - 12);
    }
    if (y + rect.height > viewportH - 12) {
      adjustedY = Math.max(12, viewportH - rect.height - 12);
    }

    setPosition({ top: adjustedY, left: adjustedX });
  }, [x, y]);

  // Close on outside click or Escape key
  useEffect(() => {
    const handleDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{ top: position.top, left: position.left }}
      role="menu"
      aria-label="Desktop context menu"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Change Wallpaper Submenu Trigger */}
      <div
        className={styles.menuItemHasSubmenu}
        onMouseEnter={() => setActiveSubmenu('wallpaper')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          type="button"
          className={styles.menuItem}
          role="menuitem"
          aria-haspopup="true"
        >
          <span className={styles.itemIcon}>🖼️</span>
          <span className={styles.itemText}>Change Wallpaper</span>
          <span className={styles.submenuChevron}>›</span>
        </button>

        {activeSubmenu === 'wallpaper' && (
          <div className={styles.submenu} role="menu">
            {WALLPAPER_PRESETS.map((w) => (
              <button
                key={w.id}
                type="button"
                className={`${styles.submenuItem} ${
                  currentWallpaperId === w.id ? styles.activeItem : ''
                }`}
                onClick={() => {
                  onChangeWallpaper(w.id);
                  onClose();
                }}
              >
                <span
                  className={styles.colorDot}
                  style={{ backgroundColor: w.accentColor || '#6366f1' }}
                />
                <span>{w.name}</span>
                {currentWallpaperId === w.id && <span className={styles.checkMark}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Widgets Submenu Trigger */}
      <div
        className={styles.menuItemHasSubmenu}
        onMouseEnter={() => setActiveSubmenu('widgets')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          type="button"
          className={styles.menuItem}
          role="menuitem"
          aria-haspopup="true"
        >
          <span className={styles.itemIcon}>🧩</span>
          <span className={styles.itemText}>Desktop Widgets</span>
          <span className={styles.submenuChevron}>›</span>
        </button>

        {activeSubmenu === 'widgets' && (
          <div className={styles.submenu} role="menu">
            <button
              type="button"
              className={styles.submenuItem}
              onClick={() => onToggleWidget('clock', !visibleWidgets?.clock)}
            >
              <span>Clock & Calendar</span>
              <span className={styles.checkMark}>{visibleWidgets?.clock ? '✓' : ''}</span>
            </button>
            <button
              type="button"
              className={styles.submenuItem}
              onClick={() => onToggleWidget('session', !visibleWidgets?.session)}
            >
              <span>Daily Work Session</span>
              <span className={styles.checkMark}>{visibleWidgets?.session ? '✓' : ''}</span>
            </button>
            <button
              type="button"
              className={styles.submenuItem}
              onClick={() => onToggleWidget('storage', !visibleWidgets?.storage)}
            >
              <span>Vault & Security</span>
              <span className={styles.checkMark}>{visibleWidgets?.storage ? '✓' : ''}</span>
            </button>
            <button
              type="button"
              className={styles.submenuItem}
              onClick={() => onToggleWidget('notes', !visibleWidgets?.notes)}
            >
              <span>Quick Note</span>
              <span className={styles.checkMark}>{visibleWidgets?.notes ? '✓' : ''}</span>
            </button>
            <button
              type="button"
              className={styles.submenuItem}
              onClick={() => onToggleWidget('favorites', !visibleWidgets?.favorites)}
            >
              <span>Favorite Apps</span>
              <span className={styles.checkMark}>{visibleWidgets?.favorites ? '✓' : ''}</span>
            </button>
          </div>
        )}
      </div>

      <div className={styles.menuDivider} />

      {/* Vault Lock / Unlock */}
      {isVaultUnlocked ? (
        <button
          type="button"
          className={styles.menuItem}
          role="menuitem"
          onClick={() => {
            onLockVault();
            onClose();
          }}
        >
          <span className={styles.itemIcon}>🔒</span>
          <span className={styles.itemText}>Lock Vault (Zero-Knowledge)</span>
        </button>
      ) : (
        <button
          type="button"
          className={styles.menuItem}
          role="menuitem"
          onClick={() => {
            onUnlockVault();
            onClose();
          }}
        >
          <span className={styles.itemIcon}>🔑</span>
          <span className={styles.itemText}>Unlock Vault…</span>
        </button>
      )}

      {/* System Settings */}
      <button
        type="button"
        className={styles.menuItem}
        role="menuitem"
        onClick={() => {
          onOpenSettings();
          onClose();
        }}
      >
        <span className={styles.itemIcon}>⚙️</span>
        <span className={styles.itemText}>System Settings…</span>
      </button>

      <div className={styles.menuDivider} />

      {/* Switch to Classic Dashboard */}
      <button
        type="button"
        className={styles.menuItem}
        role="menuitem"
        onClick={() => {
          onSwitchToClassic();
          onClose();
        }}
      >
        <span className={styles.itemIcon}>⚡</span>
        <span className={styles.itemText}>Switch to Classic Dashboard</span>
      </button>
    </div>
  );
}

export default DesktopContextMenu;
