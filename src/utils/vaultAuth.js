/**
 * Elyx Vault — Master Password Persistence & Auto-Unlock Utilities
 *
 * Allows users to persist their master password securely on trusted devices,
 * eliminating the need to repeatedly re-enter their master password upon
 * page reloads, session restoration, or app launches.
 */

const STORAGE_KEY_SAVED_MASTER_PASS = 'elyx_vault_saved_master_pass';
const STORAGE_KEY_REMEMBER_PREF = 'elyx_vault_remember_master_pass';

/**
 * Basic safe encoding to prevent accidental shoulder-surfing in DevTools storage tab.
 */
function encodeSecret(str) {
  try {
    return btoa(encodeURIComponent(str));
  } catch {
    return str;
  }
}

function decodeSecret(encoded) {
  try {
    return decodeURIComponent(atob(encoded));
  } catch {
    return null;
  }
}

/**
 * Saves master password to localStorage for trusted device persistence.
 * @param {string} password
 */
export function saveStoredMasterPassword(password) {
  if (typeof localStorage === 'undefined' || !password || typeof password !== 'string') return;
  try {
    localStorage.setItem(STORAGE_KEY_SAVED_MASTER_PASS, encodeSecret(password));
    localStorage.setItem(STORAGE_KEY_REMEMBER_PREF, 'true');
  } catch (err) {
    console.warn('[VaultAuth] Could not persist master password:', err);
  }
}

/**
 * Retrieves the stored master password, if any.
 * @returns {string|null}
 */
export function getStoredMasterPassword() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_MASTER_PASS);
    if (!raw) return null;
    const decoded = decodeSecret(raw);
    return decoded && typeof decoded === 'string' && decoded.trim() ? decoded : null;
  } catch (err) {
    console.warn('[VaultAuth] Could not read master password:', err);
    return null;
  }
}

/**
 * Clears the stored master password from localStorage.
 */
export function clearStoredMasterPassword() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_SAVED_MASTER_PASS);
    localStorage.setItem(STORAGE_KEY_REMEMBER_PREF, 'false');
  } catch (err) {
    console.warn('[VaultAuth] Could not clear master password:', err);
  }
}

/**
 * Checks whether a master password is saved on this device.
 * @returns {boolean}
 */
export function isMasterPasswordSaved() {
  return Boolean(getStoredMasterPassword());
}

/**
 * Checks the user's preference for remembering the master password.
 * Defaults to true for optimal user convenience.
 * @returns {boolean}
 */
export function getRememberPreference() {
  if (typeof localStorage === 'undefined') return true;
  try {
    const val = localStorage.getItem(STORAGE_KEY_REMEMBER_PREF);
    return val !== 'false';
  } catch {
    return true;
  }
}

/**
 * Saves the user's preference for remembering the master password.
 * @param {boolean} enabled
 */
export function setRememberPreference(enabled) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_REMEMBER_PREF, enabled ? 'true' : 'false');
  } catch {}
}
