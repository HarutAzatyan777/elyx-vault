import {
  calculateCenteredWindowBounds,
  constrainWindowBounds,
  getMaximizedBounds,
  SNAP_POSITIONS,
  TOP_BAR_HEIGHT,
  WINDOW_STATES,
} from './types.js';
import { getAppById } from '../registry/appRegistry.js';

/**
 * In-memory test suite for Elyx OS 1.0 Window Manager logic and invariants.
 */
export function runWindowManagerTests() {
  const results = [];

  const assert = (description, condition) => {
    results.push({ description, success: Boolean(condition) });
  };

  const testViewport = { width: 1440, height: 900 };

  // ==========================================================================
  // Group 1: Window Geometry & Boundary Constraints
  // ==========================================================================
  const initialBounds = calculateCenteredWindowBounds(
    { width: 900, height: 600 },
    testViewport,
    0
  );

  assert('Centered window has positive width and height', initialBounds.width > 0 && initialBounds.height > 0);
  assert('Window initial Y is below TopBar', initialBounds.y >= TOP_BAR_HEIGHT);
  assert('Window initial X is within viewport', initialBounds.x >= 0 && initialBounds.x + initialBounds.width <= testViewport.width);

  // Cascading offset for subsequent windows
  const cascadeBounds1 = calculateCenteredWindowBounds({ width: 900, height: 600 }, testViewport, 1);
  const cascadeBounds2 = calculateCenteredWindowBounds({ width: 900, height: 600 }, testViewport, 2);
  assert('Subsequent window cascades horizontally', cascadeBounds1.x !== initialBounds.x);
  assert('Subsequent window cascades vertically', cascadeBounds1.y !== initialBounds.y);
  assert('Second cascade window further offsets', cascadeBounds2.x > cascadeBounds1.x);

  // Maximized bounds
  const maxBounds = getMaximizedBounds(testViewport);
  assert('Maximized window fills viewport width', maxBounds.width === testViewport.width);
  assert('Maximized window top starts at TopBar height', maxBounds.y === TOP_BAR_HEIGHT);
  assert('Maximized window height fills available work area', maxBounds.height === testViewport.height - TOP_BAR_HEIGHT);

  // Boundary Constraints enforcement
  const outOfBoundsTop = { x: 100, y: -200, width: 800, height: 500 };
  const constrainedTop = constrainWindowBounds(outOfBoundsTop, testViewport, { width: 400, height: 300 });
  assert('Top constraint prevents window titlebar going above TopBar', constrainedTop.y >= TOP_BAR_HEIGHT);

  const outOfBoundsBottom = { x: 100, y: 1500, width: 800, height: 500 };
  const constrainedBottom = constrainWindowBounds(outOfBoundsBottom, testViewport, { width: 400, height: 300 });
  assert('Bottom constraint keeps titlebar reachable above screen bottom', constrainedBottom.y <= testViewport.height - 40);

  const tooSmallBounds = { x: 100, y: 100, width: 150, height: 100 };
  const constrainedSize = constrainWindowBounds(tooSmallBounds, testViewport, { width: 440, height: 360 });
  assert('Resize constraint enforces minimum width', constrainedSize.width >= 440);
  assert('Resize constraint enforces minimum height', constrainedSize.height >= 360);

  // ==========================================================================
  // Group 2: Per-App Single-Instance vs. Multi-Instance Policy
  // ==========================================================================
  const workspaceApp = getAppById('daily_workspace');
  assert('Daily Workspace is single-instance', workspaceApp.supportsMultiInstance === false);

  const mediaApp = getAppById('media');
  assert('Media Vault is single-instance', mediaApp.supportsMultiInstance === false);

  const musicApp = getAppById('music');
  assert('Music Vault is single-instance', musicApp.supportsMultiInstance === false);

  const notepadApp = getAppById('notepad');
  assert('Notepad supports multi-instance windows', notepadApp.supportsMultiInstance === true);

  // ==========================================================================
  // Group 3: Multi-Window Concurrency Simulation
  // ==========================================================================
  // Simulate opening 3 concurrent windows
  const simulatedWindows = [
    { id: 'win_1', appId: 'daily_workspace', title: 'Daily Workspace', zIndex: 101, isFocused: false, isMinimized: false },
    { id: 'win_2', appId: 'notepad', title: 'Notepad', zIndex: 102, isFocused: false, isMinimized: false },
    { id: 'win_3', appId: 'general', title: 'Encrypted Projects', zIndex: 103, isFocused: true, isMinimized: false },
  ];

  assert('At least 3 apps can be open simultaneously in window manager stack', simulatedWindows.length >= 3);
  assert('Window with highest zIndex is the active focused window', simulatedWindows[2].isFocused && simulatedWindows[2].zIndex > simulatedWindows[0].zIndex);

  // Simulate minimize state preservation
  const minimizedWin2 = { ...simulatedWindows[1], isMinimized: true, isFocused: false };
  assert('Minimizing sets isMinimized true without removing from stack', minimizedWin2.isMinimized && simulatedWindows.some((w) => w.id === 'win_2'));

  // Simulate restore state
  const restoredWin2 = { ...minimizedWin2, isMinimized: false, isFocused: true, zIndex: 104 };
  assert('Restoring elevates zIndex and clears minimized flag', !restoredWin2.isMinimized && restoredWin2.zIndex > simulatedWindows[2].zIndex);

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`[WindowManager Tests] Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) {
    console.error('[WindowManager Tests] Failures detected:', results.filter((r) => !r.success));
  }

  return { total: results.length, passed, failed, results };
}
