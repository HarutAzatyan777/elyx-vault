import React, { useMemo, useState } from 'react';
import { getAllApps } from '../registry/appRegistry.js';
import { MOBILE_THEMES } from './types.js';
import styles from './MobileShell.module.css';

export function MobileHomeScreen({
  theme = MOBILE_THEMES.IOS,
  onOpenApp,
  onOpenDrawer,
  onOpenSettings,
  isVaultUnlocked = false,
  onUnlockVault,
  onLockVault,
  activeAppId = null,
  userRole = 'viewer',
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState(null);
  const [contextApp, setContextApp] = useState(null);
  const longPressTimerRef = React.useRef(null);

  // Filter apps based on role
  const installedApps = useMemo(() => {
    return getAllApps().filter((app) => {
      if (app.requiresRole && userRole === 'viewer') return false;
      return true;
    });
  }, [userRole]);

  // Bottom dock pinned apps (4 apps)
  const dockAppIds = ['daily_workspace', 'notepad', 'files', 'settings'];
  const dockApps = useMemo(() => {
    return dockAppIds
      .map((id) => installedApps.find((a) => a.id === id))
      .filter(Boolean);
  }, [installedApps]);

  // Group some apps into a "Vaults" folder for iOS/Android home screen realism
  const vaultAppIds = ['media', 'music', 'minecraft'];
  const folderApps = useMemo(() => {
    return vaultAppIds
      .map((id) => installedApps.find((a) => a.id === id))
      .filter(Boolean);
  }, [installedApps]);

  // Grid apps (excluding dock and apps inside folder when folder is active)
  const gridApps = useMemo(() => {
    let list = installedApps.filter(
      (a) => !dockAppIds.includes(a.id) && !vaultAppIds.includes(a.id)
    );

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = installedApps.filter(
        (a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
      );
    }

    return list;
  }, [installedApps, dockAppIds, vaultAppIds, searchQuery]);

  // Touch handlers for Long Press
  const handleTouchStart = (app) => {
    longPressTimerRef.current = setTimeout(() => {
      setContextApp(app);
      if (navigator.vibrate) navigator.vibrate(40);
    }, 550);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const todayDate = new Date().toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={`${styles.homeScreen} ${theme === MOBILE_THEMES.ANDROID ? styles.homeScreenAndroid : styles.homeScreenIOS}`}
      onClick={() => {
        if (contextApp) setContextApp(null);
        if (activeFolder) setActiveFolder(null);
      }}
    >
      {/* Top Smart Widget */}
      <section className={styles.homeWidgetSection}>
        <div className={styles.widgetCard}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetDate}>{todayDate}</span>
            <span className={styles.widgetBadge}>Elyx OS Mobile</span>
          </div>
          <div className={styles.widgetBody}>
            <div className={styles.widgetTitle}>Personal Cloud OS</div>
            <p className={styles.widgetSubtitle}>
              {isVaultUnlocked
                ? 'Elyx Vault is decrypted and ready.'
                : 'Elyx Vault is encrypted and locked.'}
            </p>
          </div>
          <div className={styles.widgetActions}>
            <button
              type="button"
              className={styles.widgetActionBtn}
              onClick={() => (isVaultUnlocked ? onLockVault?.() : onUnlockVault?.())}
            >
              {isVaultUnlocked ? '🔒 Lock Vault' : '🔓 Decrypt Vault'}
            </button>
            <button
              type="button"
              className={styles.widgetActionBtn}
              onClick={() => onOpenApp?.('daily_workspace')}
            >
              ⚡ Daily Routine
            </button>
          </div>
        </div>
      </section>

      {/* Spotlight / Quick App Search Bar */}
      <section className={styles.searchSection}>
        <div className={styles.searchBarWrapper}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={theme === MOBILE_THEMES.ANDROID ? 'Search apps & web…' : 'Search apps…'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.searchClearBtn}
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>
      </section>

      {/* App Grid */}
      <section className={styles.appGridSection} aria-label="Mobile App Grid">
        {/* Render Folder if no search query */}
        {!searchQuery && (
          <div
            className={styles.appIconContainer}
            onClick={() => setActiveFolder(folderApps)}
          >
            <div className={styles.folderIconBadge}>
              <div className={styles.folderMiniGrid}>
                {folderApps.slice(0, 4).map((fApp) => (
                  <span
                    key={fApp.id}
                    className={styles.folderMiniDot}
                    style={{ backgroundColor: fApp.icon?.badgeColor || '#6366f1' }}
                  >
                    {fApp.icon?.symbol || '📱'}
                  </span>
                ))}
              </div>
            </div>
            <span className={styles.appLabel}>Secure Vaults</span>
          </div>
        )}

        {/* Standard Grid Apps */}
        {gridApps.map((app) => (
          <div
            key={app.id}
            className={styles.appIconContainer}
            onClick={() => onOpenApp(app.id)}
            onTouchStart={() => handleTouchStart(app)}
            onTouchEnd={handleTouchEnd}
            onMouseDown={() => handleTouchStart(app)}
            onMouseUp={handleTouchEnd}
          >
            <div
              className={`${styles.appIconBadge} ${
                theme === MOBILE_THEMES.ANDROID ? styles.appIconAndroid : styles.appIconIOS
              }`}
              style={{ backgroundColor: app.icon?.badgeColor || '#6366f1' }}
            >
              <span>{app.icon?.symbol || '📱'}</span>
              {app.requiresMasterPassword && !isVaultUnlocked && (
                <span className={styles.appLockBadge}>🔒</span>
              )}
            </div>
            <span className={styles.appLabel}>{app.name}</span>
          </div>
        ))}

        {/* Android App Drawer trigger icon */}
        {theme === MOBILE_THEMES.ANDROID && (
          <div className={styles.appIconContainer} onClick={onOpenDrawer}>
            <div className={`${styles.appIconBadge} ${styles.drawerTriggerBadge}`}>
              <span>⋮⋮⋮</span>
            </div>
            <span className={styles.appLabel}>App Drawer</span>
          </div>
        )}
      </section>

      {/* Folder Expanded Modal */}
      {activeFolder && (
        <div
          className={styles.folderOverlay}
          onClick={() => setActiveFolder(null)}
        >
          <div
            className={styles.folderModalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.folderModalHeader}>
              <h3 className={styles.folderModalTitle}>Secure Vaults</h3>
              <button
                type="button"
                className={styles.folderCloseBtn}
                onClick={() => setActiveFolder(null)}
              >
                ×
              </button>
            </div>
            <div className={styles.folderGrid}>
              {activeFolder.map((app) => (
                <div
                  key={app.id}
                  className={styles.appIconContainer}
                  onClick={() => {
                    setActiveFolder(null);
                    onOpenApp(app.id);
                  }}
                >
                  <div
                    className={`${styles.appIconBadge} ${
                      theme === MOBILE_THEMES.ANDROID ? styles.appIconAndroid : styles.appIconIOS
                    }`}
                    style={{ backgroundColor: app.icon?.badgeColor || '#6366f1' }}
                  >
                    <span>{app.icon?.symbol || '📱'}</span>
                  </div>
                  <span className={styles.appLabel}>{app.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* App Long-Press Quick Action Sheet */}
      {contextApp && (
        <div className={styles.contextOverlay} onClick={() => setContextApp(null)}>
          <div className={styles.contextSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.contextHeader}>
              <span
                className={styles.contextIcon}
                style={{ backgroundColor: contextApp.icon?.badgeColor || '#6366f1' }}
              >
                {contextApp.icon?.symbol || '📱'}
              </span>
              <div>
                <h4 className={styles.contextTitle}>{contextApp.name}</h4>
                <p className={styles.contextCategory}>{contextApp.category}</p>
              </div>
            </div>
            <div className={styles.contextActions}>
              <button
                type="button"
                className={styles.contextActionItem}
                onClick={() => {
                  setContextApp(null);
                  onOpenApp(contextApp.id);
                }}
              >
                <span>Open Application</span>
                <span>↗</span>
              </button>
              <button
                type="button"
                className={styles.contextActionItem}
                onClick={() => {
                  setContextApp(null);
                  alert(`${contextApp.name}\n${contextApp.description}`);
                }}
              >
                <span>App Info</span>
                <span>ⓘ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Mobile Dock */}
      <nav
        className={`${styles.mobileDock} ${
          theme === MOBILE_THEMES.ANDROID ? styles.dockAndroid : styles.dockIOS
        }`}
        aria-label="Mobile Dock"
      >
        {dockApps.map((app) => (
          <button
            key={app.id}
            type="button"
            className={styles.dockItemBtn}
            onClick={() => onOpenApp(app.id)}
            title={app.name}
            aria-label={app.name}
          >
            <div
              className={`${styles.dockIconBadge} ${
                theme === MOBILE_THEMES.ANDROID ? styles.appIconAndroid : styles.appIconIOS
              }`}
              style={{ backgroundColor: app.icon?.badgeColor || '#6366f1' }}
            >
              <span>{app.icon?.symbol || '📱'}</span>
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default MobileHomeScreen;
