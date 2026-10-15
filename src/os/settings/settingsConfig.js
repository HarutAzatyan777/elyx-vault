/**
 * Elyx OS 1.0 — Settings Schema & Persistence Configuration
 */

export const STORAGE_KEY_OS_SETTINGS = 'elyx_os_settings';

export const DEFAULT_OS_SETTINGS = Object.freeze({
  desktopMode: 'macos',
  mobileMode: 'ios',
  accentColor: '#6366f1',
  reducedMotion: false,
  notificationsEnabled: true,
  notificationPrivacy: true,
  disabledNotificationCategories: [],
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
      if (!stored) {
        const legacyTheme = localStorage.getItem('elyx_vault_theme');
        return {
          ...DEFAULT_OS_SETTINGS,
          theme: ['light', 'dark'].includes(legacyTheme)
            ? legacyTheme
            : DEFAULT_OS_SETTINGS.theme,
          desktopMode:
            localStorage.getItem('elyx_dock_mode') === 'taskbar'
              ? 'windows'
              : 'macos',
          mobileMode:
            localStorage.getItem('elyx_mobile_theme') === 'android'
              ? 'android'
              : 'ios',
        };
      }
      if (stored) {
        return {
          ...DEFAULT_OS_SETTINGS,
          ...normalizeSettings(JSON.parse(stored)),
        };
      }
    }
  } catch (err) {
    console.warn(
      '[OS Settings] Invalid or unavailable preferences; using defaults.',
    );
  }
  return { ...DEFAULT_OS_SETTINGS };
};

export const saveOSSettings = (settings) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY_OS_SETTINGS,
        JSON.stringify(normalizeSettings(settings)),
      );
    }
  } catch (err) {
    console.error('[OS Settings] Failed to save settings:', err);
  }
};

export function normalizeSettings(input = {}) {
  const result = { ...DEFAULT_OS_SETTINGS };
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return result;
  for (const key of Object.keys(result)) {
    if (typeof input[key] === typeof result[key]) result[key] = input[key];
  }
  for (const [key, values] of Object.entries({
    theme: ['light', 'dark', 'system'],
    desktopMode: ['macos', 'windows', 'gnome'],
    mobileMode: ['ios', 'android'],
  })) {
    if (!values.includes(result[key])) result[key] = DEFAULT_OS_SETTINGS[key];
  }
  if (!/^#[0-9a-f]{6}$/i.test(result.accentColor))
    result.accentColor = DEFAULT_OS_SETTINGS.accentColor;
  result.disabledNotificationCategories = Array.isArray(
    input.disabledNotificationCategories,
  )
    ? input.disabledNotificationCategories.filter((x) =>
        ['system', 'security', 'media', 'workspace', 'devices'].includes(x),
      )
    : [];
  if (![0, 1, 5, 15, 30, 60, 240, 1440].includes(result.autoLockMinutes))
    result.autoLockMinutes = DEFAULT_OS_SETTINGS.autoLockMinutes;
  return result;
}
