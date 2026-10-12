/**
 * Elyx OS 1.0 — System Feature Flags & Migration Controls
 * 
 * Provides runtime toggle controls between:
 * - 'os': Elyx OS 1.0 (Browser-based Personal Cloud OS)
 * - 'classic': Classic Elyx Vault Dashboard
 * 
 * Ensures 100% backward compatibility during progressive migration.
 */

const STORAGE_KEY_OS_ENABLED = 'elyx_os_mode_enabled';
const STORAGE_KEY_OS_FLAGS = 'elyx_os_feature_flags';

/**
 * Default OS Feature Flags configuration.
 */
export const DEFAULT_OS_FLAGS = {
  // Master flag: Elyx OS 1.0 Shell vs Classic Dashboard
  osShellEnabled: false,

  // Modular OS subsystems (enabled when osShellEnabled is active)
  virtualWorkspaces: true,
  dockMagnification: true,
  windowSnapAssist: true,
  iosMobileGestures: true,
  soundEffects: false,
  acrylicVibrancy: true,
  dynamicWallpapers: true,
};

/**
 * Resolves whether OS Mode is currently enabled.
 * Evaluates in priority order:
 * 1. URL Query Parameter (?mode=os | ?mode=classic | ?os=true | ?os=false)
 * 2. LocalStorage persistence ('elyx_os_mode_enabled')
 * 3. Default fallback (false - ensures existing dashboard works uninterrupted)
 * 
 * @returns {boolean}
 */
export const isOSModeEnabled = () => {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode')?.toLowerCase();
      const osParam = params.get('os')?.toLowerCase();

      if (modeParam === 'os' || osParam === 'true' || osParam === '1') {
        return true;
      }
      if (modeParam === 'classic' || osParam === 'false' || osParam === '0') {
        return false;
      }
    }

    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_OS_ENABLED);
      if (stored !== null) {
        return stored === 'true';
      }
    }
  } catch (err) {
    console.warn('[OS FeatureFlags] Error reading storage/url flags:', err);
  }

  return DEFAULT_OS_FLAGS.osShellEnabled;
};

/**
 * Sets OS Mode persistence and notifies listeners.
 * 
 * @param {boolean} enabled 
 */
export const setOSModeEnabled = (enabled) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_OS_ENABLED, String(Boolean(enabled)));
    }
    // Dispatch storage custom event for cross-tab or same-window synchronization
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('elyx:os-mode-changed', {
          detail: { enabled: Boolean(enabled) },
        })
      );
    }
  } catch (err) {
    console.error('[OS FeatureFlags] Failed to store OS mode:', err);
  }
};

/**
 * Retrieves all sub-feature flags with saved user overrides.
 * 
 * @returns {typeof DEFAULT_OS_FLAGS}
 */
export const getOSFeatureFlags = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_OS_FLAGS);
      if (stored) {
        return {
          ...DEFAULT_OS_FLAGS,
          ...JSON.parse(stored),
          osShellEnabled: isOSModeEnabled(),
        };
      }
    }
  } catch {}

  return {
    ...DEFAULT_OS_FLAGS,
    osShellEnabled: isOSModeEnabled(),
  };
};

/**
 * Updates a specific sub-feature flag.
 * 
 * @param {keyof typeof DEFAULT_OS_FLAGS} flagName 
 * @param {boolean} value 
 */
export const setOSFeatureFlag = (flagName, value) => {
  try {
    if (flagName === 'osShellEnabled') {
      setOSModeEnabled(value);
      return;
    }

    const current = getOSFeatureFlags();
    const updated = { ...current, [flagName]: Boolean(value) };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_OS_FLAGS, JSON.stringify(updated));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('elyx:os-flags-changed', {
          detail: updated,
        })
      );
    }
  } catch (err) {
    console.error('[OS FeatureFlags] Failed to update flag:', err);
  }
};
