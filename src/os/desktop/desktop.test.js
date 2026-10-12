import {
  DEFAULT_DESKTOP_CONFIG,
  WALLPAPER_PRESETS,
  getWallpaperBackground,
} from './types.js';
import { getAllApps, getAppById } from '../registry/appRegistry.js';

/**
 * In-memory test suite for Elyx OS 1.0 Desktop Shell.
 */
export function runDesktopShellTests() {
  const results = [];

  const assert = (description, condition) => {
    results.push({ description, success: Boolean(condition) });
  };

  // Group 1: Wallpaper Presets and Themes
  assert('Wallpaper presets array is populated', WALLPAPER_PRESETS.length >= 4);

  WALLPAPER_PRESETS.forEach((wp) => {
    assert(`Preset '${wp.id}' has non-empty name`, Boolean(wp.name));
    assert(`Preset '${wp.id}' has darkCss defined`, Boolean(wp.darkCss && wp.darkCss.includes('gradient')));
    assert(`Preset '${wp.id}' has lightCss defined`, Boolean(wp.lightCss && wp.lightCss.includes('gradient')));
    assert(`Preset '${wp.id}' has accent color defined`, Boolean(wp.accentColor && wp.accentColor.startsWith('#')));
  });

  const auroraDark = getWallpaperBackground('elyx-aurora', 'dark');
  assert('Aurora dark background returned for dark theme', auroraDark.includes('rgba(99, 102, 241'));

  const auroraLight = getWallpaperBackground('elyx-aurora', 'light');
  assert('Aurora light background returned for light theme', auroraLight.includes('rgba(129, 140, 248'));

  const fallbackWp = getWallpaperBackground('non-existent-wallpaper', 'dark');
  assert('Fallback returns default aurora wallpaper', Boolean(fallbackWp));

  // Group 2: Desktop Configuration
  assert('Default desktop config has wallpaperId', Boolean(DEFAULT_DESKTOP_CONFIG.wallpaperId));
  assert('Default desktop config has showDesktopIcons true', DEFAULT_DESKTOP_CONFIG.showDesktopIcons === true);
  assert('Default desktop config has widgetsEnabled true', DEFAULT_DESKTOP_CONFIG.widgetsEnabled === true);

  // Group 3: App Icons on Desktop
  const apps = getAllApps();
  assert('All apps have valid SVGs for desktop icon rendering', apps.every((a) => a.icon && a.icon.path));

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`[DesktopShell Tests] Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) {
    console.error('[DesktopShell Tests] Failures detected:', results.filter((r) => !r.success));
  }

  return { total: results.length, passed, failed, results };
}
