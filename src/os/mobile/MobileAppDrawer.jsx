import React, { useMemo, useState } from 'react';
import { getAllApps } from '../registry/appRegistry.js';
import styles from './MobileShell.module.css';

export function MobileAppDrawer({
  isOpen,
  onClose,
  onOpenApp,
  userRole = 'viewer',
}) {
  const [query, setQuery] = useState('');

  const apps = useMemo(() => {
    let list = getAllApps().filter((app) => {
      if (app.requiresRole && userRole === 'viewer') return false;
      return true;
    });

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [userRole, query]);

  if (!isOpen) return null;

  return (
    <div className={styles.drawerOverlay} onClick={onClose} role="dialog" aria-label="Application Drawer">
      <div className={styles.drawerSheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHandle} onClick={onClose} />
        
        <div className={styles.drawerHeader}>
          <div className={styles.drawerSearchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.drawerSearchInput}
              placeholder="Search apps…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                type="button"
                className={styles.searchClearBtn}
                onClick={() => setQuery('')}
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className={styles.drawerList}>
          {apps.map((app) => (
            <div
              key={app.id}
              className={styles.drawerListItem}
              onClick={() => {
                onClose();
                onOpenApp(app.id);
              }}
            >
              <div
                className={styles.drawerItemIcon}
                style={{ backgroundColor: app.icon?.badgeColor || '#6366f1' }}
              >
                <span>{app.icon?.symbol || '📱'}</span>
              </div>
              <div className={styles.drawerItemInfo}>
                <span className={styles.drawerItemTitle}>{app.name}</span>
                <span className={styles.drawerItemDesc}>{app.description}</span>
              </div>
              <span className={styles.drawerItemChevron}>›</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MobileAppDrawer;
