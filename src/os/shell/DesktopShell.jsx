import { useFlyoutFocus } from '../hooks/useFlyoutFocus.js';
const SystemSettingsApp = lazy(() => import('../settings/SystemSettingsApp.jsx'));
import React, { lazy, useCallback, useEffect, useState, useRef } from 'react';
import { useOS } from '../hooks/useOS.js';
import { useWindowManager } from '../hooks/useWindowManager.js';
import TopBar from './TopBar.jsx';
import DesktopCanvas from '../desktop/DesktopCanvas.jsx';
import WindowManagerStage from '../windows/WindowManagerStage.jsx';
import Dock from '../dock/Dock.jsx';
import AppLauncher from '../launcher/AppLauncher.jsx';
import CommandPalette from '../launcher/CommandPalette.jsx';
import WorkspaceOverview from '../workspaces/WorkspaceOverview.jsx';
import AppSwitcher from '../windows/AppSwitcher.jsx';
import {
  loadAutoHide,
} from '../dock/types.js';
import styles from './DesktopShell.module.css';

export function DesktopShell({
  systemNotice,
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
  onSwitchToMobile,
}) {
  const {
    toggleOSMode,
    settings,
    workspaces,
    activeWorkspace,
    switchWorkspace,
    workspaceMode,
    toggleOverview,
    closeOverview,
    isLauncherOpen,
    openLauncher,
    closeLauncher,
    toggleLauncher,
  } = useOS();

  const {
    windows,
    openWindow,
    focusWindow,
    restoreWindow,
  } = useWindowManager();

  // Modals & Flyouts
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  useFlyoutFocus(isSettingsOpen, settingsRef, closeSettings);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);

  useEffect(() => {
    setCurrentDockMode(settings.desktopMode === 'windows' ? 'taskbar' : 'dock');
  }, [settings.desktopMode]);

  useEffect(() => {
    const sync = () => setCurrentAutoHide(loadAutoHide());
    window.addEventListener('elyx:dock-changed', sync);
    return () => window.removeEventListener('elyx:dock-changed', sync);
  }, []);

  useEffect(() => {
    window.addEventListener('elyx:open-notifications', closeSettings);
    return () => window.removeEventListener('elyx:open-notifications', closeSettings);
  }, [closeSettings]);

  // Dock Preferences in state for reactive settings modal updates
  const [currentDockMode, setCurrentDockMode] = useState(() => settings.desktopMode === 'windows' ? 'taskbar' : 'dock');
  const [currentAutoHide, setCurrentAutoHide] = useState(loadAutoHide);

  const handleOpenApp = useCallback(
    (appId, options) => {
      openWindow(appId, options);
    },
    [openWindow]
  );

  // Global Keyboard Shortcuts (Ctrl+K, Ctrl+Space, Ctrl+Arrows, Alt+Tab, Escape)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Escape: Close any open overlay
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (isAboutOpen) setIsAboutOpen(false);
        if (isAppSwitcherOpen) setIsAppSwitcherOpen(false);
        if (isLauncherOpen) closeLauncher();
        if (workspaceMode === 'overview') closeOverview();
        return;
      }

      // Ctrl+K or Cmd+K: Global Command Search
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Ctrl+Space: App Launcher
      else if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        toggleLauncher();
      }
      // Ctrl+Up or Cmd+Up / Down: Mission Control Overview
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        toggleOverview();
      }
      // Ctrl+Left / Cmd+Left or Ctrl+Alt+Left: Switch to previous virtual desktop
      else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
        e.preventDefault();
        const currentIndex = workspaces.findIndex((ws) => ws.id === activeWorkspace);
        if (currentIndex > 0) {
          switchWorkspace(workspaces[currentIndex - 1].id);
        } else if (workspaces.length > 1) {
          switchWorkspace(workspaces[workspaces.length - 1].id);
        }
      }
      // Ctrl+Right / Cmd+Right or Ctrl+Alt+Right: Switch to next virtual desktop
      else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
        e.preventDefault();
        const currentIndex = workspaces.findIndex((ws) => ws.id === activeWorkspace);
        if (currentIndex >= 0 && currentIndex < workspaces.length - 1) {
          switchWorkspace(workspaces[currentIndex + 1].id);
        } else if (workspaces.length > 1) {
          switchWorkspace(workspaces[0].id);
        }
      }
      // Alt+Tab, Alt+`, or Ctrl+Shift+Tab: Fast App Switcher HUD
      else if (
        (e.altKey && (e.key === 'Tab' || e.key === '`' || e.key === '~')) ||
        (e.ctrlKey && e.shiftKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        if (windows.length > 0) {
          setIsAppSwitcherOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    isCommandPaletteOpen,
    isSettingsOpen,
    isAboutOpen,
    isAppSwitcherOpen,
    isLauncherOpen,
    workspaceMode,
    toggleLauncher,
    closeLauncher,
    toggleOverview,
    closeOverview,
    workspaces,
    activeWorkspace,
    switchWorkspace,
    windows.length,
  ]);

  return (
    <div className={styles.desktopShellRoot}>
      {systemNotice && <div role="status" style={{position:'fixed',top:48,left:'50%',transform:'translateX(-50%)',zIndex:2000,background:'var(--elyx-surface-window-body)',color:'var(--elyx-text-primary)',padding:'10px 16px',borderRadius:12,maxWidth:'90vw'}}>{systemNotice}</div>}
      {/* Top macOS-style System Bar */}
      <TopBar
        user={user}
        access={access}
        isRTDBConnected={isRTDBConnected}
        isVaultUnlocked={Boolean(masterPassword)}
        onLockVault={handleLockVault}
        onUnlockVault={() => handleOpenApp('notepad')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSwitchToClassic={toggleOSMode}
        onLogout={logout}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenApp={handleOpenApp}
        onOpenCommandSearch={() => setIsCommandPaletteOpen(true)}
        onToggleLauncher={toggleLauncher}
      />

      {/* Full Viewport Desktop Canvas */}
      <DesktopCanvas
        userRole={access?.role || 'viewer'}
        onOpenApp={handleOpenApp}
        projectsCount={projects.length}
        devicesCount={devices.length}
        isRTDBConnected={isRTDBConnected}
        isVaultUnlocked={Boolean(masterPassword)}
        onLockVault={handleLockVault}
        onUnlockVault={() => handleOpenApp('notepad')}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Concurrent Multi-Window Manager Stage */}
      <WindowManagerStage
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

      {/* Floating macOS Dock / Windows 11 Taskbar */}
      <Dock
        key={`${currentDockMode}_${currentAutoHide}`}
        userRole={access?.role || 'viewer'}
        onOpenApp={handleOpenApp}
        onOpenCommandSearch={() => setIsCommandPaletteOpen(true)}
        isVaultUnlocked={Boolean(masterPassword)}
      />

      {/* Modern Application Launcher */}
      <AppLauncher
        isOpen={isLauncherOpen}
        onClose={closeLauncher}
        onOpenApp={handleOpenApp}
        userRole={access?.role || 'viewer'}
        isVaultUnlocked={Boolean(masterPassword)}
      />

      {/* Global Command Palette / Spotlight Search (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenApp={handleOpenApp}
        onLockVault={handleLockVault}
        onUnlockVault={() => {
          setIsCommandPaletteOpen(false);
          handleOpenApp('notepad');
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onSwitchToClassic={toggleOSMode}
        isVaultUnlocked={Boolean(masterPassword)}
      />

      {/* Mission Control / GNOME Activities Workspace Overview */}
      <WorkspaceOverview />

      {/* Fast Application Task Switcher HUD (Alt+Tab / Alt+`) */}
      <AppSwitcher
        isOpen={isAppSwitcherOpen}
        onClose={() => setIsAppSwitcherOpen(false)}
        windows={windows}
        workspaces={workspaces}
        onSelectWindow={(win) => {
          const targetWs = win.workspaceId || 1;
          if (activeWorkspace !== targetWs) {
            switchWorkspace(targetWs);
          }
          if (win.isMinimized) {
            restoreWindow(win.id);
          }
          focusWindow(win.id);
        }}
      />

      {/* About Elyx OS Modal */}
      {isAboutOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAboutOpen(false)}>
          <div className={styles.aboutCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.aboutLogoCircle}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="36" height="36">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className={styles.aboutTitle}>Elyx OS 1.0</h2>
            <p className={styles.aboutVersion}>Version 1.0.0 (Build 2026.10)</p>
            <p className={styles.aboutTagline}>Your Personal Cloud Operating System</p>
            <div className={styles.aboutDetails}>
              <div className={styles.aboutRow}>
                <span>Architecture</span>
                <span>React 19 • Vite • Firebase 12</span>
              </div>
              <div className={styles.aboutRow}>
                <span>Cryptography</span>
                <span>Client-side passphrase encryption</span>
              </div>
              <div className={styles.aboutRow}>
                <span>Local Daemon</span>
                <span>RTDB WebSocket PTY Engine</span>
              </div>
            </div>
            <button
              type="button"
              className={styles.aboutCloseBtn}
              onClick={() => setIsAboutOpen(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* System Settings Modal */}
      {isSettingsOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsSettingsOpen(false)}>
          <div ref={settingsRef} role="dialog" aria-label="System Settings" className={styles.settingsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.settingsHeader}>
              <h2 className={styles.settingsTitle}>System Settings</h2>
              <button
                type="button"
                aria-label="Close dialog" className={styles.modalCloseBtn}
                onClick={() => setIsSettingsOpen(false)}
              >
                ×
              </button>
            </div>

            <SystemSettingsApp masterPassword={masterPassword} onLockVault={handleLockVault} devices={devices} />
          </div>
        </div>
      )}
    </div>
  );
}

export default DesktopShell;
