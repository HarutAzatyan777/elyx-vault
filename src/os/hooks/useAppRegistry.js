import { useCallback, useMemo } from 'react';
import {
  APP_REGISTRY,
  APP_REGISTRY_MAP,
  canUserLaunchApp,
  getAllApps,
  getAppById,
  getAppsByCategory,
  getPinnedDockApps,
} from '../registry/appRegistry.js';
import { ALL_CATEGORIES, APP_CATEGORIES } from '../registry/categories.js';

/**
 * Hook providing easy querying, filtering, and role validation across the OS App Registry.
 * 
 * @param {string} [userRole] Current user role for permission evaluation
 */
export const useAppRegistry = (userRole = 'viewer') => {
  const apps = useMemo(() => getAllApps(), []);
  const categories = useMemo(() => ALL_CATEGORIES, []);
  const pinnedDockApps = useMemo(() => getPinnedDockApps(), []);

  const launchableApps = useMemo(() => {
    return apps.filter((app) => canUserLaunchApp(app, userRole));
  }, [apps, userRole]);

  const searchApps = useCallback(
    (query) => {
      const q = (query || '').trim().toLowerCase();
      if (!q) return launchableApps;

      return launchableApps.filter(
        (app) =>
          app.name.toLowerCase().includes(q) ||
          app.shortName.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q) ||
          app.id.toLowerCase().includes(q)
      );
    },
    [launchableApps]
  );

  const getByCategory = useCallback(
    (categoryId) => {
      return launchableApps.filter((app) => app.category === categoryId);
    },
    [launchableApps]
  );

  return {
    apps,
    categories,
    pinnedDockApps,
    launchableApps,
    getAppById,
    searchApps,
    getByCategory,
    canLaunch: (appId) => canUserLaunchApp(appId, userRole),
  };
};
