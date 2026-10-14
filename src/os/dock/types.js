import { getAppById } from '../registry/appRegistry.js';
/**
 * Elyx OS 1.0 — Dock & Taskbar Architecture Contracts & Types
 * Inspired by macOS Quartz Dock & Windows 11 Taskbar
 */

export const DOCK_POSITIONS = Object.freeze({
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
});

export const DOCK_MODES = Object.freeze({
  DOCK: 'dock', // macOS-inspired floating glass dock
  TASKBAR: 'taskbar', // Windows 11-inspired bottom taskbar with start button & running window tabs
});

export const DOCK_SIZES = Object.freeze({
  SMALL: 48,
  MEDIUM: 60,
  LARGE: 72,
});

export const DEFAULT_DOCK_CONFIG = Object.freeze({
  mode: DOCK_MODES.DOCK,
  position: DOCK_POSITIONS.BOTTOM,
  size: DOCK_SIZES.MEDIUM,
  magnification: true,
  magnificationScale: 1.25,
  autoHide: false,
  showRecentApps: true,
  indicatorActiveColor: '#6366f1',
  indicatorRunningColor: 'rgba(255, 255, 255, 0.55)',
});

export const STORAGE_KEY_DOCK_PINNED = 'elyx_dock_pinned_apps';
export const STORAGE_KEY_DOCK_MODE = 'elyx_dock_mode';
export const STORAGE_KEY_DOCK_AUTOHIDE = 'elyx_dock_autohide';
export const STORAGE_KEY_RECENT_APPS = 'elyx_recent_apps';
export const STORAGE_KEY_FAVORITE_APPS = 'elyx_favorite_apps';

export const DEFAULT_PINNED_APPS = [
  'files',
  'daily_workspace',
  'notepad',
  'media',
  'music',
  'general',
  'devices',
  'terminal',
];

/**
 * Loads pinned app IDs from localStorage, falling back to defaults.
 */
export function loadPinnedApps() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_DOCK_PINNED);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return [
            ...new Set(
              parsed.filter((id) => typeof id === 'string' && getAppById(id)),
            ),
          ].slice(0, 40);
        }
      }
    }
  } catch (err) {
    console.warn('[Dock] Failed to load pinned apps:', err);
  }
  return [...DEFAULT_PINNED_APPS];
}

/**
 * Saves pinned app IDs to localStorage.
 */
export function savePinnedApps(apps) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DOCK_PINNED, JSON.stringify(apps));
    }
  } catch (err) {
    console.error('[Dock] Failed to save pinned apps:', err);
  }
}

/**
 * Loads dock display mode ('dock' | 'taskbar').
 */
export function loadDockMode() {
  try {
    if (typeof localStorage !== 'undefined') {
      const mode = localStorage.getItem(STORAGE_KEY_DOCK_MODE);
      if (mode === DOCK_MODES.DOCK || mode === DOCK_MODES.TASKBAR) {
        return mode;
      }
    }
  } catch {}
  return DOCK_MODES.DOCK;
}

/**
 * Saves dock display mode to localStorage.
 */
export function saveDockMode(mode) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DOCK_MODE, mode);
    }
  } catch {}
}

/**
 * Loads autoHide preference.
 */
export function loadAutoHide() {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_DOCK_AUTOHIDE) === 'true';
    }
  } catch {}
  return false;
}

/**
 * Saves autoHide preference.
 */
export function saveAutoHide(autoHide) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY_DOCK_AUTOHIDE,
        String(Boolean(autoHide)),
      );
      if (typeof window !== 'undefined')
        window.dispatchEvent(new Event('elyx:dock-changed'));
    }
  } catch {}
}

/**
 * Loads recent app IDs.
 */
export function loadRecentApps() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_RECENT_APPS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed))
          return [
            ...new Set(
              parsed.filter((id) => typeof id === 'string' && getAppById(id)),
            ),
          ].slice(0, 40);
      }
    }
  } catch {}
  return ['daily_workspace', 'notepad'];
}

/**
 * Records an app launch to recent applications list (max 8).
 */
export function recordRecentApp(appId) {
  try {
    if (typeof localStorage !== 'undefined' && appId) {
      const current = loadRecentApps().filter((id) => id !== appId);
      const updated = [appId, ...current].slice(0, 8);
      localStorage.setItem(STORAGE_KEY_RECENT_APPS, JSON.stringify(updated));
      return updated;
    }
  } catch {}
  return [];
}

/**
 * Loads favorite app IDs.
 */
export function loadFavoriteApps() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_FAVORITE_APPS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed))
          return [
            ...new Set(
              parsed.filter((id) => typeof id === 'string' && getAppById(id)),
            ),
          ].slice(0, 40);
      }
    }
  } catch {}
  return ['daily_workspace', 'notepad', 'music'];
}

/**
 * Saves favorite app IDs.
 */
export function saveFavoriteApps(favorites) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY_FAVORITE_APPS,
        JSON.stringify(favorites),
      );
    }
  } catch {}
}
