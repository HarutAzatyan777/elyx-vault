/**
 * Elyx OS 1.0 — App Launcher & Command Palette Contracts & Types
 * Inspired by macOS Spotlight / Launchpad & Windows 11 PowerToys Run
 */

export const LAUNCHER_MODES = Object.freeze({
  GRID: 'grid',          // Fullscreen / Modal Launchpad App Grid
  SEARCH: 'search',      // Spotlight / Command Palette quick launcher
  CATEGORIZED: 'categorized', // GNOME-style grouped categories
});

export const COMMAND_DOMAINS = Object.freeze({
  APPS: 'apps',
  NAVIGATION: 'navigation',
  COMMANDS: 'commands',
  SETTINGS: 'settings',
});

export const DEFAULT_LAUNCHER_CONFIG = Object.freeze({
  mode: LAUNCHER_MODES.SEARCH,
  hotkey: 'ctrl+k',
  showRecentSearches: true,
  maxQuickResults: 8,
  blurBackdrop: true,
});

/**
 * Filters registered applications and system commands for Command Palette.
 * Enforces zero-knowledge security: sensitive decrypted data is NEVER exposed without authorization.
 * 
 * @param {string} query 
 * @param {Array} apps 
 * @param {Array} commands 
 * @param {boolean} isVaultUnlocked 
 * @returns {{ apps: Array, commands: Array, navigation: Array, settings: Array }}
 */
export function filterCommandPaletteItems(query = '', apps = [], commands = [], isVaultUnlocked = false) {
  const normalized = query.trim().toLowerCase();

  const matchedApps = apps.filter((app) => {
    if (!normalized) return true;
    return (
      app.name?.toLowerCase().includes(normalized) ||
      app.shortName?.toLowerCase().includes(normalized) ||
      app.description?.toLowerCase().includes(normalized) ||
      app.category?.toLowerCase().includes(normalized)
    );
  });

  const matchedCommands = commands.filter((cmd) => {
    // If command requires vault unlock and vault is locked, exclude or flag
    if (cmd.requiresVaultUnlocked && !isVaultUnlocked) {
      return false;
    }
    if (!normalized) return true;
    return (
      cmd.title?.toLowerCase().includes(normalized) ||
      cmd.description?.toLowerCase().includes(normalized) ||
      cmd.keywords?.some((k) => k.toLowerCase().includes(normalized))
    );
  });

  return {
    apps: matchedApps.slice(0, 6),
    commands: matchedCommands.slice(0, 8),
  };
}
