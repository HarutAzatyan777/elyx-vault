import React, { useRef } from 'react';
import { MOBILE_NAV_STYLES, MOBILE_THEMES } from './types.js';
import styles from './MobileShell.module.css';

export function MobileBottomNav({
  theme = MOBILE_THEMES.IOS,
  navStyle = MOBILE_NAV_STYLES.GESTURE_BAR,
  onGoHome,
  onBack,
  onOpenSwitcher,
  isAppOpen = false,
}) {
  const touchStartYRef = useRef(null);

  const handleTouchStart = (e) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartYRef.current === null) return;
    const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;
    // Swipe up on gesture bar triggers App Switcher
    if (deltaY > 40) {
      onOpenSwitcher?.();
    } else {
      onGoHome?.();
    }
    touchStartYRef.current = null;
  };

  if (navStyle === MOBILE_NAV_STYLES.THREE_BUTTON) {
    return (
      <nav className={styles.threeButtonBar} aria-label="3-Button Navigation">
        {/* Back Button */}
        <button
          type="button"
          className={styles.threeBtn}
          onClick={isAppOpen ? onBack : onGoHome}
          aria-label="Back"
          title="Back"
        >
          <svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        {/* Home Button */}
        <button
          type="button"
          className={styles.threeBtn}
          onClick={onGoHome}
          aria-label="Home"
          title="Home"
        >
          <svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20">
            <circle cx="12" cy="12" r="7" />
          </svg>
        </button>

        {/* Recents / Switcher Button */}
        <button
          type="button"
          className={styles.threeBtn}
          onClick={onOpenSwitcher}
          aria-label="Recent Apps"
          title="Recent Apps"
        >
          <svg fill="currentColor" viewBox="0 0 24 24" width="18" height="18">
            <rect x="5" y="5" width="14" height="14" rx="2" />
          </svg>
        </button>
      </nav>
    );
  }

  // Default: iOS Home Indicator / Gesture Bar
  return (
    <nav
      className={styles.gestureBarContainer}
      onClick={onGoHome}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Home Indicator"
    >
      <div className={styles.gestureIndicatorPill} title="Tap for Home, Swipe up for Multitasking" />
    </nav>
  );
}

export default MobileBottomNav;
