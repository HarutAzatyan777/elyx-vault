import React, { useEffect, useState } from 'react';
import { useMusic } from '../../context/MusicContext.jsx';
import { useNotifications } from '../hooks/useNotifications.js';
import { useWindowManager } from '../hooks/useWindowManager.js';
import { useOS } from '../hooks/useOS.js';
import SystemMenu from './SystemMenu.jsx';
import ControlCenter from './ControlCenter.jsx';
import NotificationsFlyout from './NotificationsFlyout.jsx';
import styles from './TopBar.module.css';

export function TopBar({
  activeAppName = 'Elyx OS',
  user,
  access,
  isRTDBConnected = false,
  isVaultUnlocked = false,
  onLockVault,
  onUnlockVault,
  onOpenSettings,
  onSwitchToClassic,
  onLogout,
  onOpenAbout,
  onOpenApp,
  onOpenCommandSearch,
  onToggleLauncher,
}) {
  const {
    windows,
    activeWindow,
    focusWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    minimizeAllWindows,
    restoreAllWindows,
    closeAllWindows,
  } = useWindowManager();

  const {
    settings,
    workspaces,
    activeWorkspace,
    switchWorkspace,
    createWorkspace,
    openOverview,
    toggleOverview,
  } = useOS();

  // Live date & time
  const [currentDate, setCurrentDate] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateString = currentDate.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Music context integration
  const { currentTrack, isPlaying, togglePlayPause } = useMusic();

  // Notification count
  const { unreadCount } = useNotifications();

  // Active flyout states
  const [activeMenu, setActiveMenu] = useState(null);

  useEffect(() => {
    const open = () => setActiveMenu('notifications');
    window.addEventListener('elyx:open-notifications', open);
    return () => window.removeEventListener('elyx:open-notifications', open);
  }, []);
  const handleToggleMenu = (menuKey) => {
    setActiveMenu((prev) => (prev === menuKey ? null : menuKey));
  };

  const userName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const displayedTitle = activeWindow ? activeWindow.title : activeAppName;
  const activeWs = workspaces.find((ws) => ws.id === activeWorkspace) || workspaces[0];

  return (
    <header className={styles.topBar} role="banner">
      {/* LEFT SECTION: Logo, App Name, Context Menus, Window Pills */}
      <div className={styles.leftSection}>
        {/* Elyx Brand Button */}
        <button
          type="button"
          className={`${styles.brandBtn} ${activeMenu === 'system' ? styles.btnActive : ''}`}
          onClick={() => handleToggleMenu('system')}
          title="Elyx OS Menu"
          aria-label="Elyx OS Menu"
        >
          <svg
            className={styles.brandIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            width="17"
            height="17"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </button>

        {/* Active Application / Window Name */}
        <span className={styles.activeAppTitle}>{displayedTitle}</span>

        {/* Active Virtual Desktop Indicator Pill */}
        <div className={styles.workspacePillWrapper}>
          <button
            type="button"
            className={`${styles.workspacePill} ${activeMenu === 'workspace' ? styles.workspacePillActive : ''}`}
            onClick={() => handleToggleMenu('workspace')}
            title={`Virtual Desktop: ${activeWs?.name || 'Workspace 1'}. Click to switch or manage.`}
          >
            <span className={styles.wsPillIcon}>🖥️</span>
            <span className={styles.wsPillName}>{activeWs?.name || 'Workspace 1'}</span>
            <span className={styles.wsPillCaret}>▾</span>
          </button>
        </div>

        {/* Contextual Application Menus (macOS style) */}
        {settings.desktopMode === 'gnome' && <button type="button" className={styles.appMenuBtn} onClick={toggleOverview}>Activities</button>}
        <nav className={styles.appMenusNav} aria-label="Application menus">
          <button
            type="button"
            className={`${styles.appMenuBtn} ${activeMenu === 'appMenu_file' ? styles.btnActive : ''}`}
            onClick={() => handleToggleMenu('appMenu_file')}
          >
            File
          </button>
          <button
            type="button"
            className={`${styles.appMenuBtn} ${activeMenu === 'appMenu_edit' ? styles.btnActive : ''}`}
            onClick={() => handleToggleMenu('appMenu_edit')}
          >
            Edit
          </button>
          <button
            type="button"
            className={`${styles.appMenuBtn} ${activeMenu === 'appMenu_view' ? styles.btnActive : ''}`}
            onClick={() => handleToggleMenu('appMenu_view')}
          >
            View
          </button>
          <button
            type="button"
            className={`${styles.appMenuBtn} ${activeMenu === 'appMenu_window' ? styles.btnActive : ''}`}
            onClick={() => handleToggleMenu('appMenu_window')}
          >
            Window
          </button>
          <button
            type="button"
            className={`${styles.appMenuBtn} ${activeMenu === 'appMenu_help' ? styles.btnActive : ''}`}
            onClick={() => handleToggleMenu('appMenu_help')}
          >
            Help
          </button>
        </nav>

        {/* Open Windows Pills in TopBar */}
        {windows.length > 0 && (
          <div className={styles.windowPillsNav} role="tablist" aria-label="Open Windows">
            {windows.map((w) => (
              <button
                key={w.id}
                type="button"
                className={`${styles.windowPill} ${w.isFocused ? styles.windowPillActive : ''} ${
                  w.isMinimized ? styles.windowPillMinimized : ''
                }`}
                onClick={() => {
                  if (w.isMinimized) restoreWindow(w.id);
                  else if (w.isFocused) minimizeWindow(w.id);
                  else focusWindow(w.id);
                }}
                title={`${w.title} (${
                  w.isMinimized
                    ? 'Minimized - click to restore'
                    : w.isFocused
                    ? 'Active - click to minimize'
                    : 'Click to bring to front'
                })`}
              >
                <span className={styles.windowPillDot} />
                <span className={styles.windowPillTitle}>{w.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT SECTION: Audio pill, RTDB, Lock, Notifications, Clock, Avatar */}
      <div className={styles.rightSection}>
        {/* Audio Pill */}
        {currentTrack && (
          <button
            type="button"
            className={styles.audioPill}
            onClick={togglePlayPause}
            title={`${isPlaying ? 'Pause' : 'Play'} ${currentTrack.title}`}
          >
            <span className={styles.audioIcon}>{isPlaying ? '⏸' : '▶'}</span>
            <span className={styles.audioTrackName}>{currentTrack.title}</span>
          </button>
        )}

        {/* Live RTDB Connection Status Indicator */}
        <div
          className={styles.statusIndicator}
          title={isRTDBConnected ? 'Cloud Realtime DB: Connected' : 'Cloud Realtime DB: Standby'}
        >
          <span className={`${styles.statusDot} ${isRTDBConnected ? styles.dotOnline : styles.dotOffline}`} />
          <span className={styles.statusLabel}>{isRTDBConnected ? 'RTDB' : 'Offline'}</span>
        </div>

        {/* Vault Lock Status Indicator */}
        {isVaultUnlocked ? (
          <button
            type="button"
            className={styles.lockStatusBtn}
            onClick={onLockVault}
            title="Elyx Vault is Decrypted. Click to Lock immediately."
          >
            <span className={styles.lockIcon}>🔓</span>
            <span className={styles.lockLabel}>Lock</span>
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.lockStatusBtn} ${styles.lockStatusLocked}`}
            onClick={onUnlockVault}
            title="Vault is Locked. Click to enter Master Password."
          >
            <span className={styles.lockIcon}>🔒</span>
            <span className={styles.lockLabel}>Unlock</span>
          </button>
        )}

        {/* Mission Control / Overview Button */}
        <button
          type="button"
          className={styles.iconButton}
          onClick={toggleOverview}
          title="Mission Control / Workspace Overview (Ctrl+Up)"
          aria-label="Mission Control"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>

        {/* Global Spotlight / Command Search */}
        <button
          type="button"
          className={styles.iconButton}
          onClick={onOpenCommandSearch}
          title="Spotlight Search (Ctrl+K)"
          aria-label="Spotlight Search"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>

        {/* Notifications Indicator */}
        <button
          type="button"
          className={`${styles.iconButton} ${activeMenu === 'notifications' ? styles.btnActive : ''}`}
          onClick={() => handleToggleMenu('notifications')}
          title="Notification Center"
          aria-label={`Notifications, ${unreadCount} unread`}
          aria-expanded={activeMenu === 'notifications'}
          aria-haspopup="dialog"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadCount > 0 && (
            <span className={styles.notifBadge}>{unreadCount}</span>
          )}
        </button>

        {/* Live Clock & Date */}
        <div className={styles.clockWidget}>
          <span className={styles.clockDate}>{dateString}</span>
          <span className={styles.clockTime}>{timeString}</span>
        </div>

        {/* User Profile Avatar / Control Center Trigger */}
        <button
          type="button"
          className={`${styles.avatarBtn} ${activeMenu === 'control' ? styles.btnActive : ''}`}
          onClick={() => handleToggleMenu('control')}
          title={`Control Center (${userName} - ${access?.role || 'viewer'})`}
          aria-label="User Profile and Control Center"
          aria-expanded={activeMenu === 'control'}
          aria-haspopup="dialog"
        >
          <div className={styles.avatarCircle}>{userName.charAt(0).toUpperCase()}</div>
        </button>
      </div>

      {/* Dropdown Flyouts */}
      <SystemMenu
        isOpen={activeMenu === 'system'}
        onClose={() => setActiveMenu(null)}
        onOpenSettings={onOpenSettings}
        onLockVault={onLockVault}
        onSwitchToClassic={onSwitchToClassic}
        onLogout={onLogout}
        onOpenAbout={onOpenAbout}
        isVaultUnlocked={isVaultUnlocked}
      />

      <ControlCenter
        isOpen={activeMenu === 'control'}
        onClose={() => setActiveMenu(null)}
        user={user}
        access={access}
        onLogout={onLogout}
        onLockVault={onLockVault}
        isVaultUnlocked={isVaultUnlocked}
        onOpenSettings={onOpenSettings}
      />

      <NotificationsFlyout
        isOpen={activeMenu === 'notifications'}
        onClose={() => setActiveMenu(null)}
      />

      {/* Virtual Desktops Dropdown Flyout */}
      {activeMenu === 'workspace' && (
        <div
          className={styles.dropdownMenu}
          style={{ top: 'calc(var(--elyx-topbar-height, 38px) + 4px)', left: '160px' }}
        >
          <div className={styles.dropdownSectionLabel}>Virtual Desktops</div>
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              className={styles.dropdownItem}
              onClick={() => {
                switchWorkspace(ws.id);
                setActiveMenu(null);
              }}
            >
              <span className={styles.itemIcon}>🖥️</span>
              <span>{ws.name}</span>
              {ws.id === activeWorkspace && <span className={styles.shortcutText}>✓</span>}
            </button>
          ))}
          <div className={styles.dropdownDivider} />
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => {
              openOverview();
              setActiveMenu(null);
            }}
          >
            <span className={styles.itemIcon}>🧭</span>
            <span>Mission Control</span>
            <span className={styles.shortcutText}>Ctrl+Up</span>
          </button>
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => {
              createWorkspace(`Workspace ${workspaces.length + 1}`);
              setActiveMenu(null);
            }}
          >
            <span className={styles.itemIcon}>+</span>
            <span>New Virtual Desktop</span>
          </button>
        </div>
      )}

      {/* Contextual App Menu Dropdowns (Generic placeholders) */}
      {activeMenu === 'appMenu_file' && (
        <div
          className={styles.dropdownMenu}
          style={{ top: 'calc(var(--elyx-topbar-height, 38px) + 4px)', left: '110px' }}
        >
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => {
              onOpenApp?.('notepad');
              setActiveMenu(null);
            }}
          >
            <span>New Note</span>
            <span className={styles.shortcutText}>Ctrl+N</span>
          </button>
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => {
              onOpenApp?.('daily_workspace');
              setActiveMenu(null);
            }}
          >
            <span>Open Daily Workspace…</span>
          </button>
          <div className={styles.dropdownDivider} />
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => {
              if (isVaultUnlocked) onLockVault();
              setActiveMenu(null);
            }}
          >
            <span>Lock Vault</span>
            <span className={styles.shortcutText}>Ctrl+L</span>
          </button>
        </div>
      )}

      {activeMenu === 'appMenu_view' && (
        <div
          className={styles.dropdownMenu}
          style={{ top: 'calc(var(--elyx-topbar-height, 38px) + 4px)', left: '180px' }}
        >
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => {
              window.location.reload();
            }}
          >
            <span>Reload Desktop Shell</span>
            <span className={styles.shortcutText}>F5</span>
          </button>
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                document.documentElement.requestFullscreen?.();
              }
              setActiveMenu(null);
            }}
          >
            <span>Toggle Fullscreen</span>
            <span className={styles.shortcutText}>F11</span>
          </button>
        </div>
      )}

      {/* Window Menu Dropdown */}
      {activeMenu === 'appMenu_window' && (
        <div
          className={styles.dropdownMenu}
          style={{ top: 'calc(var(--elyx-topbar-height, 38px) + 4px)', left: '210px', width: '240px' }}
        >
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => {
              if (activeWindow) minimizeWindow(activeWindow.id);
              setActiveMenu(null);
            }}
            disabled={!activeWindow}
          >
            <span>Minimize Active Window</span>
            <span className={styles.shortcutText}>Ctrl+M</span>
          </button>
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => {
              if (activeWindow) maximizeWindow(activeWindow.id);
              setActiveMenu(null);
            }}
            disabled={!activeWindow}
          >
            <span>{activeWindow?.isMaximized ? 'Restore Dimensions' : 'Zoom / Maximize'}</span>
          </button>
          <div className={styles.dropdownDivider} />
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => {
              minimizeAllWindows();
              setActiveMenu(null);
            }}
            disabled={windows.length === 0}
          >
            <span>Minimize All</span>
          </button>
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => {
              restoreAllWindows();
              setActiveMenu(null);
            }}
            disabled={windows.length === 0}
          >
            <span>Bring All to Front</span>
          </button>
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => {
              closeAllWindows();
              setActiveMenu(null);
            }}
            disabled={windows.length === 0}
          >
            <span>Close All Windows</span>
          </button>

          {windows.length > 0 && (
            <>
              <div className={styles.dropdownDivider} />
              <div className={styles.dropdownSectionLabel}>Open Windows ({windows.length})</div>
              {windows.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className={`${styles.dropdownItem} ${w.isFocused ? styles.activeDropdownItem : ''}`}
                  onClick={() => {
                    if (w.isMinimized) restoreWindow(w.id);
                    else focusWindow(w.id);
                    setActiveMenu(null);
                  }}
                >
                  <span className={styles.windowMenuTitle}>
                    {w.isMinimized ? `(Minimized) ${w.title}` : w.title}
                  </span>
                  {w.isFocused && <span className={styles.checkMark}>✓</span>}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {activeMenu === 'appMenu_help' && (
        <div
          className={styles.dropdownMenu}
          style={{ top: 'calc(var(--elyx-topbar-height, 38px) + 4px)', left: '260px' }}
        >
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => {
              onOpenAbout();
              setActiveMenu(null);
            }}
          >
            <span>About Elyx OS 1.0</span>
          </button>
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => {
              window.open('https://github.com/HarutAzatyan777/elyx-vault', '_blank');
              setActiveMenu(null);
            }}
          >
            <span>Documentation & GitHub</span>
          </button>
        </div>
      )}
    </header>
  );
}

export default TopBar;
