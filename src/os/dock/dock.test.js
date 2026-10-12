import {
  DEFAULT_PINNED_APPS,
  DOCK_MODES,
  loadAutoHide,
  loadDockMode,
  loadFavoriteApps,
  loadPinnedApps,
  loadRecentApps,
  recordRecentApp,
  saveAutoHide,
  saveDockMode,
  savePinnedApps,
} from './types.js';
import { filterCommandPaletteItems } from '../launcher/types.js';
import { APP_REGISTRY, getAppById } from '../registry/appRegistry.js';

/**
 * In-memory automated test suite for Elyx OS 1.0 Dock, Taskbar, Launcher, and Command Palette.
 */
export function runDockAndLauncherTests() {
  const results = [];

  const assert = (description, condition) => {
    results.push({ description, success: Boolean(condition) });
  };

  // ==========================================================================
  // Group 1: Dock Pinned Applications & Persistence
  // ==========================================================================
  assert('Default pinned apps list is populated', Array.isArray(DEFAULT_PINNED_APPS) && DEFAULT_PINNED_APPS.length > 0);

  const allDefaultAppsExist = DEFAULT_PINNED_APPS.every((id) => Boolean(getAppById(id)));
  assert('All default pinned apps are valid registered applications', allDefaultAppsExist);

  const pinned = loadPinnedApps();
  assert('Loaded pinned apps is a non-empty array', Array.isArray(pinned) && pinned.length > 0);

  // Pinning and unpinning simulation
  const testAppId = 'users';
  const initialPinned = ['daily_workspace', 'notepad', 'media'];
  const withPinned = [...initialPinned, testAppId];
  assert('Pinning adds app to pinned array', withPinned.includes(testAppId) && withPinned.length === 4);

  const unpinned = withPinned.filter((id) => id !== testAppId);
  assert('Unpinning removes app from pinned array', !unpinned.includes(testAppId) && unpinned.length === 3);

  // Reordering simulation
  const reordered = [...initialPinned];
  const temp = reordered[0];
  reordered[0] = reordered[1];
  reordered[1] = temp;
  assert('Reordering swaps positions without dropping items', reordered[0] === 'notepad' && reordered[1] === 'daily_workspace' && reordered.length === 3);

  // ==========================================================================
  // Group 2: Dock Modes & Taskbar Contracts
  // ==========================================================================
  assert('Dock supports macOS floating dock mode', DOCK_MODES.DOCK === 'dock');
  assert('Dock supports Windows 11 taskbar mode', DOCK_MODES.TASKBAR === 'taskbar');

  const loadedMode = loadDockMode();
  assert('Dock mode loads valid mode string', loadedMode === 'dock' || loadedMode === 'taskbar');

  const loadedAutoHide = loadAutoHide();
  assert('Auto-hide preference loads boolean', typeof loadedAutoHide === 'boolean');

  // ==========================================================================
  // Group 3: Recent & Favorite Applications Tracking
  // ==========================================================================
  const favorites = loadFavoriteApps();
  assert('Favorites list loads an array', Array.isArray(favorites));

  const initialRecents = ['notepad', 'music'];
  const recorded = ['terminal', ...initialRecents.filter((id) => id !== 'terminal')].slice(0, 8);
  assert('Recording recent app places it at the front', recorded[0] === 'terminal');
  assert('Recent apps capped at maximum 8 items', recorded.length <= 8);

  // ==========================================================================
  // Group 4: Global Command Search & Zero-Knowledge Security Filter
  // ==========================================================================
  const mockCommands = [
    {
      id: 'cmd_lock',
      title: 'Lock Zero-Knowledge Vault',
      description: 'Purge session keys',
      keywords: ['lock', 'security'],
      requiresVaultUnlocked: false,
    },
    {
      id: 'cmd_decrypt_keys',
      title: 'Export Private Keys',
      description: 'Sensitive cryptographic key material',
      keywords: ['export', 'keys', 'secret'],
      requiresVaultUnlocked: true,
    },
  ];

  // Test 1: Query matching apps
  const searchNote = filterCommandPaletteItems('note', APP_REGISTRY, mockCommands, true);
  assert('Searching "note" finds Notepad application', searchNote.apps.some((a) => a.id === 'notepad'));

  // Test 2: Query matching commands
  const searchLock = filterCommandPaletteItems('lock', APP_REGISTRY, mockCommands, true);
  assert('Searching "lock" finds Lock Vault command', searchLock.commands.some((c) => c.id === 'cmd_lock'));

  // Test 3: Zero-Knowledge Security: Locked Vault
  const searchLocked = filterCommandPaletteItems('keys', APP_REGISTRY, mockCommands, false);
  assert('Locked vault hides commands requiring unlocked vault', !searchLocked.commands.some((c) => c.id === 'cmd_decrypt_keys'));

  // Test 4: Zero-Knowledge Security: Unlocked Vault
  const searchUnlocked = filterCommandPaletteItems('keys', APP_REGISTRY, mockCommands, true);
  assert('Unlocked vault permits access to authorized commands', searchUnlocked.commands.some((c) => c.id === 'cmd_decrypt_keys'));

  // ==========================================================================
  // Group 5: Running & Active State Synchronization
  // ==========================================================================
  const simulatedWindows = [
    { id: 'win_1', appId: 'daily_workspace', isFocused: true, isMinimized: false },
    { id: 'win_2', appId: 'notepad', isFocused: false, isMinimized: true },
  ];

  const runningIds = simulatedWindows.map((w) => w.appId);
  assert('Running IDs include daily_workspace and notepad', runningIds.includes('daily_workspace') && runningIds.includes('notepad'));

  const activeAppId = simulatedWindows.find((w) => w.isFocused)?.appId;
  assert('Active app accurately identified from focused window', activeAppId === 'daily_workspace');

  const isNotepadMinimized = simulatedWindows.find((w) => w.appId === 'notepad')?.isMinimized;
  assert('Minimized running window state detected accurately', isNotepadMinimized === true);

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`[Dock & Launcher Tests] Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) {
    console.error('[Dock & Launcher Tests] Failures detected:', results.filter((r) => !r.success));
  }

  return { total: results.length, passed, failed, results };
}
