/**
 * Elyx OS 1.0 — Desktop Surface & Wallpaper Contracts & Types
 */

export const WALLPAPER_PRESETS = Object.freeze([
  {
    id: 'elyx-aurora',
    name: 'Elyx Cyber Aurora',
    type: 'gradient',
    darkCss: 'radial-gradient(ellipse at 80% 20%, rgba(99, 102, 241, 0.45) 0%, rgba(6, 182, 212, 0.3) 40%, rgba(15, 23, 42, 0.95) 75%, #030712 100%)',
    lightCss: 'radial-gradient(ellipse at 80% 20%, rgba(129, 140, 248, 0.35) 0%, rgba(34, 211, 238, 0.25) 40%, rgba(241, 245, 249, 0.9) 75%, #e2e8f0 100%)',
    accentColor: '#6366f1',
    thumbnail: '#0b1329',
  },
  {
    id: 'elyx-deep-space',
    name: 'Zero-Knowledge Nebula',
    type: 'gradient',
    darkCss: 'radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.5) 0%, rgba(15, 23, 42, 0.95) 60%, #020617 100%)',
    lightCss: 'radial-gradient(circle at 20% 80%, rgba(167, 139, 250, 0.35) 0%, rgba(248, 250, 252, 0.9) 60%, #cbd5e1 100%)',
    accentColor: '#8b5cf6',
    thumbnail: '#050816',
  },
  {
    id: 'elyx-glass-minimal',
    name: 'Obsidian Velvet',
    type: 'gradient',
    darkCss: 'linear-gradient(135deg, #090d16 0%, #0d1527 50%, #060913 100%)',
    lightCss: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)',
    accentColor: '#64748b',
    thumbnail: '#090d16',
  },
  {
    id: 'elyx-emerald-security',
    name: 'Vault Emerald',
    type: 'gradient',
    darkCss: 'radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.35) 0%, rgba(11, 19, 43, 0.9) 60%, #020617 100%)',
    lightCss: 'radial-gradient(circle at 50% 30%, rgba(52, 211, 153, 0.3) 0%, rgba(240, 253, 244, 0.9) 60%, #dcfce7 100%)',
    accentColor: '#10b981',
    thumbnail: '#061718',
  },
]);

export const DEFAULT_DESKTOP_CONFIG = Object.freeze({
  wallpaperId: 'elyx-aurora',
  showDesktopIcons: true,
  gridSnap: true,
  gridCellSize: { width: 96, height: 104 },
  contextMenuEnabled: true,
  widgetsEnabled: true,
});

/**
 * Returns the CSS background string for the active wallpaper and theme.
 * 
 * @param {string} wallpaperId 
 * @param {string} theme ('dark' | 'light')
 * @returns {string}
 */
export const getWallpaperBackground = (wallpaperId = 'elyx-aurora', theme = 'dark') => {
  const wallpaper =
    WALLPAPER_PRESETS.find((w) => w.id === wallpaperId) ||
    WALLPAPER_PRESETS[0];

  return theme === 'light' ? wallpaper.lightCss : wallpaper.darkCss;
};
