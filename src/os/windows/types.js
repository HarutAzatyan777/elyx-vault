/**
 * Elyx OS 1.0 — Window Architecture Contracts & Types
 * Inspired by Windows 11 Fluent Windowing & macOS Quartz Window Server
 */

export const TOP_BAR_HEIGHT = 38;

/**
 * Window Snap Positions (Windows 11 Snap Assist inspired)
 */
export const SNAP_POSITIONS = Object.freeze({
  NONE: 'none',
  MAXIMIZE: 'maximize',
  LEFT_HALF: 'left_half',
  RIGHT_HALF: 'right_half',
  TOP_HALF: 'top_half',
  BOTTOM_HALF: 'bottom_half',
  TOP_LEFT_CORNER: 'top_left_corner',
  TOP_RIGHT_CORNER: 'top_right_corner',
  BOTTOM_LEFT_CORNER: 'bottom_left_corner',
  BOTTOM_RIGHT_CORNER: 'bottom_right_corner',
});

/**
 * Window Display States
 */
export const WINDOW_STATES = Object.freeze({
  NORMAL: 'normal',
  MINIMIZED: 'minimized',
  MAXIMIZED: 'maximized',
  SNAPPED: 'snapped',
  FULLSCREEN: 'fullscreen',
});

/**
 * Helper to compute initial window bounds centered on screen.
 * 
 * @param {{ width: number, height: number }} defaultSize 
 * @param {{ width: number, height: number }} viewport 
 * @param {number} cascadeOffsetIndex 
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export const calculateCenteredWindowBounds = (
  defaultSize = { width: 900, height: 600 },
  viewport = { width: typeof window !== 'undefined' ? window.innerWidth : 1280, height: typeof window !== 'undefined' ? window.innerHeight : 800 },
  cascadeOffsetIndex = 0
) => {
  const cascadeStep = 32;
  const padding = 24;

  const availableHeight = Math.max(300, viewport.height - TOP_BAR_HEIGHT - padding * 2);
  const availableWidth = Math.max(360, viewport.width - padding * 2);

  const w = Math.min(defaultSize.width, availableWidth);
  const h = Math.min(defaultSize.height, availableHeight);

  const initialX = Math.max(padding, Math.round((viewport.width - w) / 2));
  const initialY = Math.max(TOP_BAR_HEIGHT + 16, Math.round((viewport.height - h) / 2));

  const offset = (cascadeOffsetIndex % 6) * cascadeStep;
  const x = Math.min(viewport.width - w - padding, initialX + offset);
  const y = Math.min(viewport.height - h - padding, initialY + offset);

  return {
    x: Math.max(padding, x),
    y: Math.max(TOP_BAR_HEIGHT + 8, y),
    width: Math.max(360, w),
    height: Math.max(280, h),
  };
};

/**
 * Computes bounds for a fully maximized window filling the work area under the Top Bar.
 * 
 * @param {{ width: number, height: number }} viewport 
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export const getMaximizedBounds = (
  viewport = { width: typeof window !== 'undefined' ? window.innerWidth : 1280, height: typeof window !== 'undefined' ? window.innerHeight : 800 }
) => {
  return {
    x: 0,
    y: TOP_BAR_HEIGHT,
    width: viewport.width,
    height: Math.max(300, viewport.height - TOP_BAR_HEIGHT),
  };
};

/**
 * Constrains window coordinates and dimensions to accessible viewport boundaries.
 * 
 * @param {{ x: number, y: number, width: number, height: number }} bounds 
 * @param {{ width: number, height: number }} viewport 
 * @param {{ width: number, height: number }} minSize 
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export const constrainWindowBounds = (
  bounds,
  viewport = { width: typeof window !== 'undefined' ? window.innerWidth : 1280, height: typeof window !== 'undefined' ? window.innerHeight : 800 },
  minSize = { width: 400, height: 320 }
) => {
  const minW = minSize.width || 400;
  const minH = minSize.height || 320;

  // Enforce size limits
  const width = Math.max(minW, Math.min(bounds.width, viewport.width));
  const height = Math.max(minH, Math.min(bounds.height, viewport.height - TOP_BAR_HEIGHT));

  // Enforce position limits: keep titlebar within visible viewport bounds
  // At least 140px of titlebar must remain accessible horizontally
  const minVisibleTitle = 140;
  const minX = -width + minVisibleTitle;
  const maxX = viewport.width - minVisibleTitle;
  const x = Math.max(minX, Math.min(bounds.x, maxX));

  // Top titlebar must never go above TopBar (y >= TOP_BAR_HEIGHT)
  // and must not be pushed past bottom of screen
  const minY = TOP_BAR_HEIGHT;
  const maxY = viewport.height - 40;
  const y = Math.max(minY, Math.min(bounds.y, maxY));

  return { x, y, width, height };
};

/**
 * Computes exact viewport-aware coordinates for snapping a window.
 * 
 * @param {string} snapPosition 
 * @param {{ width: number, height: number }} viewport 
 * @param {number} dockHeight 
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export const getSnappedBounds = (
  snapPosition,
  viewport = { width: typeof window !== 'undefined' ? window.innerWidth : 1280, height: typeof window !== 'undefined' ? window.innerHeight : 800 },
  dockHeight = 0
) => {
  const availableY = TOP_BAR_HEIGHT;
  const availableHeight = Math.max(300, viewport.height - TOP_BAR_HEIGHT - dockHeight);
  const halfWidth = Math.round(viewport.width / 2);
  const halfHeight = Math.round(availableHeight / 2);

  switch (snapPosition) {
    case SNAP_POSITIONS.MAXIMIZE:
      return { x: 0, y: availableY, width: viewport.width, height: availableHeight };

    case SNAP_POSITIONS.LEFT_HALF:
      return { x: 0, y: availableY, width: halfWidth, height: availableHeight };

    case SNAP_POSITIONS.RIGHT_HALF:
      return { x: halfWidth, y: availableY, width: halfWidth, height: availableHeight };

    case SNAP_POSITIONS.TOP_HALF:
      return { x: 0, y: availableY, width: viewport.width, height: halfHeight };

    case SNAP_POSITIONS.BOTTOM_HALF:
      return { x: 0, y: availableY + halfHeight, width: viewport.width, height: halfHeight };

    case SNAP_POSITIONS.TOP_LEFT_CORNER:
      return { x: 0, y: availableY, width: halfWidth, height: halfHeight };

    case SNAP_POSITIONS.TOP_RIGHT_CORNER:
      return { x: halfWidth, y: availableY, width: halfWidth, height: halfHeight };

    case SNAP_POSITIONS.BOTTOM_LEFT_CORNER:
      return { x: 0, y: availableY + halfHeight, width: halfWidth, height: halfHeight };

    case SNAP_POSITIONS.BOTTOM_RIGHT_CORNER:
      return { x: halfWidth, y: availableY + halfHeight, width: halfWidth, height: halfHeight };

    default:
      return calculateCenteredWindowBounds({ width: 900, height: 600 }, viewport);
  }
};

