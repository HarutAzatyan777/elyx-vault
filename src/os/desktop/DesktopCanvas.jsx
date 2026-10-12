import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useOS } from '../hooks/useOS.js';
import { useAppRegistry } from '../hooks/useAppRegistry.js';
import { getWallpaperBackground } from './types.js';
import DesktopIcon from './DesktopIcon.jsx';
import DesktopWidgets from './DesktopWidgets.jsx';
import DesktopContextMenu from './DesktopContextMenu.jsx';
import styles from './DesktopCanvas.module.css';

export function DesktopCanvas({
  userRole = 'viewer',
  onOpenApp,
  projectsCount = 0,
  devicesCount = 0,
  isRTDBConnected = false,
  isVaultUnlocked = false,
  onLockVault,
  onUnlockVault,
  onOpenSettings,
}) {
  const { theme } = useTheme();
  const { settings, updateSettings, toggleOSMode } = useOS();
  const { launchableApps } = useAppRegistry(userRole);

  const canvasRef = useRef(null);

  // Wallpaper state
  const activeWallpaperId = settings.wallpaperId || 'elyx-aurora';
  const wallpaperBackground = useMemo(
    () => getWallpaperBackground(activeWallpaperId, theme),
    [activeWallpaperId, theme]
  );

  // Selected icon IDs
  const [selectedIconIds, setSelectedIconIds] = useState(new Set());

  // Context menu state
  const [contextMenuPos, setContextMenuPos] = useState(null); // { x: number, y: number } | null

  // Widget visibility state
  const [visibleWidgets, setVisibleWidgets] = useState({
    clock: true,
    session: true,
    storage: true,
    notes: true,
    favorites: true,
  });

  const handleToggleWidget = useCallback((widgetKey, isVisible) => {
    setVisibleWidgets((prev) => ({ ...prev, [widgetKey]: isVisible }));
  }, []);

  // Icon selection handlers
  const handleSelectIcon = useCallback((appId, isMulti) => {
    setSelectedIconIds((prev) => {
      const next = isMulti ? new Set(prev) : new Set();
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  }, []);

  const handleCanvasClick = useCallback((e) => {
    // Only deselect if clicked directly on the canvas surface, not an icon or widget
    if (e.target === canvasRef.current || e.target.classList.contains(styles.gridArea)) {
      setSelectedIconIds(new Set());
    }
    setContextMenuPos(null);
  }, []);

  // Right-click context menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  // Keyboard navigation for icons
  const handleKeyDown = useCallback(
    (e) => {
      if (selectedIconIds.size === 0) return;
      const ids = launchableApps.map((a) => a.id);
      const currentSelected = Array.from(selectedIconIds)[selectedIconIds.size - 1];
      const currentIndex = ids.indexOf(currentSelected);

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextId = ids[(currentIndex + 1) % ids.length];
        setSelectedIconIds(new Set([nextId]));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevId = ids[(currentIndex - 1 + ids.length) % ids.length];
        setSelectedIconIds(new Set([prevId]));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentSelected) {
          onOpenApp(currentSelected);
        }
      }
    },
    [selectedIconIds, launchableApps, onOpenApp]
  );

  return (
    <div
      ref={canvasRef}
      className={styles.canvas}
      style={{ background: wallpaperBackground }}
      onClick={handleCanvasClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Elyx OS Desktop Environment"
    >
      {/* Background Subtle Mesh Vignette */}
      <div className={styles.canvasVignette} aria-hidden="true" />

      {/* Desktop Icons Grid */}
      <div className={styles.gridArea}>
        <div className={styles.iconsGrid} role="list" aria-label="Desktop Applications">
          {launchableApps.map((app) => (
            <DesktopIcon
              key={app.id}
              app={app}
              isSelected={selectedIconIds.has(app.id)}
              onSelect={handleSelectIcon}
              onLaunch={onOpenApp}
            />
          ))}
        </div>
      </div>

      {/* Modular Desktop Widgets */}
      <DesktopWidgets
        visibleWidgets={visibleWidgets}
        onToggleWidget={handleToggleWidget}
        projectsCount={projectsCount}
        devicesCount={devicesCount}
        isRTDBConnected={isRTDBConnected}
        isVaultUnlocked={isVaultUnlocked}
        role={userRole}
        onOpenApp={onOpenApp}
      />

      {/* Right-Click Desktop Context Menu */}
      {contextMenuPos && (
        <DesktopContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onClose={() => setContextMenuPos(null)}
          currentWallpaperId={activeWallpaperId}
          onChangeWallpaper={(newWpId) => updateSettings({ wallpaperId: newWpId })}
          visibleWidgets={visibleWidgets}
          onToggleWidget={handleToggleWidget}
          isVaultUnlocked={isVaultUnlocked}
          onLockVault={onLockVault}
          onUnlockVault={onUnlockVault}
          onOpenSettings={onOpenSettings}
          onSwitchToClassic={toggleOSMode}
        />
      )}
    </div>
  );
}

export default DesktopCanvas;
