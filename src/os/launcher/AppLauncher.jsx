import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APP_REGISTRY, getAppById } from '../registry/appRegistry.js';
import { APP_CATEGORIES } from '../registry/categories.js';
import { useOS } from '../hooks/useOS.js';
import {
  loadFavoriteApps,
  loadRecentApps,
  recordRecentApp,
  saveFavoriteApps,
} from '../dock/types.js';
import styles from './AppLauncher.module.css';

export function AppLauncher({
  isOpen,
  onClose,
  onOpenApp,
  userRole = 'viewer',
  isVaultUnlocked = false,
}) {
  const { settings } = useOS();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Favorites & Recents State
  const [favoriteIds, setFavoriteIds] = useState(loadFavoriteApps);
  const [recentIds, setRecentIds] = useState(loadRecentApps);

  const searchInputRef = useRef(null);
  const gridContainerRef = useRef(null);

  // Focus search input when launcher opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      setRecentIds(loadRecentApps());
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter apps based on permissions, category, and search query
  const filteredApps = useMemo(() => {
    return APP_REGISTRY.filter((app) => {
      // Permission check
      if (app.permissions && !app.permissions.includes(userRole)) {
        return false;
      }

      // Category check
      if (selectedCategory !== 'all' && app.category !== selectedCategory) {
        return false;
      }

      // Search query check
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = app.name?.toLowerCase().includes(query);
        const matchesShort = app.shortName?.toLowerCase().includes(query);
        const matchesDesc = app.description?.toLowerCase().includes(query);
        const matchesCat = app.category?.toLowerCase().includes(query);
        return matchesName || matchesShort || matchesDesc || matchesCat;
      }

      return true;
    });
  }, [userRole, selectedCategory, searchQuery]);

  // Recent apps list
  const recentApps = useMemo(() => {
    return recentIds
      .map((id) => getAppById(id))
      .filter((app) => app && (!app.permissions || app.permissions.includes(userRole)));
  }, [recentIds, userRole]);

  // Favorites apps list
  const favoriteApps = useMemo(() => {
    return favoriteIds
      .map((id) => getAppById(id))
      .filter((app) => app && (!app.permissions || app.permissions.includes(userRole)));
  }, [favoriteIds, userRole]);

  // Launch App Handler
  const handleLaunchApp = useCallback(
    (appId) => {
      recordRecentApp(appId);
      setRecentIds(loadRecentApps());
      onOpenApp(appId);
      onClose();
    },
    [onOpenApp, onClose]
  );

  // Toggle Favorite
  const toggleFavorite = useCallback(
    (e, appId) => {
      e.stopPropagation();
      setFavoriteIds((prev) => {
        const updated = prev.includes(appId)
          ? prev.filter((id) => id !== appId)
          : [...prev, appId];
        saveFavoriteApps(updated);
        return updated;
      });
    },
    []
  );

  // Keyboard Navigation: Arrow Keys, Enter, Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(filteredApps.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Assuming 4-5 items per row
        setHighlightedIndex((prev) => Math.min(filteredApps.length - 1, prev + 4));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(0, prev - 4));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredApps[highlightedIndex]) {
          handleLaunchApp(filteredApps[highlightedIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredApps, highlightedIndex, handleLaunchApp, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.launcherBackdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Application Launcher"
    >
      <div className={styles.launcherModal} onClick={(e) => e.stopPropagation()}>
        {/* Launcher Header & Search Bar */}
        <div className={styles.searchHeader}>
          <div className={styles.searchBarWrapper}>
            <svg
              className={styles.searchIcon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="20"
              height="20"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Search installed applications (or press Esc to exit)…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              aria-label="Search applications"
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className={styles.categoryPills} role="tablist">
            <button
              type="button"
              className={`${styles.categoryPill} ${selectedCategory === 'all' ? styles.pillActive : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All Applications ({APP_REGISTRY.length})
            </button>
            {Object.values(APP_CATEGORIES).map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.categoryPill} ${selectedCategory === cat.id ? styles.pillActive : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Launcher Content Body */}
        <div className={styles.launcherBody} ref={gridContainerRef}>
          {/* Quick Access: Favorites & Recents (When not searching) */}
          {!searchQuery && selectedCategory === 'all' && (
            <div className={styles.quickAccessSection}>
              {/* Favorites */}
              {favoriteApps.length > 0 && (
                <div className={styles.quickBlock}>
                  <div className={styles.quickBlockTitle}>★ Pinned Favorites</div>
                  <div className={styles.quickPillRow}>
                    {favoriteApps.map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        className={styles.quickAppChip}
                        onClick={() => handleLaunchApp(app.id)}
                      >
                        <span
                          className={styles.chipIconDot}
                          style={{ backgroundColor: app.icon?.badgeColor || '#6366f1' }}
                        />
                        <span>{app.shortName || app.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recents */}
              {recentApps.length > 0 && (
                <div className={styles.quickBlock}>
                  <div className={styles.quickBlockTitle}>🕒 Recently Launched</div>
                  <div className={styles.quickPillRow}>
                    {recentApps.slice(0, 4).map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        className={styles.quickAppChip}
                        onClick={() => handleLaunchApp(app.id)}
                      >
                        <span
                          className={styles.chipIconDot}
                          style={{ backgroundColor: app.icon?.badgeColor || '#6366f1' }}
                        />
                        <span>{app.shortName || app.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Apps Grid */}
          <div className={styles.appsGrid} role="grid" aria-label="Applications Grid">
            {filteredApps.map((app, index) => {
              const isHighlighted = index === highlightedIndex;
              const isFav = favoriteIds.includes(app.id);

              return (
                <div
                  key={app.id}
                  className={`${styles.appCard} ${isHighlighted ? styles.cardHighlighted : ''}`}
                  onClick={() => handleLaunchApp(app.id)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="gridcell"
                  tabIndex={0}
                >
                  {/* Star Favorite Button */}
                  <button
                    type="button"
                    className={`${styles.starBtn} ${isFav ? styles.starActive : ''}`}
                    onClick={(e) => toggleFavorite(e, app.id)}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    ★
                  </button>

                  {/* App Icon Badge */}
                  <div
                    className={styles.appIconContainer}
                    style={{ backgroundColor: app.icon?.badgeColor || '#6366f1' }}
                  >
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox={app.icon?.viewBox || '0 0 24 24'}
                      width="34"
                      height="34"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d={app.icon?.path}
                      />
                    </svg>

                    {/* Zero-knowledge lock indicator */}
                    {app.requiresMasterPassword && (
                      <span
                        className={styles.appLockBadge}
                        title={
                          isVaultUnlocked
                            ? 'Vault is Unlocked'
                            : 'Protected by Zero-Knowledge Master Password'
                        }
                      >
                        {isVaultUnlocked ? '🔓' : '🔒'}
                      </span>
                    )}
                  </div>

                  {/* App Name & Category */}
                  <div className={styles.appInfo}>
                    <span className={styles.appName}>{app.name}</span>
                    <span className={styles.appDesc}>{app.description}</span>
                  </div>
                </div>
              );
            })}

            {filteredApps.length === 0 && (
              <div className={styles.noResultsBox}>
                <p>No applications match "{searchQuery}"</p>
                <button
                  type="button"
                  className={styles.resetSearchBtn}
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Launcher Footer / Shortcuts Hint */}
        <div className={styles.launcherFooter}>
          <div className={styles.shortcutHint}>
            <kbd className={styles.kbd}>↑</kbd>
            <kbd className={styles.kbd}>↓</kbd>
            <kbd className={styles.kbd}>←</kbd>
            <kbd className={styles.kbd}>→</kbd>
            <span>Navigate</span>
          </div>
          <div className={styles.shortcutHint}>
            <kbd className={styles.kbd}>Enter</kbd>
            <span>Launch App</span>
          </div>
          <div className={styles.shortcutHint}>
            <kbd className={styles.kbd}>Esc</kbd>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppLauncher;
