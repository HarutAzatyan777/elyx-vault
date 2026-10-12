import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { getAppById } from '../registry/appRegistry.js';
import {
  calculateCenteredWindowBounds,
  constrainWindowBounds,
  getMaximizedBounds,
  getSnappedBounds,
  SNAP_POSITIONS,
  WINDOW_STATES,
} from '../windows/types.js';
import {
  loadSavedWindowLayout,
  saveWindowLayout,
} from '../workspaces/types.js';

export const WindowManagerContext = createContext(null);

export const WindowManagerProvider = ({ children }) => {
  // Initialize windows from saved layout if available
  const [windows, setWindows] = useState(() => {
    const saved = loadSavedWindowLayout();
    if (saved && saved.length > 0) {
      return saved
        .map((s, idx) => {
          const app = getAppById(s.appId);
          if (!app) return null;
          return {
            id: s.id,
            appId: s.appId,
            title: s.title || app.name,
            icon: app.icon,
            bounds: s.bounds,
            previousBounds: s.previousBounds || s.bounds,
            state:
              s.snapPosition !== SNAP_POSITIONS.NONE
                ? WINDOW_STATES.SNAPPED
                : s.isMaximized
                ? WINDOW_STATES.MAXIMIZED
                : WINDOW_STATES.NORMAL,
            snapPosition: s.snapPosition || SNAP_POSITIONS.NONE,
            isFocused: idx === saved.length - 1,
            isMinimized: Boolean(s.isMinimized),
            isMaximized: Boolean(s.isMaximized),
            zIndex: 100 + idx,
            workspaceId: s.workspaceId || 1,
            requiresMasterPassword: app.requiresMasterPassword,
            minSize: app.minWindowSize || { width: 440, height: 360 },
            customProps: {},
          };
        })
        .filter(Boolean);
    }
    return [];
  });

  const [activeWindowId, setActiveWindowId] = useState(() => {
    return windows.length > 0 ? windows[windows.length - 1].id : null;
  });
  const [topZIndex, setTopZIndex] = useState(() => 100 + windows.length);

  // Safely persist window layout changes
  useEffect(() => {
    const timer = setTimeout(() => {
      saveWindowLayout(windows);
    }, 200);
    return () => clearTimeout(timer);
  }, [windows]);

  // Automatically adapt windows when browser viewport changes
  useEffect(() => {
    const handleViewportResize = () => {
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      setWindows((prev) =>
        prev.map((win) => {
          if (win.isMaximized) {
            return {
              ...win,
              bounds: getMaximizedBounds(viewport),
            };
          }
          if (win.snapPosition && win.snapPosition !== SNAP_POSITIONS.NONE) {
            return {
              ...win,
              bounds: getSnappedBounds(win.snapPosition, viewport),
            };
          }
          return {
            ...win,
            bounds: constrainWindowBounds(win.bounds, viewport, win.minSize),
          };
        })
      );
    };

    window.addEventListener('resize', handleViewportResize);
    return () => window.removeEventListener('resize', handleViewportResize);
  }, []);

  /**
   * Focuses a window and elevates its stacking order.
   */
  const focusWindow = useCallback((windowId) => {
    setActiveWindowId(windowId);
    setTopZIndex((prev) => {
      const nextZ = prev + 1;
      setWindows((currentWindows) =>
        currentWindows.map((win) => {
          if (win.id === windowId) {
            return {
              ...win,
              isFocused: true,
              isMinimized: false,
              zIndex: nextZ,
            };
          }
          return win.isFocused ? { ...win, isFocused: false } : win;
        })
      );
      return nextZ;
    });
  }, []);

  /**
   * Opens an application window, or restores & focuses existing if single-instance.
   */
  const openWindow = useCallback(
    (appId, options = {}) => {
      const app = getAppById(appId);
      if (!app) {
        console.warn(`[WindowManager] Cannot open unknown app: ${appId}`);
        return null;
      }

      // Check for existing instance if single-instance app
      if (!app.supportsMultiInstance) {
        const existing = windows.find((win) => win.appId === appId);
        if (existing) {
          // If existing window is on a different workspace, update options or focus
          focusWindow(existing.id);
          return existing.id;
        }
      }

      const windowId = options.id || `${appId}_${Date.now()}`;
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const defaultBounds = calculateCenteredWindowBounds(
        app.defaultWindowSize,
        viewport,
        windows.length
      );

      const newWindow = {
        id: windowId,
        appId,
        title: options.title || app.name,
        icon: app.icon,
        bounds: options.bounds || defaultBounds,
        previousBounds: defaultBounds,
        state: WINDOW_STATES.NORMAL,
        snapPosition: SNAP_POSITIONS.NONE,
        isFocused: true,
        isMinimized: false,
        isMaximized: false,
        zIndex: topZIndex + 1,
        workspaceId: options.workspaceId || 1,
        requiresMasterPassword: app.requiresMasterPassword,
        minSize: app.minWindowSize || { width: 440, height: 360 },
        customProps: options.customProps || {},
      };

      setTopZIndex((prev) => prev + 1);
      setActiveWindowId(windowId);
      setWindows((prev) => [
        ...prev.map((w) => (w.isFocused ? { ...w, isFocused: false } : w)),
        newWindow,
      ]);

      return windowId;
    },
    [windows, topZIndex, focusWindow]
  );

  /**
   * Closes a window and cleans up its state.
   */
  const closeWindow = useCallback((windowId) => {
    setWindows((prev) => {
      const remaining = prev.filter((w) => w.id !== windowId);
      if (remaining.length > 0) {
        const visibleRemaining = remaining.filter((w) => !w.isMinimized);
        if (visibleRemaining.length > 0) {
          const nextActive = visibleRemaining.reduce((highest, current) =>
            current.zIndex > highest.zIndex ? current : highest
          );
          setActiveWindowId(nextActive.id);
          return remaining.map((w) =>
            w.id === nextActive.id ? { ...w, isFocused: true } : { ...w, isFocused: false }
          );
        }
      }
      setActiveWindowId(null);
      return remaining;
    });
  }, []);

  /**
   * Minimizes a window without unmounting its contents.
   */
  const minimizeWindow = useCallback((windowId) => {
    setWindows((prev) => {
      const updated = prev.map((w) =>
        w.id === windowId
          ? { ...w, isMinimized: true, isFocused: false, state: WINDOW_STATES.MINIMIZED }
          : w
      );

      const visible = updated.filter((w) => !w.isMinimized);
      if (visible.length > 0) {
        const nextActive = visible.reduce((highest, current) =>
          current.zIndex > highest.zIndex ? current : highest
        );
        setActiveWindowId(nextActive.id);
        return updated.map((w) =>
          w.id === nextActive.id ? { ...w, isFocused: true } : w
        );
      } else {
        setActiveWindowId(null);
      }

      return updated;
    });
  }, []);

  /**
   * Snaps a window to half, quadrant, or maximize layout.
   */
  const snapWindow = useCallback(
    (windowId, snapPosition) => {
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const snappedBounds = getSnappedBounds(snapPosition, viewport);

      setWindows((prev) =>
        prev.map((w) => {
          if (w.id === windowId) {
            const isFloating = w.snapPosition === SNAP_POSITIONS.NONE && !w.isMaximized;
            return {
              ...w,
              snapPosition,
              state:
                snapPosition === SNAP_POSITIONS.MAXIMIZE
                  ? WINDOW_STATES.MAXIMIZED
                  : WINDOW_STATES.SNAPPED,
              isMaximized: snapPosition === SNAP_POSITIONS.MAXIMIZE,
              bounds: snappedBounds,
              previousBounds: isFloating ? { ...w.bounds } : w.previousBounds,
            };
          }
          return w;
        })
      );

      focusWindow(windowId);
    },
    [focusWindow]
  );

  /**
   * Toggles maximization of a window between full work area and previous dimensions.
   */
  const maximizeWindow = useCallback(
    (windowId) => {
      const target = windows.find((w) => w.id === windowId);
      if (target?.isMaximized) {
        restoreWindow(windowId);
      } else {
        snapWindow(windowId, SNAP_POSITIONS.MAXIMIZE);
      }
    },
    [windows, snapWindow]
  );

  /**
   * Restores a minimized, maximized, or snapped window back to normal floating state.
   */
  const restoreWindow = useCallback(
    (windowId) => {
      setWindows((prev) =>
        prev.map((w) => {
          if (w.id === windowId) {
            return {
              ...w,
              isMinimized: false,
              isMaximized: false,
              snapPosition: SNAP_POSITIONS.NONE,
              state: WINDOW_STATES.NORMAL,
              bounds: w.previousBounds || w.bounds,
            };
          }
          return w;
        })
      );

      focusWindow(windowId);
    },
    [focusWindow]
  );

  /**
   * Updates window bounds (from dragging or resizing) with boundary constraints.
   */
  const updateWindowBounds = useCallback((windowId, rawBounds) => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };

    setWindows((prev) =>
      prev.map((w) => {
        if (w.id === windowId) {
          const constrained = constrainWindowBounds(
            { ...w.bounds, ...rawBounds },
            viewport,
            w.minSize
          );
          return {
            ...w,
            bounds: constrained,
            // If user dragged/resized while snapped/maximized, clear snap flag
            isMaximized: false,
            snapPosition: SNAP_POSITIONS.NONE,
            state: WINDOW_STATES.NORMAL,
          };
        }
        return w;
      })
    );
  }, []);

  /**
   * Moves a window to a different virtual workspace.
   */
  const moveWindowToWorkspace = useCallback((windowId, targetWorkspaceId) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === windowId ? { ...w, workspaceId: targetWorkspaceId } : w))
    );
  }, []);

  /**
   * Safe migration of all windows from a deleted workspace to a fallback workspace.
   */
  const migrateWindowsFromDeletedWorkspace = useCallback(
    (deletedWorkspaceId, fallbackWorkspaceId = 1) => {
      setWindows((prev) =>
        prev.map((w) =>
          w.workspaceId === deletedWorkspaceId ? { ...w, workspaceId: fallbackWorkspaceId } : w
        )
      );
    },
    []
  );

  const minimizeAllWindows = useCallback(() => {
    setWindows((prev) =>
      prev.map((w) => ({ ...w, isMinimized: true, isFocused: false }))
    );
    setActiveWindowId(null);
  }, []);

  const restoreAllWindows = useCallback(() => {
    setWindows((prev) =>
      prev.map((w) => ({ ...w, isMinimized: false }))
    );
  }, []);

  const closeAllWindows = useCallback(() => {
    setWindows([]);
    setActiveWindowId(null);
  }, []);

  const activeWindow = useMemo(
    () => windows.find((w) => w.id === activeWindowId) || null,
    [windows, activeWindowId]
  );

  const value = useMemo(
    () => ({
      windows,
      activeWindow,
      activeWindowId,
      focusWindow,
      openWindow,
      closeWindow,
      minimizeWindow,
      maximizeWindow,
      restoreWindow,
      snapWindow,
      updateWindowBounds,
      moveWindowToWorkspace,
      migrateWindowsFromDeletedWorkspace,
      minimizeAllWindows,
      restoreAllWindows,
      closeAllWindows,
    }),
    [
      windows,
      activeWindow,
      activeWindowId,
      focusWindow,
      openWindow,
      closeWindow,
      minimizeWindow,
      maximizeWindow,
      restoreWindow,
      snapWindow,
      updateWindowBounds,
      moveWindowToWorkspace,
      migrateWindowsFromDeletedWorkspace,
      minimizeAllWindows,
      restoreAllWindows,
      closeAllWindows,
    ]
  );

  return (
    <WindowManagerContext.Provider value={value}>
      {children}
    </WindowManagerContext.Provider>
  );
};

export default WindowManagerContext;
