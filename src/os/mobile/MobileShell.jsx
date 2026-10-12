import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useOS } from '../hooks/useOS.js';
import { useMusic } from '../../context/MusicContext.jsx';
import { WALLPAPER_PRESETS } from '../desktop/types.js';
import {
  loadDeviceMode,
  loadMobileNavStyle,
  loadMobileTheme,
  MOBILE_NAV_STYLES,
  MOBILE_PRESENTATION_MODES,
  MOBILE_THEMES,
  saveDeviceMode,
  saveMobileNavStyle,
  saveMobileTheme,
} from './types.js';

import MobileStatusBar from './MobileStatusBar.jsx';
import MobileHomeScreen from './MobileHomeScreen.jsx';
import MobileAppContainer from './MobileAppContainer.jsx';
import MobileBottomNav from './MobileBottomNav.jsx';
import MobileAppDrawer from './MobileAppDrawer.jsx';
import MobileQuickSettings from './MobileQuickSettings.jsx';
import MobileAppSwitcher from './MobileAppSwitcher.jsx';

import styles from './MobileShell.module.css';

export function MobileShell({
  user,
  access,
  projects = [],
  onDeleteProject,
  devices = [],
  securityEvents = [],
  selectedDevice,
  selectedDeviceId,
  setSelectedDeviceId,
  handleRegisterDevice,
  handleRenameDevice,
  handleRevokeDevice,
  masterPassword,
  handleUnlockVault,
  handleLockVault,
  logout,
  isRTDBConnected = false,
  onSwitchToDesktop,
}) {
  const { toggleOSMode, settings } = useOS();
  const { currentTrack, isPlaying } = useMusic();

  // Mobile Theme & Navigation Preferences
  const [mobileTheme, setMobileTheme] = useState(loadMobileTheme);
  const [navStyle, setNavStyle] = useState(loadMobileNavStyle);

  // Mobile Navigation & Screen States
  const [activeAppId, setActiveAppId] = useState(null);
  const [runningAppIds, setRunningAppIds] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // Swipe Gesture Tracking
  const touchStartYRef = useRef(null);
  const touchStartXRef = useRef(null);

  // Wallpaper CSS
  const activeWallpaper =
    WALLPAPER_PRESETS.find((wp) => wp.id === settings.wallpaperId) || WALLPAPER_PRESETS[0];

  // Theme Toggles
  const handleToggleTheme = useCallback(() => {
    setMobileTheme((prev) => {
      const next = prev === MOBILE_THEMES.IOS ? MOBILE_THEMES.ANDROID : MOBILE_THEMES.IOS;
      saveMobileTheme(next);
      return next;
    });
  }, []);

  const handleToggleNavStyle = useCallback(() => {
    setNavStyle((prev) => {
      const next =
        prev === MOBILE_NAV_STYLES.GESTURE_BAR
          ? MOBILE_NAV_STYLES.THREE_BUTTON
          : MOBILE_NAV_STYLES.GESTURE_BAR;
      saveMobileNavStyle(next);
      return next;
    });
  }, []);

  // Open Application Fullscreen
  const handleOpenApp = useCallback((appId) => {
    setActiveAppId(appId);
    setRunningAppIds((prev) => (prev.includes(appId) ? prev : [...prev, appId]));
    setIsDrawerOpen(false);
    setIsSwitcherOpen(false);
    setIsQuickSettingsOpen(false);
  }, []);

  // Back Navigation
  const handleBack = useCallback(() => {
    if (isQuickSettingsOpen) {
      setIsQuickSettingsOpen(false);
    } else if (isDrawerOpen) {
      setIsDrawerOpen(false);
    } else if (isSwitcherOpen) {
      setIsSwitcherOpen(false);
    } else if (activeAppId) {
      setActiveAppId(null);
    }
  }, [isQuickSettingsOpen, isDrawerOpen, isSwitcherOpen, activeAppId]);

  // Go Home
  const handleGoHome = useCallback(() => {
    setActiveAppId(null);
    setIsDrawerOpen(false);
    setIsSwitcherOpen(false);
    setIsQuickSettingsOpen(false);
  }, []);

  // Close Application from Multitasking
  const handleCloseApp = useCallback(
    (appId) => {
      setRunningAppIds((prev) => prev.filter((id) => id !== appId));
      if (activeAppId === appId) {
        setActiveAppId(null);
      }
    },
    [activeAppId]
  );

  const handleCloseAllApps = useCallback(() => {
    setRunningAppIds([]);
    setActiveAppId(null);
    setIsSwitcherOpen(false);
  }, []);

  // Hardware Back Button (Android / Browser popstate integration)
  useEffect(() => {
    const handlePopState = () => {
      if (activeAppId || isDrawerOpen || isQuickSettingsOpen || isSwitcherOpen) {
        handleBack();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeAppId, isDrawerOpen, isQuickSettingsOpen, isSwitcherOpen, handleBack]);

  // Touch Swipe Handling for Top / Bottom Gestures
  const handleTouchStart = (e) => {
    touchStartYRef.current = e.touches[0].clientY;
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartYRef.current === null) return;
    const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;
    const deltaX = Math.abs(touchStartXRef.current - e.changedTouches[0].clientX);

    // Vertical swipe check (avoid horizontal gestures)
    if (Math.abs(deltaY) > 50 && deltaX < 80) {
      if (deltaY < -60 && touchStartYRef.current < 90) {
        // Swiped down from near top: Open Quick Settings shade
        setIsQuickSettingsOpen(true);
      } else if (deltaY > 60 && !activeAppId && mobileTheme === MOBILE_THEMES.ANDROID) {
        // Swiped up on Android Home Screen: Open App Drawer
        setIsDrawerOpen(true);
      }
    }
    touchStartYRef.current = null;
    touchStartXRef.current = null;
  };

  return (
    <div
      className={styles.mobileRoot}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        '--safe-area-top': 'env(safe-area-inset-top, 0px)',
        '--safe-area-bottom': 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Background Wallpaper */}
      <div
        className={styles.mobileWallpaper}
        style={{ background: activeWallpaper.darkCss }}
      />

      {/* Top Mobile Status Bar */}
      <MobileStatusBar
        theme={mobileTheme}
        isRTDBConnected={isRTDBConnected}
        isVaultUnlocked={Boolean(masterPassword)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onToggleQuickSettings={() => setIsQuickSettingsOpen((prev) => !prev)}
        onUnlockVault={() => handleOpenApp('notepad')}
        onLockVault={handleLockVault}
      />

      {/* Main Home Screen (Rendered when no active app or in background) */}
      <MobileHomeScreen
        theme={mobileTheme}
        onOpenApp={handleOpenApp}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        isVaultUnlocked={Boolean(masterPassword)}
        onUnlockVault={() => handleOpenApp('notepad')}
        onLockVault={handleLockVault}
        activeAppId={activeAppId}
        userRole={access?.role || 'viewer'}
      />

      {/* Active Fullscreen Application Layer */}
      {activeAppId && (
        <MobileAppContainer
          appId={activeAppId}
          theme={mobileTheme}
          onBack={handleBack}
          masterPassword={masterPassword}
          onUnlockVault={handleUnlockVault}
          onLockVault={handleLockVault}
          user={user}
          access={access}
          projects={projects}
          onDeleteProject={onDeleteProject}
          devices={devices}
          securityEvents={securityEvents}
          selectedDevice={selectedDevice}
          selectedDeviceId={selectedDeviceId}
          setSelectedDeviceId={setSelectedDeviceId}
          onRegisterDevice={handleRegisterDevice}
          onRenameDevice={handleRenameDevice}
          onRevokeDevice={handleRevokeDevice}
          onOpenApp={handleOpenApp}
        />
      )}

      {/* Bottom Navigation (iOS Home Indicator or Android 3-Button Bar) */}
      <MobileBottomNav
        theme={mobileTheme}
        navStyle={navStyle}
        onGoHome={handleGoHome}
        onBack={handleBack}
        onOpenSwitcher={() => setIsSwitcherOpen(true)}
        isAppOpen={Boolean(activeAppId)}
      />

      {/* Android Vertical App Drawer */}
      <MobileAppDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenApp={handleOpenApp}
        userRole={access?.role || 'viewer'}
      />

      {/* Quick Settings Pull-down Shade */}
      <MobileQuickSettings
        isOpen={isQuickSettingsOpen}
        onClose={() => setIsQuickSettingsOpen(false)}
        theme={mobileTheme}
        onToggleTheme={handleToggleTheme}
        navStyle={navStyle}
        onToggleNavStyle={handleToggleNavStyle}
        isRTDBConnected={isRTDBConnected}
        isVaultUnlocked={Boolean(masterPassword)}
        onUnlockVault={() => {
          setIsQuickSettingsOpen(false);
          handleOpenApp('notepad');
        }}
        onLockVault={handleLockVault}
        onSwitchToDesktop={() => {
          saveDeviceMode('desktop');
          onSwitchToDesktop?.();
        }}
        onSwitchToClassic={toggleOSMode}
        onLogout={logout}
        user={user}
      />

      {/* Multitasking Card Deck App Switcher */}
      <MobileAppSwitcher
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        runningAppIds={runningAppIds}
        activeAppId={activeAppId}
        onSelectApp={handleOpenApp}
        onCloseApp={handleCloseApp}
        onCloseAllApps={handleCloseAllApps}
      />
    </div>
  );
}

export default MobileShell;
