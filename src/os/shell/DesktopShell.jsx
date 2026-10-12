import React, { useCallback, useEffect, useState } from 'react';
import { useOS } from '../hooks/useOS.js';
import { useWindowManager } from '../hooks/useWindowManager.js';
import { WALLPAPER_PRESETS } from '../desktop/types.js';
import TopBar from './TopBar.jsx';
import DesktopCanvas from '../desktop/DesktopCanvas.jsx';
import WindowManagerStage from '../windows/WindowManagerStage.jsx';
import Dock from '../dock/Dock.jsx';
import AppLauncher from '../launcher/AppLauncher.jsx';
import CommandPalette from '../launcher/CommandPalette.jsx';
import WorkspaceOverview from '../workspaces/WorkspaceOverview.jsx';
import AppSwitcher from '../windows/AppSwitcher.jsx';
import {
  DOCK_MODES,
  loadAutoHide,
  loadDockMode,
  saveAutoHide,
  saveDockMode,
} from '../dock/types.js';
import styles from './DesktopShell.module.css';

export function DesktopShell({
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
    updateSettings,
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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);

  // Dock Preferences in state for reactive settings modal updates
  const [currentDockMode, setCurrentDockMode] = useState(loadDockMode);
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

  const handleSwitchDockMode = (newMode) => {
    setCurrentDockMode(newMode);
    saveDockMode(newMode);
  };

  const handleToggleAutoHide = (enabled) => {
    setCurrentAutoHide(enabled);
    saveAutoHide(enabled);
  };

  return (
    <div className={styles.desktopShellRoot}>
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
                <span>Zero-Knowledge AES-256 Memory Guard</span>
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
          <div className={styles.settingsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.settingsHeader}>
              <h2 className={styles.settingsTitle}>System Settings</h2>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsSettingsOpen(false)}
              >
                ×
              </button>
            </div>

            {/* Desktop Wallpaper */}
            <div className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>Desktop Wallpaper</h3>
              <div className={styles.wallpaperGrid}>
                {WALLPAPER_PRESETS.map((wp) => (
                  <button
                    key={wp.id}
                    type="button"
                    className={`${styles.wallpaperCard} ${
                      settings.wallpaperId === wp.id ? styles.wallpaperActive : ''
                    }`}
                    onClick={() => updateSettings({ wallpaperId: wp.id })}
                  >
                    <div
                      className={styles.wallpaperPreview}
                      style={{ background: wp.darkCss }}
                    />
                    <span className={styles.wallpaperName}>{wp.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dock & Taskbar Mode Preference */}
            <div className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>Dock & Taskbar Style</h3>
              <p className={styles.settingsDesc}>
                Choose between the macOS-inspired floating Dock or the Windows 11-style bottom Taskbar.
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: currentDockMode === DOCK_MODES.DOCK ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.12)',
                    background: currentDockMode === DOCK_MODES.DOCK ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.04)',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleSwitchDockMode(DOCK_MODES.DOCK)}
                >
                  🍏 macOS Floating Dock
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: currentDockMode === DOCK_MODES.TASKBAR ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.12)',
                    background: currentDockMode === DOCK_MODES.TASKBAR ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.04)',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleSwitchDockMode(DOCK_MODES.TASKBAR)}
                >
                  🪟 Windows 11 Taskbar
                </button>
              </div>

              <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: '#ffffff' }}>Auto-Hide Dock</span>
                <button
                  type="button"
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: currentAutoHide ? '#6366f1' : 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                  onClick={() => handleToggleAutoHide(!currentAutoHide)}
                >
                  {currentAutoHide ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Zero-Knowledge Security */}
            <div className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>Zero-Knowledge Security</h3>
              <p className={styles.settingsDesc}>
                Master password keys are stored in transient session memory and never transmitted to servers.
              </p>
              {masterPassword ? (
                <button
                  type="button"
                  className={styles.lockNowBtn}
                  onClick={() => {
                    handleLockVault();
                    setIsSettingsOpen(false);
                  }}
                >
                  🔒 Lock Vault Immediately
                </button>
              ) : (
                <span className={styles.vaultLockedBadge}>Vault is currently locked</span>
              )}
            </div>

            {/* System Environment */}
            <div className={styles.settingsSection}>
              <h3 className={styles.settingsSectionTitle}>System Environment</h3>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className={styles.classicSwitchBtn}
                  style={{ flex: 1 }}
                  onClick={() => {
                    toggleOSMode();
                    setIsSettingsOpen(false);
                  }}
                >
                  ⚡ Classic Dashboard
                </button>
                <button
                  type="button"
                  className={styles.classicSwitchBtn}
                  style={{ flex: 1, background: 'rgba(99, 102, 241, 0.25)', borderColor: '#6366f1' }}
                  onClick={() => {
                    onSwitchToMobile?.();
                    setIsSettingsOpen(false);
                  }}
                >
                  📱 Mobile OS Experience
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DesktopShell;
