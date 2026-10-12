import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SNAP_POSITIONS } from './types.js';
import styles from './WindowFrame.module.css';

export function WindowFrame({
  win,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onSnap,
  onRestore,
  onUpdateBounds,
  workspaces = [],
  onMoveToWorkspace,
  isWorkspaceActive = true,
  children,
}) {
  const frameRef = useRef(null);
  const dragStartRef = useRef(null);
  const resizeStartRef = useRef(null);

  // Snap Layouts Flyout & Titlebar Menu
  const [showSnapFlyout, setShowSnapFlyout] = useState(false);
  const [titlebarMenu, setTitlebarMenu] = useState(null);
  const [snapGhost, setSnapGhost] = useState(null); // 'left' | 'right' | 'top' | null
  const snapTimerRef = useRef(null);

  // Focus window when clicked
  const handleContainerMouseDown = useCallback(
    (e) => {
      if (!win.isFocused) {
        onFocus(win.id);
      }
    },
    [win.isFocused, win.id, onFocus]
  );

  // Close menus when clicking outside
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (titlebarMenu && !e.target.closest(`.${styles.titlebarContextMenu}`)) {
        setTitlebarMenu(null);
      }
      if (showSnapFlyout && !e.target.closest(`.${styles.snapFlyout}`)) {
        setShowSnapFlyout(false);
      }
    };
    window.addEventListener('pointerdown', handleGlobalClick);
    return () => window.removeEventListener('pointerdown', handleGlobalClick);
  }, [titlebarMenu, showSnapFlyout]);

  // --------------------------------------------------------------------------
  // Title Bar Dragging & Edge Snapping
  // --------------------------------------------------------------------------
  const handleTitleBarPointerDown = useCallback(
    (e) => {
      if (e.target.closest('button') || e.target.closest(`.${styles.trafficLights}`)) {
        return;
      }

      onFocus(win.id);

      dragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialX: win.bounds.x,
        initialY: win.bounds.y,
        isMaximized: win.isMaximized,
      };

      const handlePointerMove = (moveEvent) => {
        if (!dragStartRef.current) return;
        const deltaX = moveEvent.clientX - dragStartRef.current.startX;
        const deltaY = moveEvent.clientY - dragStartRef.current.startY;

        // Check for edge snap candidates
        if (moveEvent.clientX <= 12) {
          setSnapGhost('left');
        } else if (moveEvent.clientX >= window.innerWidth - 12) {
          setSnapGhost('right');
        } else if (moveEvent.clientY <= 38) {
          setSnapGhost('top');
        } else {
          setSnapGhost(null);
        }

        onUpdateBounds({
          x: dragStartRef.current.initialX + deltaX,
          y: dragStartRef.current.initialY + deltaY,
        });
      };

      const handlePointerUp = (upEvent) => {
        // If dropped near an edge, snap window!
        if (upEvent.clientX <= 14 && onSnap) {
          onSnap(win.id, SNAP_POSITIONS.LEFT_HALF);
        } else if (upEvent.clientX >= window.innerWidth - 14 && onSnap) {
          onSnap(win.id, SNAP_POSITIONS.RIGHT_HALF);
        } else if (upEvent.clientY <= 38 && onSnap) {
          onSnap(win.id, SNAP_POSITIONS.MAXIMIZE);
        }

        setSnapGhost(null);
        dragStartRef.current = null;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [win.id, win.bounds.x, win.bounds.y, win.isMaximized, onFocus, onUpdateBounds, onSnap]
  );

  // Double click title bar to toggle maximize
  const handleTitleBarDoubleClick = useCallback(
    (e) => {
      if (e.target.closest('button')) return;
      onMaximize(win.id);
    },
    [win.id, onMaximize]
  );

  // Right click title bar for Context Menu
  const handleTitleBarContextMenu = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onFocus(win.id);
      setTitlebarMenu({
        x: Math.min(window.innerWidth - 220, Math.max(10, e.clientX)),
        y: Math.min(window.innerHeight - 260, Math.max(40, e.clientY)),
      });
    },
    [win.id, onFocus]
  );

  // --------------------------------------------------------------------------
  // 8-Direction Edge and Corner Resizing
  // --------------------------------------------------------------------------
  const startResize = useCallback(
    (direction, e) => {
      e.preventDefault();
      e.stopPropagation();

      onFocus(win.id);

      resizeStartRef.current = {
        direction,
        startX: e.clientX,
        startY: e.clientY,
        initialX: win.bounds.x,
        initialY: win.bounds.y,
        initialWidth: win.bounds.width,
        initialHeight: win.bounds.height,
        minWidth: win.minSize?.width || 440,
        minHeight: win.minSize?.height || 360,
      };

      const handleResizeMove = (moveEvent) => {
        if (!resizeStartRef.current) return;
        const {
          direction,
          startX,
          startY,
          initialX,
          initialY,
          initialWidth,
          initialHeight,
          minWidth,
          minHeight,
        } = resizeStartRef.current;

        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let newX = initialX;
        let newY = initialY;
        let newWidth = initialWidth;
        let newHeight = initialHeight;

        // Horizontal resizing
        if (direction.includes('e')) {
          newWidth = Math.max(minWidth, initialWidth + deltaX);
        } else if (direction.includes('w')) {
          const possibleWidth = initialWidth - deltaX;
          if (possibleWidth >= minWidth) {
            newWidth = possibleWidth;
            newX = initialX + deltaX;
          } else {
            newWidth = minWidth;
            newX = initialX + (initialWidth - minWidth);
          }
        }

        // Vertical resizing
        if (direction.includes('s')) {
          newHeight = Math.max(minHeight, initialHeight + deltaY);
        } else if (direction.includes('n')) {
          const possibleHeight = initialHeight - deltaY;
          if (possibleHeight >= minHeight) {
            newHeight = possibleHeight;
            newY = initialY + deltaY;
          } else {
            newHeight = minHeight;
            newY = initialY + (initialHeight - minHeight);
          }
        }

        onUpdateBounds({
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      };

      const handleResizeUp = () => {
        resizeStartRef.current = null;
        window.removeEventListener('pointermove', handleResizeMove);
        window.removeEventListener('pointerup', handleResizeUp);
        window.removeEventListener('pointercancel', handleResizeUp);
      };

      window.addEventListener('pointermove', handleResizeMove);
      window.addEventListener('pointerup', handleResizeUp);
      window.addEventListener('pointercancel', handleResizeUp);
    },
    [
      win.id,
      win.bounds.x,
      win.bounds.y,
      win.bounds.width,
      win.bounds.height,
      win.minSize,
      onFocus,
      onUpdateBounds,
    ]
  );

  // Keyboard accessibility: Ctrl+W to close
  useEffect(() => {
    if (!win.isFocused) return;

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        onClose(win.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [win.isFocused, win.id, onClose]);

  // CSS positioning & state
  const inlineStyle = {
    transform: `translate3d(${win.bounds.x}px, ${win.bounds.y}px, 0)`,
    width: `${win.bounds.width}px`,
    height: `${win.bounds.height}px`,
    zIndex: win.zIndex,
  };

  return (
    <>
      {/* Edge Snap Ghost Preview */}
      {snapGhost && (
        <div
          className={`${styles.snapGhostOverlay} ${
            snapGhost === 'left'
              ? styles.ghostLeft
              : snapGhost === 'right'
              ? styles.ghostRight
              : styles.ghostTop
          }`}
        />
      )}

      <div
        ref={frameRef}
        className={`${styles.windowContainer} ${win.isFocused ? styles.isFocused : styles.isInactive} ${
          win.isMaximized ? styles.isMaximized : ''
        } ${win.isMinimized ? styles.isMinimized : ''} ${
          win.snapPosition !== SNAP_POSITIONS.NONE ? styles.isSnapped : ''
        } ${!isWorkspaceActive ? styles.isInactiveWorkspace : ''}`}
        style={inlineStyle}
        onMouseDown={handleContainerMouseDown}
        role="region"
        aria-label={`${win.title} Window`}
        aria-hidden={win.isMinimized}
      >
        {/* Window Titlebar */}
        <div
          className={styles.titlebar}
          onPointerDown={handleTitleBarPointerDown}
          onDoubleClick={handleTitleBarDoubleClick}
          onContextMenu={handleTitleBarContextMenu}
        >
          {/* macOS Traffic Light Controls & Snap Flyout */}
          <div className={styles.trafficLights}>
            <button
              type="button"
              className={`${styles.trafficBtn} ${styles.trafficClose}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(win.id);
              }}
              title="Close (Ctrl+W)"
              aria-label="Close window"
            />
            <button
              type="button"
              className={`${styles.trafficBtn} ${styles.trafficMin}`}
              onClick={(e) => {
                e.stopPropagation();
                onMinimize(win.id);
              }}
              title="Minimize"
              aria-label="Minimize window"
            />

            {/* Maximize / Snap Button with Hover Flyout */}
            <div
              className={styles.maxBtnWrapper}
              onMouseEnter={() => {
                snapTimerRef.current = setTimeout(() => setShowSnapFlyout(true), 300);
              }}
              onMouseLeave={() => {
                clearTimeout(snapTimerRef.current);
              }}
            >
              <button
                type="button"
                className={`${styles.trafficBtn} ${styles.trafficMax}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onMaximize(win.id);
                  setShowSnapFlyout(false);
                }}
                title={win.isMaximized ? 'Restore' : 'Maximize (Hover for Snap Layouts)'}
                aria-label={win.isMaximized ? 'Restore window' : 'Maximize window'}
              />

              {/* Windows 11-Inspired Snap Layouts Flyout */}
              {showSnapFlyout && (
                <div
                  className={styles.snapFlyout}
                  onClick={(e) => e.stopPropagation()}
                  onMouseLeave={() => setShowSnapFlyout(false)}
                >
                  <div className={styles.snapFlyoutHeader}>Snap Layouts</div>

                  <div className={styles.snapGrid}>
                    {/* Template 1: Two Columns (50/50) */}
                    <div className={styles.snapTemplate}>
                      <button
                        type="button"
                        className={styles.snapZone}
                        onClick={() => {
                          onSnap(win.id, SNAP_POSITIONS.LEFT_HALF);
                          setShowSnapFlyout(false);
                        }}
                        title="Snap Left"
                      />
                      <button
                        type="button"
                        className={styles.snapZone}
                        onClick={() => {
                          onSnap(win.id, SNAP_POSITIONS.RIGHT_HALF);
                          setShowSnapFlyout(false);
                        }}
                        title="Snap Right"
                      />
                    </div>

                    {/* Template 2: Four Quadrants */}
                    <div className={`${styles.snapTemplate} ${styles.templateQuadrant}`}>
                      <button
                        type="button"
                        className={styles.snapZone}
                        onClick={() => {
                          onSnap(win.id, SNAP_POSITIONS.TOP_LEFT_CORNER);
                          setShowSnapFlyout(false);
                        }}
                        title="Top Left"
                      />
                      <button
                        type="button"
                        className={styles.snapZone}
                        onClick={() => {
                          onSnap(win.id, SNAP_POSITIONS.TOP_RIGHT_CORNER);
                          setShowSnapFlyout(false);
                        }}
                        title="Top Right"
                      />
                      <button
                        type="button"
                        className={styles.snapZone}
                        onClick={() => {
                          onSnap(win.id, SNAP_POSITIONS.BOTTOM_LEFT_CORNER);
                          setShowSnapFlyout(false);
                        }}
                        title="Bottom Left"
                      />
                      <button
                        type="button"
                        className={styles.snapZone}
                        onClick={() => {
                          onSnap(win.id, SNAP_POSITIONS.BOTTOM_RIGHT_CORNER);
                          setShowSnapFlyout(false);
                        }}
                        title="Bottom Right"
                      />
                    </div>

                    {/* Template 3: Top/Bottom Split */}
                    <div className={`${styles.snapTemplate} ${styles.templateRows}`}>
                      <button
                        type="button"
                        className={styles.snapZone}
                        onClick={() => {
                          onSnap(win.id, SNAP_POSITIONS.TOP_HALF);
                          setShowSnapFlyout(false);
                        }}
                        title="Top Half"
                      />
                      <button
                        type="button"
                        className={styles.snapZone}
                        onClick={() => {
                          onSnap(win.id, SNAP_POSITIONS.BOTTOM_HALF);
                          setShowSnapFlyout(false);
                        }}
                        title="Bottom Half"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Window Title & Icon */}
          <div className={styles.titleArea}>
            {win.icon && (
              <span
                className={styles.titleIconBadge}
                style={{ backgroundColor: win.icon?.badgeColor || '#6366f1' }}
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox={win.icon?.viewBox || '0 0 24 24'}
                  width="13"
                  height="13"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d={win.icon?.path}
                  />
                </svg>
              </span>
            )}
            <span className={styles.titleText}>{win.title}</span>
          </div>

          <div className={styles.titlebarSpacer} />
        </div>

        {/* Titlebar Context Menu */}
        {titlebarMenu && (
          <div
            className={styles.titlebarContextMenu}
            style={{ left: titlebarMenu.x, top: titlebarMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.menuHeader}>{win.title}</div>
            <div className={styles.menuDivider} />

            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                onMaximize(win.id);
                setTitlebarMenu(null);
              }}
            >
              <span>{win.isMaximized ? 'Restore Dimensions' : 'Maximize Window'}</span>
            </button>

            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                onSnap(win.id, SNAP_POSITIONS.LEFT_HALF);
                setTitlebarMenu(null);
              }}
            >
              <span>Snap to Left Half</span>
            </button>

            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                onSnap(win.id, SNAP_POSITIONS.RIGHT_HALF);
                setTitlebarMenu(null);
              }}
            >
              <span>Snap to Right Half</span>
            </button>

            {/* Move to Workspace Submenu */}
            {workspaces.length > 1 && (
              <>
                <div className={styles.menuDivider} />
                <div className={styles.menuSubHeader}>Move to Virtual Desktop</div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    className={`${styles.menuItem} ${
                      win.workspaceId === ws.id ? styles.menuItemActive : ''
                    }`}
                    onClick={() => {
                      onMoveToWorkspace?.(win.id, ws.id);
                      setTitlebarMenu(null);
                    }}
                  >
                    <span>{ws.name}</span>
                    {win.workspaceId === ws.id && <span>✓</span>}
                  </button>
                ))}
              </>
            )}

            <div className={styles.menuDivider} />

            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                onMinimize(win.id);
                setTitlebarMenu(null);
              }}
            >
              <span>Minimize Window</span>
            </button>

            <button
              type="button"
              className={`${styles.menuItem} ${styles.menuItemDanger}`}
              onClick={() => {
                onClose(win.id);
                setTitlebarMenu(null);
              }}
            >
              <span>Close (Ctrl+W)</span>
            </button>
          </div>
        )}

        {/* Window Body */}
        <div className={styles.windowContent}>{children}</div>

        {/* Resize Handles (8 directions, hidden when maximized or snapped) */}
        {!win.isMaximized && win.snapPosition === SNAP_POSITIONS.NONE && (
          <>
            <div
              className={`${styles.resizeHandle} ${styles.handleN}`}
              onPointerDown={(e) => startResize('n', e)}
            />
            <div
              className={`${styles.resizeHandle} ${styles.handleS}`}
              onPointerDown={(e) => startResize('s', e)}
            />
            <div
              className={`${styles.resizeHandle} ${styles.handleE}`}
              onPointerDown={(e) => startResize('e', e)}
            />
            <div
              className={`${styles.resizeHandle} ${styles.handleW}`}
              onPointerDown={(e) => startResize('w', e)}
            />
            <div
              className={`${styles.resizeHandle} ${styles.handleNE}`}
              onPointerDown={(e) => startResize('ne', e)}
            />
            <div
              className={`${styles.resizeHandle} ${styles.handleNW}`}
              onPointerDown={(e) => startResize('nw', e)}
            />
            <div
              className={`${styles.resizeHandle} ${styles.handleSE}`}
              onPointerDown={(e) => startResize('se', e)}
            />
            <div
              className={`${styles.resizeHandle} ${styles.handleSW}`}
              onPointerDown={(e) => startResize('sw', e)}
            />
          </>
        )}
      </div>
    </>
  );
}

export default WindowFrame;
