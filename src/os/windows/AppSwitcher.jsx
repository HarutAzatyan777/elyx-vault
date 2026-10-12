import React, { useEffect, useState } from 'react';
import styles from './AppSwitcher.module.css';

export function AppSwitcher({
  isOpen,
  onClose,
  windows = [],
  workspaces = [],
  onSelectWindow,
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // When switcher opens, preselect the next window in stack (index 1 if available, otherwise 0)
  useEffect(() => {
    if (isOpen) {
      if (windows.length > 1) {
        setSelectedIndex(1);
      } else {
        setSelectedIndex(0);
      }
    }
  }, [isOpen, windows.length]);

  // Handle keyboard events while switcher is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab' || e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % windows.length);
      } else if (e.key === 'ArrowLeft' || (e.shiftKey && e.key === 'Tab')) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + windows.length) % windows.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (windows[selectedIndex]) {
          onSelectWindow(windows[selectedIndex]);
        }
        onClose();
      }
    };

    // Auto-select when Alt or Meta modifier key is released
    const handleKeyUp = (e) => {
      if (e.key === 'Alt' || e.key === 'Meta') {
        if (windows[selectedIndex]) {
          onSelectWindow(windows[selectedIndex]);
        }
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, windows, selectedIndex, onClose, onSelectWindow]);

  if (!isOpen || windows.length === 0) return null;

  return (
    <div
      className={styles.switcherOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-label="Application Task Switcher"
    >
      <div className={styles.switcherCard}>
        <div className={styles.switcherHeader}>
          <span className={styles.switcherTitle}>Task Switcher</span>
          <div className={styles.switcherHint}>
            <span className={styles.kbd}>Tab</span> or <span className={styles.kbd}>← / →</span> to cycle • Release <span className={styles.kbd}>Alt</span> to select
          </div>
        </div>

        <div className={styles.windowList}>
          {windows.map((win, idx) => {
            const isSelected = idx === selectedIndex;
            const ws = workspaces.find((w) => w.id === (win.workspaceId || 1));

            return (
              <div
                key={win.id}
                className={`${styles.windowItem} ${isSelected ? styles.windowItemSelected : ''}`}
                onClick={() => {
                  onSelectWindow(win);
                  onClose();
                }}
              >
                <div
                  className={styles.appIconBadge}
                  style={{ backgroundColor: win.icon?.badgeColor || '#6366f1' }}
                >
                  {win.icon?.symbol || '🪟'}
                </div>
                <span className={styles.windowTitle} title={win.title}>
                  {win.title}
                </span>
                {ws && <span className={styles.workspaceBadge}>{ws.name}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AppSwitcher;
