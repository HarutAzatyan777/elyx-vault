import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useOS } from '../hooks/useOS.js';
import { useWindowManager } from '../hooks/useWindowManager.js';
import { WORKSPACE_MODES } from './types.js';
import styles from './WorkspaceOverview.module.css';

export function WorkspaceOverview() {
  const {
    workspaces,
    activeWorkspace,
    switchWorkspace,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    workspaceMode,
    closeOverview,
  } = useOS();

  const {
    windows,
    focusWindow,
    restoreWindow,
    closeWindow,
    moveWindowToWorkspace,
    migrateWindowsFromDeletedWorkspace,
  } = useWindowManager();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(activeWorkspace);
  const [filterMode, setFilterMode] = useState('current'); // 'current' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  // Inline rename state
  const [editingWsId, setEditingWsId] = useState(null);
  const [editingWsName, setEditingWsName] = useState('');
  const renameInputRef = useRef(null);

  // Sync selectedWorkspaceId when activeWorkspace changes
  useEffect(() => {
    setSelectedWorkspaceId(activeWorkspace);
  }, [activeWorkspace]);

  // Focus rename input when editing starts
  useEffect(() => {
    if (editingWsId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingWsId]);

  // Global keyboard shortcuts while Overview is active (Esc to close, Left/Right arrow to cycle workspaces)
  useEffect(() => {
    if (workspaceMode !== WORKSPACE_MODES.OVERVIEW) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeOverview();
      } else if (e.key === 'ArrowRight' && !editingWsId) {
        e.preventDefault();
        const currentIndex = workspaces.findIndex((ws) => ws.id === selectedWorkspaceId);
        const nextIndex = (currentIndex + 1) % workspaces.length;
        setSelectedWorkspaceId(workspaces[nextIndex].id);
      } else if (e.key === 'ArrowLeft' && !editingWsId) {
        e.preventDefault();
        const currentIndex = workspaces.findIndex((ws) => ws.id === selectedWorkspaceId);
        const prevIndex = (currentIndex - 1 + workspaces.length) % workspaces.length;
        setSelectedWorkspaceId(workspaces[prevIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workspaceMode, closeOverview, editingWsId, workspaces, selectedWorkspaceId]);

  // Count open windows per workspace
  const windowCountByWorkspace = useMemo(() => {
    const counts = {};
    workspaces.forEach((ws) => {
      counts[ws.id] = 0;
    });
    windows.forEach((w) => {
      const wsId = w.workspaceId || 1;
      counts[wsId] = (counts[wsId] || 0) + 1;
    });
    return counts;
  }, [workspaces, windows]);

  // Filter windows based on selected workspace, search query, and filterMode
  const displayedWindows = useMemo(() => {
    let list = windows;

    if (filterMode === 'current') {
      list = list.filter((w) => (w.workspaceId || 1) === selectedWorkspaceId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((w) => w.title.toLowerCase().includes(q) || w.appId.toLowerCase().includes(q));
    }

    return list;
  }, [windows, filterMode, selectedWorkspaceId, searchQuery]);

  if (workspaceMode !== WORKSPACE_MODES.OVERVIEW) {
    return null;
  }

  const activeWsObj = workspaces.find((ws) => ws.id === selectedWorkspaceId) || workspaces[0];

  const handleStartRename = (ws, e) => {
    e?.stopPropagation();
    setEditingWsId(ws.id);
    setEditingWsName(ws.name);
  };

  const handleCommitRename = (wsId) => {
    if (editingWsName.trim()) {
      renameWorkspace(wsId, editingWsName.trim());
    }
    setEditingWsId(null);
  };

  const handleDeleteWorkspace = (wsId, e) => {
    e?.stopPropagation();
    if (workspaces.length <= 1) return;
    deleteWorkspace(wsId, migrateWindowsFromDeletedWorkspace);
    if (selectedWorkspaceId === wsId) {
      const remaining = workspaces.filter((ws) => ws.id !== wsId);
      if (remaining.length > 0) {
        setSelectedWorkspaceId(remaining[0].id);
      }
    }
  };

  const handleSelectWindow = (win) => {
    const targetWsId = win.workspaceId || 1;
    if (activeWorkspace !== targetWsId) {
      switchWorkspace(targetWsId);
    }
    if (win.isMinimized) {
      restoreWindow(win.id);
    }
    focusWindow(win.id);
    closeOverview();
  };

  const handleCreateNewWorkspace = () => {
    const newName = `Workspace ${workspaces.length + 1}`;
    createWorkspace(newName);
  };

  return (
    <div
      className={styles.overviewOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeOverview();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Mission Control and Workspace Overview"
    >
      {/* Top Header */}
      <header className={styles.overviewHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.titleArea}>
            <span className={styles.title}>Mission Control</span>
            <span className={styles.badge}>Activities Overview</span>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.shortcutHint}>
            <span className={styles.kbd}>Esc</span> to exit • <span className={styles.kbd}>← / →</span> navigate
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={closeOverview}
            title="Exit Mission Control (Esc)"
            aria-label="Close overview"
          >
            ×
          </button>
        </div>
      </header>

      {/* Workspace Strip Carousel */}
      <section className={styles.workspaceStripContainer} aria-label="Workspaces Strip">
        <div className={styles.stripHeader}>
          <span className={styles.stripTitle}>Virtual Desktops ({workspaces.length})</span>
        </div>

        <div className={styles.workspaceCards} role="tablist">
          {workspaces.map((ws, idx) => {
            const isSelected = ws.id === selectedWorkspaceId;
            const isEditing = editingWsId === ws.id;
            const count = windowCountByWorkspace[ws.id] || 0;

            return (
              <div
                key={ws.id}
                role="tab"
                aria-selected={isSelected}
                tabIndex={0}
                className={`${styles.workspaceCard} ${isSelected ? styles.workspaceCardActive : ''}`}
                onClick={() => setSelectedWorkspaceId(ws.id)}
                onDoubleClick={() => {
                  switchWorkspace(ws.id);
                  closeOverview();
                }}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardInfo}>
                    <span className={styles.wsIcon}>🖥️</span>
                    {isEditing ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        className={styles.wsNameInput}
                        value={editingWsName}
                        onChange={(e) => setEditingWsName(e.target.value)}
                        onBlur={() => handleCommitRename(ws.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCommitRename(ws.id);
                          if (e.key === 'Escape') setEditingWsId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className={styles.wsName} title={ws.name}>
                        {ws.name}
                      </span>
                    )}
                  </div>

                  <div className={styles.cardActions}>
                    {!isEditing && (
                      <button
                        type="button"
                        className={styles.cardMiniBtn}
                        onClick={(e) => handleStartRename(ws, e)}
                        title="Rename Virtual Desktop"
                        aria-label="Rename workspace"
                      >
                        ✎
                      </button>
                    )}
                    {workspaces.length > 1 && (
                      <button
                        type="button"
                        className={`${styles.cardMiniBtn} ${styles.cardMiniBtnDanger}`}
                        onClick={(e) => handleDeleteWorkspace(ws.id, e)}
                        title="Delete Workspace (Safely migrates windows)"
                        aria-label="Delete workspace"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.cardBottom}>
                  <span className={styles.windowCount}>
                    {count} {count === 1 ? 'window' : 'windows'}
                  </span>
                  <div className={styles.windowDots}>
                    {Array.from({ length: Math.min(count, 5) }).map((_, dotIdx) => (
                      <span key={dotIdx} className={styles.windowDot} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Workspace Button */}
          <button
            type="button"
            className={styles.newWorkspaceCard}
            onClick={handleCreateNewWorkspace}
            title="Create new virtual desktop"
            aria-label="Create new workspace"
          >
            <span className={styles.newWsIcon}>+</span>
            <span className={styles.newWsLabel}>New Desktop</span>
          </button>
        </div>
      </section>

      {/* Main Open Windows Grid Area */}
      <main className={styles.overviewMain}>
        <div className={styles.mainToolbar}>
          <div className={styles.toolbarLeft}>
            <h2 className={styles.activeWsHeading}>
              {filterMode === 'all' ? 'All Virtual Desktops' : activeWsObj?.name || 'Workspace'}
            </h2>
            <div className={styles.filterToggle}>
              <button
                type="button"
                className={`${styles.filterBtn} ${filterMode === 'current' ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterMode('current')}
              >
                Selected Desktop
              </button>
              <button
                type="button"
                className={`${styles.filterBtn} ${filterMode === 'all' ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterMode('all')}
              >
                All Windows ({windows.length})
              </button>
            </div>
          </div>

          <input
            type="text"
            className={styles.searchInput}
            placeholder="Filter open windows…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {displayedWindows.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🪟</div>
            <div className={styles.emptyTitle}>No Open Windows</div>
            <p className={styles.emptySubtitle}>
              {filterMode === 'current'
                ? `No windows are currently open in ${activeWsObj?.name || 'this workspace'}.`
                : 'No windows are currently open in any virtual desktop.'}
            </p>
          </div>
        ) : (
          <div className={styles.windowsGrid}>
            {displayedWindows.map((win) => {
              const wsForWin = workspaces.find((ws) => ws.id === (win.workspaceId || 1));
              const snapLabel =
                win.snapPosition && win.snapPosition !== 'none'
                  ? `Snapped: ${win.snapPosition.replace('_', ' ')}`
                  : win.isMaximized
                  ? 'Maximized'
                  : 'Floating';

              return (
                <div
                  key={win.id}
                  className={styles.windowCard}
                  onClick={() => handleSelectWindow(win)}
                  title={`Switch to ${win.title}`}
                >
                  {/* Card Header */}
                  <div className={styles.windowCardHeader} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.cardAppInfo}>
                      <span
                        className={styles.cardAppBadge}
                        style={{ backgroundColor: win.icon?.badgeColor || '#6366f1' }}
                      >
                        {win.icon?.symbol || '🪟'}
                      </span>
                      <span className={styles.cardAppTitle}>{win.title}</span>
                    </div>

                    <div className={styles.cardHeaderRight}>
                      {filterMode === 'all' && (
                        <span className={styles.cardWsTag}>{wsForWin?.name || 'Workspace'}</span>
                      )}
                      <button
                        type="button"
                        className={styles.cardCloseBtn}
                        onClick={() => closeWindow(win.id)}
                        title="Close Window"
                        aria-label={`Close ${win.title}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Window Preview Body Mockup */}
                  <div className={styles.windowCardBody}>
                    <div className={styles.miniAppIcon}>
                      {win.icon?.symbol || '📱'}
                    </div>
                    <div className={styles.previewMeta}>
                      <span className={styles.previewStatus}>{snapLabel}</span>
                      <span className={styles.previewSize}>
                        {Math.round(win.bounds.width)} × {Math.round(win.bounds.height)}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Move Window to Another Workspace */}
                  <div className={styles.windowCardFooter} onClick={(e) => e.stopPropagation()}>
                    <span className={styles.moveToLabel}>Desktop:</span>
                    <select
                      className={styles.moveToSelect}
                      value={win.workspaceId || 1}
                      onChange={(e) => {
                        const targetId = Number(e.target.value);
                        moveWindowToWorkspace(win.id, targetId);
                      }}
                      aria-label="Assign window to virtual desktop"
                    >
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default WorkspaceOverview;
