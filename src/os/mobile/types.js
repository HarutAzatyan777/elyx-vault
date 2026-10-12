/**
 * Elyx OS 1.0 — Mobile Architecture Contracts & Types
 * Fusion of iOS Human Interface Guidelines and Android Material You (Material 3)
 */

export const MOBILE_THEMES = Object.freeze({
  IOS: 'ios',
  ANDROID: 'android',
});

export const MOBILE_PRESENTATION_MODES = Object.freeze({
  HOME: 'home',
  APP_FULLSCREEN: 'app-fullscreen',
  APP_SWITCHER: 'app-switcher',
  APP_DRAWER: 'app-drawer',
  QUICK_SETTINGS: 'quick-settings',
  BOTTOM_SHEET: 'bottom-sheet',
});

export const MOBILE_NAV_STYLES = Object.freeze({
  GESTURE_BAR: 'gesture-bar',   // iOS Home Indicator pill & Android gesture line
  THREE_BUTTON: 'three-button', // Android Back, Home, Recents
});

export const DEFAULT_MOBILE_CONFIG = Object.freeze({
  theme: MOBILE_THEMES.IOS,               // 'ios' | 'android'
  navStyle: MOBILE_NAV_STYLES.GESTURE_BAR, // 'gesture-bar' | 'three-button'
  hapticFeedbackEnabled: true,
  swipeThreshold: 60,                     // px
  dockMaxItems: 4,
  gridColumns: 4,
  touchTargetMin: 44,                     // px (iOS HIG min)
  safeAreaTop: 'env(safe-area-inset-top, 0px)',
  safeAreaBottom: 'env(safe-area-inset-bottom, 0px)',
});

export const STORAGE_KEY_MOBILE_THEME = 'elyx_mobile_theme';
export const STORAGE_KEY_MOBILE_NAV_STYLE = 'elyx_mobile_nav_style';
export const STORAGE_KEY_DEVICE_MODE = 'elyx_device_mode'; // 'auto' | 'mobile' | 'desktop'

export function loadMobileTheme() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_MOBILE_THEME);
      if (stored === MOBILE_THEMES.ANDROID || stored === MOBILE_THEMES.IOS) {
        return stored;
      }
    }
  } catch {}
  return MOBILE_THEMES.IOS;
}

export function saveMobileTheme(theme) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_MOBILE_THEME, theme);
    }
  } catch {}
}

export function loadMobileNavStyle() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_MOBILE_NAV_STYLE);
      if (stored === MOBILE_NAV_STYLES.THREE_BUTTON || stored === MOBILE_NAV_STYLES.GESTURE_BAR) {
        return stored;
      }
    }
  } catch {}
  return MOBILE_NAV_STYLES.GESTURE_BAR;
}

export function saveMobileNavStyle(navStyle) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_MOBILE_NAV_STYLE, navStyle);
    }
  } catch {}
}

export function loadDeviceMode() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_DEVICE_MODE);
      if (['auto', 'mobile', 'desktop'].includes(stored)) {
        return stored;
      }
    }
  } catch {}
  return 'auto';
}

export function saveDeviceMode(mode) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DEVICE_MODE, mode);
    }
  } catch {}
}
