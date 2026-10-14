import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APP_REGISTRY } from '../registry/appRegistry.js';
import { useWindowManager } from '../hooks/useWindowManager.js';
import { useOS } from '../hooks/useOS.js';
import { useMusic } from '../../context/MusicContext.jsx';
import {
  COMMAND_DOMAINS,
  filterCommandPaletteItems,
} from './types.js';
import {
  loadDockMode,
  saveDockMode,
  DOCK_MODES,
  loadAutoHide,
  saveAutoHide,
} from '../dock/types.js';
import styles from './CommandPalette.module.css';

export function CommandPalette({
  isOpen,
  onClose,
  onOpenApp,
  onLockVault,
  onUnlockVault,
  onOpenSettings,
  onOpenAbout,
  onSwitchToClassic,
  isVaultUnlocked = false,
}) {
  const {
    minimizeAllWindows,
    restoreAllWindows,
    closeAllWindows,
  } = useWindowManager();

  const { settings, updateSettings, toggleOSMode } = useOS();
  const { togglePlayPause, isPlaying } = useMusic();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Focus input whenever Command Palette opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K listener handled by parent DesktopShell or hook
  // System commands catalog
  const systemCommands = useMemo(() => {
    const list = [
      {
        id: 'cmd_lock_vault',
        title: isVaultUnlocked ? 'Lock Elyx Vault' : 'Unlock Elyx Vault',
        description: isVaultUnlocked
          ? 'Purge decrypted session keys from RAM immediately'
          : 'Enter Master Password to decrypt protected storage',
        category: COMMAND_DOMAINS.COMMANDS,
        icon: isVaultUnlocked ? '🔒' : '🔓',
        action: isVaultUnlocked ? onLockVault : onUnlockVault,
        shortcut: 'Ctrl+L',
        keywords: ['lock', 'vault', 'security', 'password', 'aes', 'keys'],
      },
      {
        id: 'cmd_min_all',
        title: 'Minimize All Windows',
        description: 'Hide all open application windows to the Dock',
        category: COMMAND_DOMAINS.COMMANDS,
        icon: '🗕',
        action: minimizeAllWindows,
        shortcut: 'Ctrl+Shift+M',
        keywords: ['minimize', 'windows', 'desktop', 'hide'],
      },
      {
        id: 'cmd_restore_all',
        title: 'Bring All Windows to Front',
        description: 'Restore and elevate all open applications',
        category: COMMAND_DOMAINS.COMMANDS,
        icon: '🗖',
        action: restoreAllWindows,
        keywords: ['restore', 'windows', 'show'],
      },
      {
        id: 'cmd_close_all',
        title: 'Close All Windows',
        description: 'Terminate all active desktop window frames',
        category: COMMAND_DOMAINS.COMMANDS,
        icon: '✕',
        action: closeAllWindows,
        keywords: ['close', 'quit', 'exit', 'windows'],
      },
      {
        id: 'cmd_toggle_music',
        title: isPlaying ? 'Pause Music Playback' : 'Resume Music Playback',
        description: 'Control Elyx Music Vault background audio',
        category: COMMAND_DOMAINS.COMMANDS,
        icon: isPlaying ? '⏸' : '▶',
        action: togglePlayPause,
        keywords: ['music', 'audio', 'play', 'pause', 'song'],
      },
      {
        id: 'cmd_toggle_dock_mode',
        title: 'Toggle Taskbar / Dock Mode',
        description: 'Switch between macOS floating dock and Windows 11 taskbar',
        category: COMMAND_DOMAINS.SETTINGS,
        icon: '⚙',
        action: () => {
          const current = loadDockMode();
          const next = current === DOCK_MODES.DOCK ? DOCK_MODES.TASKBAR : DOCK_MODES.DOCK;
          saveDockMode(next);
          window.location.reload(); // Simple reload or reactive state
        },
        keywords: ['dock', 'taskbar', 'windows', 'macos', 'appearance'],
      },
      {
        id: 'cmd_toggle_autohide',
        title: 'Toggle Dock Auto-Hide',
        description: 'Automatically hide the dock until mouse enters bottom screen edge',
        category: COMMAND_DOMAINS.SETTINGS,
        icon: '👁',
        action: () => {
          const current = loadAutoHide();
          saveAutoHide(!current);
          window.location.reload();
        },
        keywords: ['autohide', 'dock', 'hide'],
      },
      {
        id: 'cmd_fullscreen',
        title: 'Toggle Fullscreen',
        description: 'Expand Elyx OS across entire monitor display',
        category: COMMAND_DOMAINS.COMMANDS,
        icon: '⛶',
        action: () => {
          if (document.fullscreenElement) {
            document.exitFullscreen?.();
          } else {
            document.documentElement.requestFullscreen?.();
          }
        },
        shortcut: 'F11',
        keywords: ['fullscreen', 'screen', 'expand'],
      },
      {
        id: 'cmd_settings',
        title: 'Open System Settings',
        description: 'Change wallpaper, security policies, and theme preferences',
        category: COMMAND_DOMAINS.NAVIGATION,
        icon: '⚙',
        action: onOpenSettings,
        keywords: ['settings', 'wallpaper', 'config', 'preferences'],
      },
      {
        id: 'cmd_about',
        title: 'About Elyx OS 1.0',
        description: 'View build version, architecture, and cryptographic specifications',
        category: COMMAND_DOMAINS.NAVIGATION,
        icon: 'ℹ',
        action: onOpenAbout,
        keywords: ['about', 'version', 'info'],
      },
      {
        id: 'cmd_classic_mode',
        title: 'Switch to Classic Dashboard',
        description: 'Return to classic web application layout',
        category: COMMAND_DOMAINS.NAVIGATION,
        icon: '⚡',
        action: onSwitchToClassic || toggleOSMode,
        keywords: ['classic', 'dashboard', 'switch', 'mode'],
      },
    ];

    return list;
  }, [
    isVaultUnlocked,
    isPlaying,
    onLockVault,
    onUnlockVault,
    minimizeAllWindows,
    restoreAllWindows,
    closeAllWindows,
    togglePlayPause,
    onOpenSettings,
    onOpenAbout,
    onSwitchToClassic,
    toggleOSMode,
  ]);

  // Combine Apps and Commands with security check
  const searchResults = useMemo(() => {
    const { apps, commands } = filterCommandPaletteItems(
      searchQuery,
      APP_REGISTRY,
      systemCommands,
      isVaultUnlocked
    );

    const formattedApps = apps.map((app) => ({
      id: `app_${app.id}`,
      title: app.name,
      description: app.description,
      category: COMMAND_DOMAINS.APPS,
      iconSvg: app.icon,
      badgeColor: app.icon?.badgeColor || '#6366f1',
      action: () => onOpenApp(app.id),
      isProtected: app.requiresMasterPassword,
    }));

    return [...formattedApps, ...commands];
  }, [searchQuery, systemCommands, isVaultUnlocked, onOpenApp]);

  // Execute selected result
  const handleExecuteItem = useCallback(
    (item) => {
      if (!item) return;
      item.action?.();
      onClose();
    },
    [onClose]
  );

  // Keyboard navigation inside Command Palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(searchResults.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleExecuteItem(searchResults[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, handleExecuteItem, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.paletteBackdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Search"
    >
      <div className={styles.paletteContainer} onClick={(e) => e.stopPropagation()}>
        {/* Search Bar Input */}
        <div className={styles.searchBar}>
          <svg
            className={styles.searchIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            width="22"
            height="22"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Type a command or search applications…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            aria-label="Command query"
          />
          <span className={styles.kbdBadge}>ESC</span>
        </div>

        {/* Results List */}
        <div className={styles.resultsList} role="listbox">
          {searchResults.map((item, index) => {
            const isSelected = index === selectedIndex;

            return (
              <div
                key={item.id}
                className={`${styles.resultRow} ${isSelected ? styles.rowSelected : ''}`}
                onClick={() => handleExecuteItem(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                role="option"
                aria-selected={isSelected}
              >
                {/* Icon */}
                <div className={styles.rowIcon}>
                  {item.iconSvg ? (
                    <div
                      className={styles.appIconPill}
                      style={{ backgroundColor: item.badgeColor }}
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox={item.iconSvg?.viewBox || '0 0 24 24'}
                        width="16"
                        height="16"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d={item.iconSvg?.path}
                        />
                      </svg>
                    </div>
                  ) : (
                    <span className={styles.cmdIconText}>{item.icon || '⚡'}</span>
                  )}
                </div>

                {/* Title & Description */}
                <div className={styles.rowText}>
                  <div className={styles.rowTitleArea}>
                    <span className={styles.rowTitle}>{item.title}</span>
                    {item.isProtected && (
                      <span className={styles.lockBadge}>
                        {isVaultUnlocked ? '🔓 Decrypted' : '🔒 Protected'}
                      </span>
                    )}
                  </div>
                  <span className={styles.rowDesc}>{item.description}</span>
                </div>

                {/* Domain Tag or Shortcut */}
                <div className={styles.rowMeta}>
                  {item.shortcut ? (
                    <kbd className={styles.shortcutKbd}>{item.shortcut}</kbd>
                  ) : (
                    <span className={styles.domainTag}>{item.category}</span>
                  )}
                </div>
              </div>
            );
          })}

          {searchResults.length === 0 && (
            <div className={styles.noResults}>
              <p>No matching commands or applications for "{searchQuery}"</p>
            </div>
          )}
        </div>

        {/* Command Palette Footer */}
        <div className={styles.paletteFooter}>
          <div className={styles.footerHints}>
            <span><kbd className={styles.hintKbd}>↑↓</kbd> to navigate</span>
            <span><kbd className={styles.hintKbd}>↵</kbd> to run</span>
            <span><kbd className={styles.hintKbd}>esc</kbd> to dismiss</span>
          </div>
          <span className={styles.footerBrand}>Elyx OS Spotlight</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
