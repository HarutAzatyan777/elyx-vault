import { getAppById } from '../registry/appRegistry.js';
import { constrainWindowBounds, SNAP_POSITIONS } from '../windows/types.js';
/**
 * Elyx OS 1.0 — Virtual Workspaces Architecture Contracts & Types
 * Inspired by Linux GNOME Shell Activities Overview & macOS Spaces
 */

export const WORKSPACE_MODES = Object.freeze({
  DESKTOP: 'desktop', // Normal workspace view
  OVERVIEW: 'overview', // Scaled multi-workspace overview / activities
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
          const valid = parsed
            .filter(
              (w) =>
                w &&
                Number.isSafeInteger(w.id) &&
                w.id > 0 &&
                typeof w.name === 'string',
            )
            .slice(0, 32)
            .map((w) => ({
              id: w.id,
              name: w.name.slice(0, 80),
              icon: typeof w.icon === 'string' ? w.icon : 'monitor',
            }));
          if (valid.length)
            return [...new Map(valid.map((w) => [w.id, w])).values()];
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
        if (
          Number.isSafeInteger(parsed) &&
          loadWorkspaces().some((w) => w.id === parsed)
        )
          return parsed;
      }
    }
  } catch {}
  return loadWorkspaces()[0].id;
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
export function loadSavedWindowLayout(uid) {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(
        uid ? `${STORAGE_KEY_SAVED_LAYOUT}:${uid}` : STORAGE_KEY_SAVED_LAYOUT,
      );
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return sanitizeWindowLayout(parsed);
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
export function saveWindowLayout(windows, uid) {
  try {
    if (typeof localStorage !== 'undefined' && Array.isArray(windows)) {
      const sanitized = sanitizeWindowLayout(windows);
      localStorage.setItem(
        uid ? `${STORAGE_KEY_SAVED_LAYOUT}:${uid}` : STORAGE_KEY_SAVED_LAYOUT,
        JSON.stringify(sanitized),
      );
    }
  } catch {}
}

export function sanitizeWindowLayout(
  input,
  viewport = { width: 1280, height: 800 },
) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const workspaceIds = new Set(loadWorkspaces().map((w) => w.id));
  return input.slice(0, 40).flatMap((item) => {
    const app = getAppById(item?.appId);
    if (
      !app ||
      typeof item.id !== 'string' ||
      item.id.length > 120 ||
      seen.has(item.id)
    )
      return [];
    if (
      !item.bounds ||
      !['x', 'y', 'width', 'height'].every((k) =>
        Number.isFinite(item.bounds[k]),
      )
    )
      return [];
    seen.add(item.id);
    const geometry = (bounds) =>
      constrainWindowBounds(
        Object.fromEntries(
          ['x', 'y', 'width', 'height'].map((k) => [k, bounds[k]]),
        ),
        viewport,
        app.minWindowSize,
      );
    return [
      {
        id: item.id,
        appId: app.id,
        bounds: geometry(item.bounds),
        previousBounds: geometry(
          item.previousBounds &&
            ['x', 'y', 'width', 'height'].every((k) =>
              Number.isFinite(item.previousBounds[k]),
            )
            ? item.previousBounds
            : item.bounds,
        ),
        snapPosition: Object.values(SNAP_POSITIONS).includes(item.snapPosition)
          ? item.snapPosition
          : 'none',
        isMaximized: Boolean(item.isMaximized),
        isMinimized: Boolean(item.isMinimized),
        workspaceId: workspaceIds.has(item.workspaceId)
          ? item.workspaceId
          : loadWorkspaces()[0].id,
      },
    ];
  });
}
