import React from 'react';
import ClockCalendarWidget from './widgets/ClockCalendarWidget.jsx';
import WorkSessionWidget from './widgets/WorkSessionWidget.jsx';
import StorageSummaryWidget from './widgets/StorageSummaryWidget.jsx';
import QuickNotesWidget from './widgets/QuickNotesWidget.jsx';
import FavoriteAppsWidget from './widgets/FavoriteAppsWidget.jsx';
import styles from './DesktopWidgets.module.css';

export function DesktopWidgets({
  visibleWidgets = {
    clock: true,
    session: true,
    storage: true,
    notes: true,
    favorites: true,
  },
  onToggleWidget,
  projectsCount = 0,
  devicesCount = 0,
  isRTDBConnected = false,
  isVaultUnlocked = false,
  role = 'viewer',
  onOpenApp,
}) {
  const hasAnyVisible = Object.values(visibleWidgets).some(Boolean);

  if (!hasAnyVisible) return null;

  return (
    <aside className={styles.widgetsPanel} aria-label="Desktop Widgets">
      {visibleWidgets.clock && (
        <ClockCalendarWidget onRemove={() => onToggleWidget?.('clock', false)} />
      )}

      {visibleWidgets.session && (
        <WorkSessionWidget
          onOpenApp={onOpenApp}
          onRemove={() => onToggleWidget?.('session', false)}
        />
      )}

      {visibleWidgets.storage && (
        <StorageSummaryWidget
          projectsCount={projectsCount}
          devicesCount={devicesCount}
          isRTDBConnected={isRTDBConnected}
          isVaultUnlocked={isVaultUnlocked}
          role={role}
          onOpenApp={onOpenApp}
          onRemove={() => onToggleWidget?.('storage', false)}
        />
      )}

      {visibleWidgets.notes && (
        <QuickNotesWidget
          onOpenApp={onOpenApp}
          onRemove={() => onToggleWidget?.('notes', false)}
        />
      )}

      {visibleWidgets.favorites && (
        <FavoriteAppsWidget
          onOpenApp={onOpenApp}
          onRemove={() => onToggleWidget?.('favorites', false)}
        />
      )}
    </aside>
  );
}

export default DesktopWidgets;
