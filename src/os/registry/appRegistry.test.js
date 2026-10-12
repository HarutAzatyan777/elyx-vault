import {
  APP_REGISTRY,
  APP_REGISTRY_MAP,
  canUserLaunchApp,
  getAllApps,
  getAppById,
  getAppsByCategory,
  getPinnedDockApps,
} from './appRegistry.js';
import { APP_CATEGORIES } from './categories.js';

/**
 * In-memory test suite for Elyx OS 1.0 App Registry & contracts.
 */
export function runAppRegistryTests() {
  const results = [];

  const assert = (description, condition) => {
    results.push({ description, success: Boolean(condition) });
  };

  // Group 1: Registry Integrity & Module Coverage
  assert('Registry contains registered applications', APP_REGISTRY.length >= 10);
  assert('Registry map contains same count as array', APP_REGISTRY_MAP.size === APP_REGISTRY.length);

  const REQUIRED_IDS = [
    'daily_workspace',
    'notepad',
    'media',
    'music',
    'general',
    'minecraft',
    'devices',
    'terminal',
    'users',
    'settings',
    'extension',
  ];

  REQUIRED_IDS.forEach((id) => {
    const app = getAppById(id);
    assert(`App '${id}' exists in App Registry`, Boolean(app));
    assert(`App '${id}' has a non-empty name`, Boolean(app?.name && app.name.trim().length > 0));
    assert(`App '${id}' has a valid category`, Boolean(app?.category && Object.values(APP_CATEGORIES).some((c) => c.id === app.category)));
    assert(`App '${id}' has an icon object with valid path`, Boolean(app?.icon?.path));
    assert(`App '${id}' has valid default window sizes`, Boolean(app?.defaultWindowSize?.width && app?.defaultWindowSize?.height));
    assert(`App '${id}' has valid min window sizes`, Boolean(app?.minWindowSize?.width && app?.minWindowSize?.height));
    assert(`App '${id}' default width >= min width`, app?.defaultWindowSize?.width >= app?.minWindowSize?.width);
    assert(`App '${id}' default height >= min height`, app?.defaultWindowSize?.height >= app?.minWindowSize?.height);
    assert(`App '${id}' has mobileBehavior defined`, ['full-screen', 'modal-sheet', 'responsive-card', 'embedded'].includes(app?.mobileBehavior));
  });

  // Group 2: Role-Based Launch Permissions
  assert('Owner can launch Remote Terminal', canUserLaunchApp('terminal', 'owner'));
  assert('Manager can launch Remote Terminal', canUserLaunchApp('terminal', 'manager'));
  assert('Viewer CANNOT launch Remote Terminal', !canUserLaunchApp('terminal', 'viewer'));
  assert('Member CANNOT launch Remote Terminal', !canUserLaunchApp('terminal', 'member'));

  assert('Owner can launch User Management', canUserLaunchApp('users', 'owner'));
  assert('Manager can launch User Management', canUserLaunchApp('users', 'manager'));
  assert('Member CANNOT launch User Management', !canUserLaunchApp('users', 'member'));
  assert('Viewer CANNOT launch User Management', !canUserLaunchApp('users', 'viewer'));

  assert('Viewer CAN launch Notepad', canUserLaunchApp('notepad', 'viewer'));
  assert('Viewer CAN launch Media Vault', canUserLaunchApp('media', 'viewer'));
  assert('Viewer CAN launch Daily Workspace', canUserLaunchApp('daily_workspace', 'viewer'));

  // Group 3: Categories & Query Helpers
  const productivityApps = getAppsByCategory(APP_CATEGORIES.PRODUCTIVITY.id);
  assert('Productivity category includes Daily Workspace and Notepad', productivityApps.length >= 2);

  const pinnedApps = getPinnedDockApps();
  assert('Dock has default pinned apps', pinnedApps.length >= 4);

  const allApps = getAllApps();
  assert('getAllApps returns complete registry list', allApps.length === APP_REGISTRY.length);

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`[AppRegistry Tests] Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) {
    console.error('[AppRegistry Tests] Failures detected:', results.filter((r) => !r.success));
  }

  return { total: results.length, passed, failed, results };
}
