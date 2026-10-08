import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth.jsx';
import {
  createLink,
  createPreset,
  deleteLink,
  deletePreset,
  endWorkspaceSession,
  logActivity,
  seedDefaultsIfEmpty,
  startWorkspaceSession,
  subscribeToActivity,
  subscribeToActiveSession,
  subscribeToLinks,
  subscribeToPresets,
  updateLink,
  updatePreset,
} from '../services/workspaceService.js';
import { sanitizeUrl, sanitizeUrlForLog } from '../utils/workspaceValidation.js';

export function useDailyWorkspace() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [presets, setPresets] = useState([]);
  const [links, setLinks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activeSession, setActiveSession] = useState(null);

  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Keep track of windows opened in the current session so End Work can close them if browser allows
  const openedWindowHandlesRef = useRef([]);

  // Auto-dismiss notifications after 6 seconds
  const showToast = useCallback((msg, type = 'info') => {
    setNotification({ message: msg, type, id: Date.now() });
    setTimeout(() => {
      setNotification((curr) => (curr?.type === type && curr?.message === msg ? null : curr));
    }, 6000);
  }, []);

  /* -------------------------------------------------------------------------- */
  /* REALTIME DATA SUBSCRIPTIONS                                               */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!uid) {
      setPresets([]);
      setLinks([]);
      setActivities([]);
      setActiveSession(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubPresets = () => {};
    let unsubLinks = () => {};
    let unsubActivity = () => {};
    let unsubSession = () => {};

    const setupSubscriptions = async () => {
      try {
        unsubPresets = subscribeToPresets(
          uid,
          (data) => {
            setPresets(data);
            if (data.length === 0) {
              // Seed defaults if empty
              seedDefaultsIfEmpty(uid);
            } else if (!selectedPresetId) {
              // Select first favorite or first preset by default
              const fav = data.find((p) => p.isFavorite) || data[0];
              setSelectedPresetId(fav?.id || null);
            }
            setLoading(false);
          },
          (err) => {
            console.error('Error fetching presets:', err);
            setError('Failed to load workspace presets');
            setLoading(false);
          }
        );

        unsubLinks = subscribeToLinks(
          uid,
          (data) => setLinks(data),
          (err) => console.error('Error fetching links:', err)
        );

        unsubActivity = subscribeToActivity(
          uid,
          (data) => setActivities(data),
          (err) => console.error('Error fetching activity:', err)
        );

        unsubSession = subscribeToActiveSession(
          uid,
          (session) => setActiveSession(session),
          (err) => console.error('Error fetching active session:', err)
        );
      } catch (err) {
        console.error('Error setting up subscriptions:', err);
        setError('Failed to initialize workspace data');
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      unsubPresets();
      unsubLinks();
      unsubActivity();
      unsubSession();
    };
  }, [uid]);

  const selectedPreset = presets.find((p) => p.id === selectedPresetId) || presets[0] || null;

  /* -------------------------------------------------------------------------- */
  /* START WORK AUTOMATION                                                     */
  /* -------------------------------------------------------------------------- */

  const startWork = useCallback(
    async (presetToLaunch = selectedPreset) => {
      if (!uid) return;
      if (!presetToLaunch) {
        showToast('Please select a workspace preset first', 'warning');
        return;
      }

      const rawUrls = presetToLaunch.urls || [];
      const validUrls = rawUrls.map((u) => sanitizeUrl(u)).filter(Boolean);

      if (validUrls.length === 0) {
        showToast(`Preset "${presetToLaunch.name}" has no valid URLs configured`, 'warning');
        return;
      }

      openedWindowHandlesRef.current = [];
      let successCount = 0;
      let blockedCount = 0;

      // Check if Chrome extension runtime is available
      const extensionId = window.elyxExtensionId || null;
      const hasExtension = Boolean(window.chrome && chrome.runtime && chrome.runtime.sendMessage);

      for (let i = 0; i < validUrls.length; i++) {
        const url = validUrls[i];
        let opened = false;

        // Try extension path if registered/available
        if (hasExtension && extensionId) {
          try {
            chrome.runtime.sendMessage(
              extensionId,
              { action: 'OPEN_TAB', url },
              () => {}
            );
            opened = true;
          } catch {
            opened = false;
          }
        }

        // Standard browser fallback (window.open)
        if (!opened) {
          try {
            const win = window.open(url, '_blank', 'noopener,noreferrer');
            if (win) {
              openedWindowHandlesRef.current.push(win);
              opened = true;
            } else {
              blockedCount++;
            }
          } catch {
            blockedCount++;
          }
        }

        if (opened) successCount++;
      }

      // Persist active session to Firestore
      try {
        await startWorkspaceSession(uid, presetToLaunch);
      } catch (err) {
        console.error('Failed to save session to Firestore:', err);
      }

      // Feedback message
      if (blockedCount > 0) {
        showToast(
          `Started "${presetToLaunch.name}". Opened ${successCount} tab(s). ${blockedCount} tab(s) were held by browser popup blocker. Please check popup settings in address bar.`,
          'warning'
        );
      } else {
        showToast(
          `🚀 Workspace "${presetToLaunch.name}" started! ${successCount} browser tabs launched.`,
          'success'
        );
      }
    },
    [uid, selectedPreset, showToast]
  );

  /* -------------------------------------------------------------------------- */
  /* END WORK AUTOMATION                                                       */
  /* -------------------------------------------------------------------------- */

  const endWork = useCallback(async () => {
    if (!uid || !activeSession) {
      showToast('No active workspace session to end', 'info');
      return;
    }

    // Try closing tabs created by Elyx Vault during this session
    let closedTabsCount = 0;
    openedWindowHandlesRef.current.forEach((win) => {
      try {
        if (win && !win.closed) {
          win.close();
          closedTabsCount++;
        }
      } catch {
        // Browser security policies may prevent closing tabs cross-origin
      }
    });
    openedWindowHandlesRef.current = [];

    try {
      const res = await endWorkspaceSession(uid, activeSession.id, activeSession);
      showToast(
        `🏁 Workspace session ended! Total time: ${res.durationFormatted || '0s'}.`,
        'success'
      );
    } catch (err) {
      console.error('Failed to end workspace session:', err);
      showToast('Failed to save session end state', 'error');
    }
  }, [uid, activeSession, showToast]);

  /* -------------------------------------------------------------------------- */
  /* PRESET ACTIONS                                                             */
  /* -------------------------------------------------------------------------- */

  const handleSavePreset = async (presetData, isEditingId = null) => {
    if (!uid) return;
    try {
      if (isEditingId) {
        await updatePreset(uid, isEditingId, presetData);
        showToast(`Preset "${presetData.name}" updated successfully`, 'success');
      } else {
        const newId = await createPreset(uid, presetData);
        setSelectedPresetId(newId);
        showToast(`Preset "${presetData.name}" created!`, 'success');
      }
    } catch (err) {
      console.error('Error saving preset:', err);
      showToast(err.message || 'Failed to save workspace preset', 'error');
      throw err;
    }
  };

  const handleDeletePreset = async (presetId, presetName) => {
    if (!uid || !presetId) return;
    try {
      await deletePreset(uid, presetId, presetName);
      if (selectedPresetId === presetId) {
        const remaining = presets.filter((p) => p.id !== presetId);
        setSelectedPresetId(remaining[0]?.id || null);
      }
      showToast(`Preset "${presetName}" deleted`, 'info');
    } catch (err) {
      console.error('Error deleting preset:', err);
      showToast('Failed to delete preset', 'error');
    }
  };

  /* -------------------------------------------------------------------------- */
  /* FAVORITE LINK ACTIONS                                                     */
  /* -------------------------------------------------------------------------- */

  const handleSaveLink = async (linkData, isEditingId = null) => {
    if (!uid) return;
    try {
      if (isEditingId) {
        await updateLink(uid, isEditingId, linkData);
        showToast(`Link "${linkData.title}" updated`, 'success');
      } else {
        await createLink(uid, linkData);
        showToast(`Link "${linkData.title}" added to favorites`, 'success');
      }
    } catch (err) {
      console.error('Error saving link:', err);
      showToast(err.message || 'Failed to save link', 'error');
      throw err;
    }
  };

  const handleDeleteLink = async (linkId, linkTitle) => {
    if (!uid || !linkId) return;
    try {
      await deleteLink(uid, linkId, linkTitle);
      showToast(`Link "${linkTitle}" removed`, 'info');
    } catch (err) {
      console.error('Error deleting link:', err);
      showToast('Failed to remove link', 'error');
    }
  };

  const handleOpenLink = async (link) => {
    const sanitized = sanitizeUrl(link.url);
    if (!sanitized) {
      showToast('Cannot open link: invalid or unsafe URL scheme', 'error');
      return;
    }

    try {
      window.open(sanitized, '_blank', 'noopener,noreferrer');
      await logActivity(uid, 'OPEN_LINK', `Opened favorite link "${link.title}"`, {
        linkId: link.id,
        url: sanitized,
      });
    } catch {
      showToast('Failed to open link in browser tab', 'error');
    }
  };

  return {
    presets,
    links,
    activities,
    activeSession,
    selectedPreset,
    selectedPresetId,
    setSelectedPresetId,
    loading,
    error,
    notification,
    showToast,
    startWork,
    endWork,
    handleSavePreset,
    handleDeletePreset,
    handleSaveLink,
    handleDeleteLink,
    handleOpenLink,
  };
}
