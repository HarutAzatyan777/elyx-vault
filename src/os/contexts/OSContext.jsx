import {
  enqueueNotification,
  markNotificationsRead,
} from '../notifications/notificationState.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getOSFeatureFlags,
  isOSModeEnabled,
  setOSModeEnabled,
} from '../config/featureFlags.js';
import {
  loadOSSettings,
  saveOSSettings,
  normalizeSettings,
} from '../settings/settingsConfig.js';
import {
  loadActiveWorkspace,
  loadWorkspaces,
  saveActiveWorkspace,
  saveWorkspaces,
  WORKSPACE_MODES,
} from '../workspaces/types.js';

export const OSContext = createContext(null);

export const OSProvider = ({ children }) => {
  const { user } = useAuth();
  useEffect(() => {
    setNotifications([]);
  }, [user?.uid]);
  useEffect(() => {
    const clear = () => setNotifications([]);
    window.addEventListener('elyx:vault-locked', clear);
    return () => window.removeEventListener('elyx:vault-locked', clear);
  }, []);
  // Feature flag & OS mode state
  const [isOSMode, setIsOSModeState] = useState(isOSModeEnabled);
  const [featureFlags, setFeatureFlags] = useState(getOSFeatureFlags);

  // Settings & appearance
  const [settings, setSettingsState] = useState(loadOSSettings);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Virtual Workspaces (GNOME Shell inspired)
  const [workspaces, setWorkspaces] = useState(loadWorkspaces);
  const [activeWorkspace, setActiveWorkspaceState] =
    useState(loadActiveWorkspace);
  const [workspaceMode, setWorkspaceMode] = useState(WORKSPACE_MODES.DESKTOP);

  // Launcher state (Spotlight / App Grid)
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);

  // Notifications Queue
  const [notifications, setNotifications] = useState([]);

  // Listen for external / cross-tab mode changes
  useEffect(() => {
    const handleModeChange = (e) => {
      if (typeof e?.detail?.enabled === 'boolean') {
        setIsOSModeState(e.detail.enabled);
      }
    };

    const handleFlagsChange = (e) => {
      if (e?.detail) {
        setFeatureFlags(e.detail);
      }
    };

    window.addEventListener('elyx:os-mode-changed', handleModeChange);
    window.addEventListener('elyx:os-flags-changed', handleFlagsChange);

    return () => {
      window.removeEventListener('elyx:os-mode-changed', handleModeChange);
      window.removeEventListener('elyx:os-flags-changed', handleFlagsChange);
    };
  }, []);

  const setOSMode = useCallback((enabled) => {
    const next = Boolean(enabled);
    setOSModeEnabled(next);
    setIsOSModeState(next);
  }, []);

  const toggleOSMode = useCallback(() => {
    setOSMode(!isOSMode);
  }, [isOSMode, setOSMode]);

  const updateSettings = useCallback((partial) => {
    const next = normalizeSettings({ ...settingsRef.current, ...partial });
    settingsRef.current = next;
    saveOSSettings(next);
    setSettingsState(next);
    window.dispatchEvent(
      new CustomEvent('elyx:settings-changed', { detail: next }),
    );
  }, []);

  useEffect(() => {
    const sync = (event) =>
      setSettingsState(normalizeSettings(event.detail || loadOSSettings()));
    window.addEventListener('elyx:settings-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('elyx:settings-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--elyx-accent-primary', settings.accentColor);
    root.style.setProperty('--accent', settings.accentColor);
    root.dataset.reducedMotion = String(
      settings.reducedMotion || !settings.animationsEnabled,
    );
    root.dataset.desktopMode = settings.desktopMode;
  }, [settings]);

  // Workspace Operations
  const switchWorkspace = useCallback((workspaceId) => {
    setActiveWorkspaceState(workspaceId);
    saveActiveWorkspace(workspaceId);
  }, []);

  const createWorkspace = useCallback(
    (name) => {
      setWorkspaces((prev) => {
        const newId = Date.now();
        const newWs = {
          id: newId,
          name: name || `Workspace ${prev.length + 1}`,
          icon: 'monitor',
        };
        const updated = [...prev, newWs];
        saveWorkspaces(updated);
        switchWorkspace(newId);
        return updated;
      });
    },
    [switchWorkspace],
  );

  const renameWorkspace = useCallback((id, newName) => {
    if (!newName?.trim()) return;
    setWorkspaces((prev) => {
      const updated = prev.map((ws) =>
        ws.id === id ? { ...ws, name: newName.trim() } : ws,
      );
      saveWorkspaces(updated);
      return updated;
    });
  }, []);

  const deleteWorkspace = useCallback(
    (id, onMigrateWindows) => {
      setWorkspaces((prev) => {
        if (prev.length <= 1) return prev; // Cannot delete last remaining workspace

        const fallback = prev.find((ws) => ws.id !== id) || prev[0];
        if (typeof onMigrateWindows === 'function') {
          onMigrateWindows(id, fallback.id);
        }

        const updated = prev.filter((ws) => ws.id !== id);
        saveWorkspaces(updated);

        if (activeWorkspace === id) {
          switchWorkspace(fallback.id);
        }
        return updated;
      });
    },
    [activeWorkspace, switchWorkspace],
  );

  const openOverview = useCallback(
    () => setWorkspaceMode(WORKSPACE_MODES.OVERVIEW),
    [],
  );
  const closeOverview = useCallback(
    () => setWorkspaceMode(WORKSPACE_MODES.DESKTOP),
    [],
  );
  const toggleOverview = useCallback(
    () =>
      setWorkspaceMode((prev) =>
        prev === WORKSPACE_MODES.OVERVIEW
          ? WORKSPACE_MODES.DESKTOP
          : WORKSPACE_MODES.OVERVIEW,
      ),
    [],
  );

  const openLauncher = useCallback(() => setIsLauncherOpen(true), []);
  const closeLauncher = useCallback(() => setIsLauncherOpen(false), []);
  const toggleLauncher = useCallback(
    () => setIsLauncherOpen((prev) => !prev),
    [],
  );

  const addNotification = useCallback((notification) => {
    const prefs = settingsRef.current;
    const id =
      notification.id ||
      `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setNotifications((prev) =>
      enqueueNotification(prev, { ...notification, id }, prefs),
    );
    return id;
  }, []);
  const markNotificationRead = useCallback(
    (id) => setNotifications((prev) => markNotificationsRead(prev, id)),
    [],
  );

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = useMemo(
    () => ({
      isOSMode,
      setOSMode,
      toggleOSMode,
      featureFlags,
      settings,
      updateSettings,
      workspaces,
      setWorkspaces,
      activeWorkspace,
      switchWorkspace,
      createWorkspace,
      renameWorkspace,
      deleteWorkspace,
      workspaceMode,
      setWorkspaceMode,
      openOverview,
      closeOverview,
      toggleOverview,
      isLauncherOpen,
      openLauncher,
      closeLauncher,
      toggleLauncher,
      notifications,
      addNotification,
      removeNotification,
      clearAllNotifications,
      markNotificationRead,
    }),
    [
      isOSMode,
      setOSMode,
      toggleOSMode,
      featureFlags,
      settings,
      updateSettings,
      workspaces,
      activeWorkspace,
      switchWorkspace,
      createWorkspace,
      renameWorkspace,
      deleteWorkspace,
      workspaceMode,
      openOverview,
      closeOverview,
      toggleOverview,
      isLauncherOpen,
      openLauncher,
      closeLauncher,
      toggleLauncher,
      notifications,
      addNotification,
      removeNotification,
      clearAllNotifications,
      markNotificationRead,
    ],
  );

  return <OSContext.Provider value={value}>{children}</OSContext.Provider>;
};

export default OSContext;
