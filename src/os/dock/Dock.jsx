import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getAppById, canUserLaunchApp } from '../registry/appRegistry.js';
import { useWindowManager } from '../hooks/useWindowManager.js';
import { useOS } from '../hooks/useOS.js';
import {
  DOCK_MODES,
  loadAutoHide,
  loadDockMode,
  loadPinnedApps,
  recordRecentApp,
  saveAutoHide,
  saveDockMode,
  savePinnedApps,
} from './types.js';
import styles from './Dock.module.css';

export function Dock({
  userRole = 'viewer',
  onOpenApp,
  onOpenCommandSearch,
  isVaultUnlocked = false,
}) {
  const {
    windows,
    activeWindow,
    focusWindow,
    minimizeWindow,
    restoreWindow,
    closeWindow,
  } = useWindowManager();

  const { settings, updateSettings, isLauncherOpen, toggleLauncher, toggleOverview } = useOS();

  useEffect(() => setDockMode(settings.desktopMode === 'windows' ? 'taskbar' : 'dock'), [settings.desktopMode]);
  useEffect(() => {
    const sync = () => setAutoHide(loadAutoHide());
    window.addEventListener('elyx:dock-changed', sync);
    return () => window.removeEventListener('elyx:dock-changed', sync);
  }, []);
  // Dock Preferences State
  const [pinnedAppIds, setPinnedAppIds] = useState(loadPinnedApps);
  const [dockMode, setDockMode] = useState(loadDockMode);
  const [autoHide, setAutoHide] = useState(loadAutoHide);
  const [isRevealed, setIsRevealed] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null);
  const dockRef = useRef(null);

  // Sync pinned app changes to localStorage
  const updatePinned = useCallback((newPinned) => {
    setPinnedAppIds(newPinned);
    savePinnedApps(newPinned);
  }, []);

  const updateMode = useCallback((newMode) => {
    setDockMode(newMode);
    saveDockMode(newMode);
    updateSettings({ desktopMode: newMode === 'taskbar' ? 'windows' : 'macos' });
  }, [updateSettings]);

  const updateAutoHide = useCallback((enabled) => {
    setAutoHide(enabled);
    saveAutoHide(enabled);
  }, []);

  // Compute Running & Pinned Apps
  const runningAppIds = Array.from(new Set(windows.map((w) => w.appId)));
  const unpinnedRunningAppIds = runningAppIds.filter((id) => !pinnedAppIds.includes(id));

  // Close context menu when clicking outside
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (contextMenu && !e.target.closest(`.${styles.contextMenu}`)) {
        setContextMenu(null);
      }
    };
    window.addEventListener('pointerdown', handleGlobalClick);
    return () => window.removeEventListener('pointerdown', handleGlobalClick);
  }, [contextMenu]);

  // Click App Icon on Dock/Taskbar
  const handleAppClick = useCallback(
    (appId) => {
      recordRecentApp(appId);
      const appWindows = windows.filter((w) => w.appId === appId);

      if (appWindows.length === 0) {
        // App not running, launch it
        onOpenApp(appId);
      } else {
        // App is already running
        const targetWin = appWindows[0];
        if (targetWin.isMinimized) {
          restoreWindow(targetWin.id);
        } else if (targetWin.isFocused) {
          minimizeWindow(targetWin.id);
        } else {
          focusWindow(targetWin.id);
        }
      }
    },
    [windows, onOpenApp, restoreWindow, minimizeWindow, focusWindow]
  );

  // Handle Right Click on App Icon
  const handleContextMenu = useCallback((e, appId) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      appId,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  // Pin / Unpin Handler
  const togglePin = useCallback(
    (appId) => {
      if (pinnedAppIds.includes(appId)) {
        updatePinned(pinnedAppIds.filter((id) => id !== appId));
      } else {
        updatePinned([...pinnedAppIds, appId]);
      }
      setContextMenu(null);
    },
    [pinnedAppIds, updatePinned]
  );

  // Reorder Handler
  const moveApp = useCallback(
    (appId, direction) => {
      const index = pinnedAppIds.indexOf(appId);
      if (index === -1) return;
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= pinnedAppIds.length) return;

      const next = [...pinnedAppIds];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      updatePinned(next);
      setContextMenu(null);
    },
    [pinnedAppIds, updatePinned]
  );

  // Render an individual App Icon
  const renderDockItem = (appId, isUnpinned = false) => {
    const app = getAppById(appId);
    if (!app || !canUserLaunchApp(app, userRole)) return null;

    const isRunning = runningAppIds.includes(appId);
    const isActive = activeWindow?.appId === appId;
    const isPinned = pinnedAppIds.includes(appId);
    const appWindows = windows.filter((w) => w.appId === appId);
    const isMinimized = appWindows.length > 0 && appWindows.every((w) => w.isMinimized);

    return (
      <div
        key={appId}
        className={`${styles.dockItemContainer} ${isActive ? styles.itemActive : ''}`}
        onContextMenu={(e) => handleContextMenu(e, appId)}
      >
        <button
          type="button"
          className={`${styles.dockItemBtn} ${isActive ? styles.btnActive : ''}`}
          onClick={() => handleAppClick(appId)}
          aria-label={app.name}
          title=""
        >
          {/* App Icon */}
          <div
            className={styles.dockIconBadge}
            style={{ backgroundColor: app.icon?.badgeColor || '#6366f1' }}
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox={app.icon?.viewBox || '0 0 24 24'}
              width="24"
              height="24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d={app.icon?.path}
              />
            </svg>
          </div>

          {/* Running Dot Indicator */}
          {isRunning && (
            <span
              className={`${styles.runningIndicator} ${
                isActive ? styles.runningIndicatorActive : ''
              } ${isMinimized ? styles.runningIndicatorMinimized : ''}`}
            />
          )}

          {/* Floating Tooltip */}
          <div className={styles.tooltip}>
            <span>{app.name}</span>
            {isActive && <span className={styles.tooltipTag}>Active</span>}
            {isMinimized && <span className={styles.tooltipTag}>Minimized</span>}
          </div>
        </button>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // WINDOWS 11 TASKBAR MODE
  // --------------------------------------------------------------------------
  if (dockMode === DOCK_MODES.TASKBAR) {
    return (
      <div className={styles.taskbarRoot} role="region" aria-label="Taskbar">
        {/* Left / Center Section: Start Button & Search */}
        <div className={styles.taskbarLeft}>
          {/* Start / Launcher Button */}
          <button
            type="button"
            className={`${styles.taskbarStartBtn} ${isLauncherOpen ? styles.taskbarBtnActive : ''}`}
            onClick={toggleLauncher}
            title="Start / App Launcher"
            aria-label="Start / App Launcher"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </button>

          {/* Quick Search Bar */}
          <button
            type="button"
            className={styles.taskbarSearchBtn}
            onClick={onOpenCommandSearch}
            title="Global Command Search (Ctrl+K)"
            aria-label="Search Elyx OS"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className={styles.taskbarSearchText}>Search Elyx OS</span>
            <span className={styles.taskbarSearchKbd}>Ctrl+K</span>
          </button>
        </div>

        {/* Taskbar App Icons & Open Window Tabs */}
        <div className={styles.taskbarItemsArea}>
          {pinnedAppIds.map((id) => renderDockItem(id))}
          {unpinnedRunningAppIds.length > 0 && (
            <>
              <div className={styles.taskbarDivider} />
              {unpinnedRunningAppIds.map((id) => renderDockItem(id, true))}
            </>
          )}
        </div>

        {/* Taskbar Right Tray */}
        <div className={styles.taskbarRight}>
          <button
            type="button"
            className={styles.taskbarTrayBtn}
            onClick={() => updateMode(DOCK_MODES.DOCK)}
            title="Switch to macOS Floating Dock"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>

        {/* Context Menu */}
        {renderContextMenu()}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // MACOS FLOATING DOCK MODE
  // --------------------------------------------------------------------------
  const isDockHidden = autoHide && !isRevealed;

  return (
    <>
      {/* Auto-Hide Hover Trigger Hotzone at Bottom Screen Edge */}
      {autoHide && (
        <div
          className={styles.dockHotZone}
          onMouseEnter={() => setIsRevealed(true)}
        />
      )}

      <nav
        ref={dockRef}
        className={`${styles.dockRoot} ${isDockHidden ? styles.dockHidden : ''}`}
        onMouseLeave={() => autoHide && setIsRevealed(false)}
        role="toolbar"
        aria-label="Applications Dock"
      >
        <div className={styles.dockContainer}>
          {/* App Launcher / Launchpad Button */}
          <div className={styles.dockItemContainer}>
            <button
              type="button"
              className={`${styles.dockItemBtn} ${isLauncherOpen ? styles.btnActive : ''}`}
              onClick={toggleLauncher}
              aria-label="Applications Launcher"
              title=""
            >
              <div className={`${styles.dockIconBadge} ${styles.launcherBadge}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </div>
              <div className={styles.tooltip}>
                <span>App Launcher</span>
                <span className={styles.tooltipTag}>All Apps</span>
              </div>
            </button>
          </div>

          {/* Quick Command Palette Button */}
          <div className={styles.dockItemContainer}>
            <button
              type="button"
              className={styles.dockItemBtn}
              onClick={onOpenCommandSearch}
              aria-label="Command Search"
              title=""
            >
              <div className={`${styles.dockIconBadge} ${styles.searchBadge}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <div className={styles.tooltip}>
                <span>Spotlight Search</span>
                <span className={styles.tooltipTag}>Ctrl+K</span>
              </div>
            </button>
          </div>

          {/* Mission Control / Task View Button */}
          <div className={styles.dockItemContainer}>
            <button
              type="button"
              className={styles.dockItemBtn}
              onClick={toggleOverview}
              aria-label={dockMode === DOCK_MODES.TASKBAR ? 'Task View' : 'Mission Control'}
              title=""
            >
              <div className={`${styles.dockIconBadge} ${styles.overviewBadge}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </div>
              <div className={styles.tooltip}>
                <span>{dockMode === DOCK_MODES.TASKBAR ? 'Task View' : 'Mission Control'}</span>
                <span className={styles.tooltipTag}>Desktops</span>
              </div>
            </button>
          </div>

          <div className={styles.dockDivider} />

          {/* Pinned Applications */}
          {pinnedAppIds.map((id) => renderDockItem(id))}

          {/* Unpinned Running Applications */}
          {unpinnedRunningAppIds.length > 0 && (
            <>
              <div className={styles.dockDivider} />
              {unpinnedRunningAppIds.map((id) => renderDockItem(id, true))}
            </>
          )}
        </div>

        {/* Custom Context Menu */}
        {renderContextMenu()}
      </nav>
    </>
  );

  // Helper for Context Menu Rendering
  function renderContextMenu() {
    if (!contextMenu) return null;

    const app = getAppById(contextMenu.appId);
    if (!app || !canUserLaunchApp(app, userRole)) return null;

    const isRunning = runningAppIds.includes(contextMenu.appId);
    const isPinned = pinnedAppIds.includes(contextMenu.appId);
    const appWins = windows.filter((w) => w.appId === contextMenu.appId);
    const isFirstPinned = pinnedAppIds.indexOf(contextMenu.appId) === 0;
    const isLastPinned = pinnedAppIds.indexOf(contextMenu.appId) === pinnedAppIds.length - 1;

    return (
      <div
        className={styles.contextMenu}
        style={{
          left: `${Math.min(window.innerWidth - 220, Math.max(10, contextMenu.x - 100))}px`,
          bottom: dockMode === DOCK_MODES.TASKBAR ? '54px' : '84px',
        }}
      >
        <div className={styles.contextHeader}>
          <span
            className={styles.contextIcon}
            style={{ backgroundColor: app.icon?.badgeColor || '#6366f1' }}
          />
          <span className={styles.contextTitle}>{app.name}</span>
        </div>

        <div className={styles.contextDivider} />

        <button
          type="button"
          className={styles.contextItem}
          onClick={() => {
            handleAppClick(app.id);
            setContextMenu(null);
          }}
        >
          <span>{isRunning ? 'Bring to Front' : 'Open Application'}</span>
        </button>

        {app.supportsMultiInstance && (
          <button
            type="button"
            className={styles.contextItem}
            onClick={() => {
              onOpenApp(app.id, { id: `${app.id}_${Date.now()}` });
              setContextMenu(null);
            }}
          >
            <span>Open New Window</span>
          </button>
        )}

        {isRunning && (
          <>
            <button
              type="button"
              className={styles.contextItem}
              onClick={() => {
                appWins.forEach((w) => minimizeWindow(w.id));
                setContextMenu(null);
              }}
            >
              <span>Minimize</span>
            </button>
            <button
              type="button"
              className={styles.contextItem}
              onClick={() => {
                appWins.forEach((w) => closeWindow(w.id));
                setContextMenu(null);
              }}
            >
              <span className={styles.contextDanger}>Close Window</span>
            </button>
          </>
        )}

        <div className={styles.contextDivider} />

        {/* Pin / Unpin */}
        <button
          type="button"
          className={styles.contextItem}
          onClick={() => togglePin(app.id)}
        >
          <span>{isPinned ? 'Unpin from Dock' : 'Pin to Dock'}</span>
        </button>

        {/* Reordering */}
        {isPinned && (
          <>
            {!isFirstPinned && (
              <button
                type="button"
                className={styles.contextItem}
                onClick={() => moveApp(app.id, 'left')}
              >
                <span>Move Left</span>
              </button>
            )}
            {!isLastPinned && (
              <button
                type="button"
                className={styles.contextItem}
                onClick={() => moveApp(app.id, 'right')}
              >
                <span>Move Right</span>
              </button>
            )}
          </>
        )}

        <div className={styles.contextDivider} />

        {/* Dock Settings */}
        <button
          type="button"
          className={styles.contextItem}
          onClick={() => {
            updateMode(dockMode === DOCK_MODES.DOCK ? DOCK_MODES.TASKBAR : DOCK_MODES.DOCK);
            setContextMenu(null);
          }}
        >
          <span>
            {dockMode === DOCK_MODES.DOCK
              ? 'Switch to Windows Taskbar'
              : 'Switch to macOS Dock'}
          </span>
        </button>

        <button
          type="button"
          className={styles.contextItem}
          onClick={() => {
            updateAutoHide(!autoHide);
            setContextMenu(null);
          }}
        >
          <span>{autoHide ? 'Disable Auto-Hide' : 'Enable Auto-Hide'}</span>
        </button>
      </div>
    );
  }
}

export default Dock;
