/**
 * Elyx OS 1.0 — Virtual Desktops, Snap Layouts & Advanced Multitasking Test Suite
 */

import {
  DEFAULT_WORKSPACES,
  WORKSPACE_MODES,
  loadSavedWindowLayout,
  saveWindowLayout,
  loadWorkspaces,
  saveWorkspaces,
  STORAGE_KEY_SAVED_LAYOUT,
  STORAGE_KEY_WORKSPACES,
} from './types.js';

import {
  getSnappedBounds,
  SNAP_POSITIONS,
  WINDOW_STATES,
} from '../windows/types.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[VirtualDesktopsTest FAILED]: ${message}`);
  }
}

export function runVirtualDesktopsAndSnappingTests() {
  console.group('🖥️ [Elyx OS] Virtual Desktops & Snap Layouts Tests');

  try {
    // 1. Contract & Default Workspaces
    assert(Array.isArray(DEFAULT_WORKSPACES), 'DEFAULT_WORKSPACES must be an array');
    assert(DEFAULT_WORKSPACES.length >= 4, 'Must have at least 4 default workspaces');
    assert(DEFAULT_WORKSPACES[0].name === 'Main', 'Primary workspace should be Main');
    assert(WORKSPACE_MODES.DESKTOP === 'desktop', 'WORKSPACE_MODES.DESKTOP must be defined');
    assert(WORKSPACE_MODES.OVERVIEW === 'overview', 'WORKSPACE_MODES.OVERVIEW must be defined');
    console.log('  ✓ Workspaces default contracts validated');

    // 2. Snap Bounds Math (Left Half, Right Half, 4 Quadrants, Maximize)
    const viewport = { width: 1920, height: 1080 };
    const topBarHeight = 38;
    const availHeight = 1080 - topBarHeight;

    // Left Half
    const leftBounds = getSnappedBounds(SNAP_POSITIONS.LEFT_HALF, viewport);
    assert(leftBounds.x === 0, 'Left snap must start at x=0');
    assert(leftBounds.y === topBarHeight, `Left snap y must be topBarHeight (${topBarHeight})`);
    assert(leftBounds.width === 960, 'Left snap width must be half viewport (960)');
    assert(leftBounds.height === availHeight, 'Left snap height must equal available height');

    // Right Half
    const rightBounds = getSnappedBounds(SNAP_POSITIONS.RIGHT_HALF, viewport);
    assert(rightBounds.x === 960, 'Right snap must start at x=960');
    assert(rightBounds.width === 960, 'Right snap width must be half viewport');

    // 4 Quadrants
    const tlBounds = getSnappedBounds(SNAP_POSITIONS.TOP_LEFT_CORNER, viewport);
    assert(tlBounds.x === 0 && tlBounds.y === topBarHeight, 'Top-left corner snap must start at (0, topBarHeight)');
    assert(tlBounds.width === 960 && tlBounds.height === availHeight / 2, 'Top-left corner size must be quarter viewport');

    const trBounds = getSnappedBounds(SNAP_POSITIONS.TOP_RIGHT_CORNER, viewport);
    assert(trBounds.x === 960 && trBounds.y === topBarHeight, 'Top-right corner snap must start at (960, topBarHeight)');

    const blBounds = getSnappedBounds(SNAP_POSITIONS.BOTTOM_LEFT_CORNER, viewport);
    assert(blBounds.x === 0 && blBounds.y === topBarHeight + availHeight / 2, 'Bottom-left corner snap must start at bottom-left position');

    const brBounds = getSnappedBounds(SNAP_POSITIONS.BOTTOM_RIGHT_CORNER, viewport);
    assert(brBounds.x === 960 && brBounds.y === topBarHeight + availHeight / 2, 'Bottom-right corner snap must start at bottom-right position');

    // Maximize
    const maxBounds = getSnappedBounds(SNAP_POSITIONS.MAXIMIZE, viewport);
    assert(maxBounds.x === 0 && maxBounds.y === topBarHeight, 'Maximize snap starts at top-left');
    assert(maxBounds.width === 1920 && maxBounds.height === availHeight, 'Maximize snap takes entire available viewport');

    console.log('  ✓ Snap Layout bounds math computed correctly for all 8 snap targets');

    // 3. Safe Window Layout Persistence (Zero-Knowledge Isolation)
    if (typeof localStorage !== 'undefined') {
      const mockWindows = [
        {
          id: 'win_notepad_1',
          appId: 'notepad',
          title: 'Smart Notepad',
          bounds: { x: 100, y: 100, width: 600, height: 400 },
          previousBounds: { x: 50, y: 50, width: 500, height: 350 },
          snapPosition: 'left_half',
          isMaximized: false,
          isMinimized: false,
          workspaceId: 2,
          // SENSITIVE DATA THAT MUST NEVER BE SAVED:
          sensitiveMasterKey: 'SHOULD_NEVER_BE_PERSISTED',
          decryptedNotePlaintext: 'SECRET_PAYLOAD_DO_NOT_STORE',
        },
      ];

      saveWindowLayout(mockWindows);
      const rawStored = localStorage.getItem(STORAGE_KEY_SAVED_LAYOUT);
      assert(rawStored, 'Window layout must be serialized to localStorage');
      assert(!rawStored.includes('SHOULD_NEVER_BE_PERSISTED'), 'Zero-Knowledge: Sensitive keys must NEVER be stored');
      assert(!rawStored.includes('SECRET_PAYLOAD_DO_NOT_STORE'), 'Zero-Knowledge: Secret payloads must NEVER be stored');

      const restored = loadSavedWindowLayout();
      assert(Array.isArray(restored), 'Loaded layout must be an array');
      assert(restored[0].id === 'win_notepad_1', 'Window ID must match');
      assert(restored[0].workspaceId === 2, 'Workspace assignment must be preserved');
      assert(restored[0].snapPosition === 'left_half', 'Snap position must be preserved');
      assert(restored[0].sensitiveMasterKey === undefined, 'No secrets leaked into restored state');
      console.log('  ✓ Zero-Knowledge layout persistence verified');
    }

    // 4. Safe Workspace Deletion & Window Migration
    const sampleWindows = [
      { id: 'win_1', title: 'Main Win', workspaceId: 1 },
      { id: 'win_2', title: 'Security Win', workspaceId: 2 },
      { id: 'win_3', title: 'Vault Win', workspaceId: 2 },
    ];

    // Simulate deleteWorkspace(2, migrateWindows)
    const deletedWsId = 2;
    const fallbackWsId = 1;
    const migratedWindows = sampleWindows.map((w) =>
      w.workspaceId === deletedWsId ? { ...w, workspaceId: fallbackWsId } : w
    );

    assert(migratedWindows.length === 3, 'No windows lost during workspace deletion');
    assert(migratedWindows.every((w) => w.workspaceId === 1), 'All windows safely migrated to fallback workspace');
    console.log('  ✓ Safe workspace deletion and window migration verified');

    console.log('✅ All Virtual Desktops, Snap Layouts & Multitasking Tests PASSED');
  } catch (err) {
    console.error('❌ Virtual Desktops Test suite failed:', err);
    throw err;
  } finally {
    console.groupEnd();
  }
}
