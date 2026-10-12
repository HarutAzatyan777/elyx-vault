/**
 * Elyx OS 1.0 — Settings Schema & Persistence Configuration
 */

export const STORAGE_KEY_OS_SETTINGS = 'elyx_os_settings';

export const DEFAULT_OS_SETTINGS = Object.freeze({
  theme: 'dark', // 'dark' | 'light' | 'system'
  wallpaperId: 'elyx-aurora',
  dockPosition: 'bottom',
  dockSize: 60,
  dockMagnification: true,
  autoLockMinutes: 15, // Master password zero-knowledge auto-lock timeout
  windowSnapEnabled: true,
  animationsEnabled: true,
  acrylicVibrancy: true,
  soundEffects: false,
});

export const loadOSSettings = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_OS_SETTINGS);
      if (stored) {
        return { ...DEFAULT_OS_SETTINGS, ...JSON.parse(stored) };
      }
    }
  } catch (err) {
    console.warn('[OS Settings] Failed to load settings from storage:', err);
  }
  return { ...DEFAULT_OS_SETTINGS };
};

export const saveOSSettings = (settings) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY_OS_SETTINGS,
        JSON.stringify(settings)
      );
    }
  } catch (err) {
    console.error('[OS Settings] Failed to save settings:', err);
  }
};
