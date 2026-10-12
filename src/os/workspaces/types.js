/**
 * Elyx OS 1.0 — Virtual Workspaces Architecture Contracts & Types
 * Inspired by Linux GNOME Shell Activities Overview & macOS Spaces
 */

export const WORKSPACE_MODES = Object.freeze({
  DESKTOP: 'desktop',       // Normal workspace view
  OVERVIEW: 'overview',     // Scaled multi-workspace overview / activities
});

export const DEFAULT_WORKSPACES = Object.freeze([
  { id: 1, name: 'Main', icon: 'monitor' },
  { id: 2, name: 'Security & Vaults', icon: 'shield-lock' },
  { id: 3, name: 'Media & Audio', icon: 'music' },
  { id: 4, name: 'Developer & Cloud', icon: 'terminal' },
]);

export const DEFAULT_WORKSPACES_CONFIG = Object.freeze({
  totalWorkspaces: 4,
  dynamicWorkspaces: true,
  wrapNavigation: true,
  switchAnimationDuration: 300, // ms
});

export const STORAGE_KEY_WORKSPACES = 'elyx_workspaces';
export const STORAGE_KEY_ACTIVE_WORKSPACE = 'elyx_active_workspace';
export const STORAGE_KEY_SAVED_LAYOUT = 'elyx_window_layout';

/**
 * Loads workspaces list from localStorage, falling back to defaults.
 */
export function loadWorkspaces() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_WORKSPACES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[Workspaces] Failed to load from storage:', err);
  }
  return [...DEFAULT_WORKSPACES];
}

/**
 * Saves workspaces list to localStorage.
 */
export function saveWorkspaces(workspaces) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(workspaces));
    }
  } catch (err) {
    console.error('[Workspaces] Failed to save workspaces:', err);
  }
}

/**
 * Loads active workspace ID from localStorage.
 */
export function loadActiveWorkspace() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_WORKSPACE);
      if (stored) {
        const parsed = Number(stored);
        if (!isNaN(parsed)) return parsed;
      }
    }
  } catch {}
  return 1;
}

/**
 * Saves active workspace ID to localStorage.
 */
export function saveActiveWorkspace(workspaceId) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACTIVE_WORKSPACE, String(workspaceId));
    }
  } catch {}
}

/**
 * Safely loads window layouts (geometries and workspace assignments) from localStorage.
 * Critical: NEVER restores secrets or plaintext keys into an unlocked state!
 */
export function loadSavedWindowLayout() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_SAVED_LAYOUT);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => ({
            id: item.id,
            appId: item.appId,
            title: item.title,
            bounds: item.bounds,
            previousBounds: item.previousBounds,
            snapPosition: item.snapPosition || 'none',
            isMaximized: Boolean(item.isMaximized),
            isMinimized: Boolean(item.isMinimized),
            workspaceId: item.workspaceId || 1,
          }));
        }
      }
    }
  } catch (err) {
    console.warn('[WindowManager] Failed to load saved layout:', err);
  }
  return null;
}

/**
 * Safely persists open window layout without saving sensitive encrypted payloads.
 */
export function saveWindowLayout(windows) {
  try {
    if (typeof localStorage !== 'undefined' && Array.isArray(windows)) {
      const sanitized = windows.map((w) => ({
        id: w.id,
        appId: w.appId,
        title: w.title,
        bounds: w.bounds,
        previousBounds: w.previousBounds,
        snapPosition: w.snapPosition || 'none',
        isMaximized: Boolean(w.isMaximized),
        isMinimized: Boolean(w.isMinimized),
        workspaceId: w.workspaceId || 1,
      }));
      localStorage.setItem(STORAGE_KEY_SAVED_LAYOUT, JSON.stringify(sanitized));
    }
  } catch {}
}
