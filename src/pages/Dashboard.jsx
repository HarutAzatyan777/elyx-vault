import { canUserLaunchApp, getAppById } from '../os/registry/appRegistry.js';
import React, { lazy, useCallback, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import { db } from '../config/firebase.js';
import { useAuth } from '../hooks/useAuth.jsx';

import { MasterPassModal } from '../components/MasterPassModal';
import { ProjectCard } from '../components/ProjectCard';
const AddProject = lazy(() => import('../components/AddProject'));
import InstallGuideModal from '../components/InstallGuideModal';

const UserManagement = lazy(() => import('../components/UserManagement'));
const MinecraftVault = lazy(
  () => import('../components/MinecraftVault/MinecraftVault'),
);
const DailyWorkspace = lazy(
  () => import('../components/daily-workspace/DailyWorkspace'),
);
const Notepad = lazy(() => import('../components/notepad/Notepad'));
const MediaVault = lazy(() => import('../components/media/MediaVault'));
const MusicVault = lazy(() => import('../components/music/MusicVault'));
import { GlobalAudioPlayer } from '../components/music/GlobalAudioPlayer';
import { useMusic } from '../context/MusicContext';
const DeviceList = lazy(() => import('../components/remote/DeviceList'));
import DeviceEnrollmentModal from '../components/remote/DeviceEnrollmentModal';
const RemoteTerminal = lazy(
  () => import('../components/remote/RemoteTerminal'),
);
import { useRemoteDevices } from '../hooks/useRemoteDevices';
import { subscribeRTDBConnection } from '../services/rtdbService';
import Sidebar from '../components/Sidebar';
import { useOS } from '../os/index.js';
import {
  getStoredMasterPassword,
  saveStoredMasterPassword,
  clearStoredMasterPassword,
} from '../utils/vaultAuth.js';
const DesktopShell = lazy(() => import('../os/shell/DesktopShell.jsx'));
const MobileShell = lazy(() => import('../os/mobile/MobileShell.jsx'));
import { loadDeviceMode, saveDeviceMode } from '../os/mobile/types.js';

import styles from './Dashboard.module.css';

const VALID_TABS = [
  'daily_workspace',
  'notepad',
  'media',
  'music',
  'general',
  'minecraft',
  'users',
  'devices',
  'terminal',
];

const getInitialTab = () => {
  try {
    // 1. URL Hash (e.g. #music, #media, #daily_workspace)
    const hash = window.location.hash.replace('#', '').trim().toLowerCase();
    if (hash && VALID_TABS.includes(hash)) {
      return hash;
    }
    // 2. Query param (?tab=music)
    const params = new URLSearchParams(window.location.search);
    const queryTab = params.get('tab')?.trim().toLowerCase();
    if (queryTab && VALID_TABS.includes(queryTab)) {
      return queryTab;
    }
    // 3. LocalStorage persistence
    const saved = localStorage.getItem('elyx_active_tab')?.trim().toLowerCase();
    if (saved && VALID_TABS.includes(saved)) {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'general';
};

export const Dashboard = () => {
  const { user, access, logout } = useAuth();
  const { settings, isOSMode, toggleOSMode, addNotification } = useOS();
  const {
    devices,
    securityEvents,
    notification: deviceNotification,
    selectedDevice,
    selectedDeviceId,
    setSelectedDeviceId,
    handleRegisterDevice,
    handleRenameDevice,
    handleRevokeDevice,
  } = useRemoteDevices();

  const {
    currentTrack,
    isPlaying: isMusicPlaying,
    togglePlayPause: toggleMusicPlayPause,
    stopPlayback: stopMusicPlayback,
  } = useMusic();

  const [isRTDBConnected, setIsRTDBConnected] = useState(false);
  useEffect(() => {
    if (deviceNotification)
      addNotification({
        id: `device_${deviceNotification.id}`,
        category: 'devices',
        title: 'Device update',
        message: deviceNotification.message,
        type: deviceNotification.type,
      });
  }, [deviceNotification, addNotification]);
  const previousConnection = React.useRef(null);
  useEffect(() => {
    if (
      previousConnection.current !== null &&
      previousConnection.current !== isRTDBConnected
    )
      addNotification({
        category: 'system',
        title: isRTDBConnected
          ? 'Firebase connection restored'
          : 'Firebase disconnected',
        message: 'Realtime Database connection changed.',
      });
    previousConnection.current = isRTDBConnected;
  }, [isRTDBConnected, addNotification]);

  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [projectsError, setProjectsError] = useState('');
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [masterPassword, setMasterPassword] = useState(() => {
    try {
      return getStoredMasterPassword() || null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (!masterPassword) {
      const saved = getStoredMasterPassword();
      if (saved) {
        setMasterPassword(saved);
      }
    }
  }, [masterPassword]);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [mainTab, setMainTab] = useState(getInitialTab);
  const [projectScope, setProjectScope] = useState(() => {
    try {
      return localStorage.getItem('elyx_project_scope') || 'my';
    } catch {
      return 'my';
    }
  });

  const handleScopeChange = (scope) => {
    setProjectScope(scope);
    try {
      localStorage.setItem('elyx_project_scope', scope);
    } catch {}
  };

  const myProjects = React.useMemo(() => {
    if (!user) return [];
    return projects.filter((p) => {
      if (p.createdBy) {
        return p.createdBy === user.uid;
      }
      if (p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase()) {
        return true;
      }
      return access?.role === 'owner';
    });
  }, [projects, user, access?.role]);

  const displayedProjects = projectScope === 'my' ? myProjects : projects;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('elyx_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [deviceMode, setDeviceModeState] = useState(loadDeviceMode);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200,
  );

  // Subscribe to Realtime Database live connection status
  useEffect(() => {
    const unsub = subscribeRTDBConnection((connected) => {
      setIsRTDBConnected(connected);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Track responsive viewport width
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile =
    deviceMode === 'mobile' ||
    (deviceMode !== 'desktop' && viewportWidth <= 768);

  // Keep active tab synced with URL hash and localStorage
  useEffect(() => {
    try {
      localStorage.setItem('elyx_active_tab', mainTab);
      if (window.location.hash !== `#${mainTab}`) {
        window.history.replaceState(null, '', `#${mainTab}`);
      }
    } catch {}
  }, [mainTab]);

  // Listen to browser Back/Forward or manual hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim().toLowerCase();
      if (hash && VALID_TABS.includes(hash) && hash !== mainTab) {
        setMainTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [mainTab]);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('elyx_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!user || !access?.businessId || access.status !== 'active') {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setProjectsError('');

    const projectsCollection = collection(db, 'projects');
    const projectsQuery = access?.businessId
      ? query(projectsCollection, where('businessId', '==', access.businessId))
      : projectsCollection;

    const unsubscribe = onSnapshot(
      projectsQuery,
      (querySnapshot) => {
        const fetchedProjects = querySnapshot.docs.map((projectDoc) => ({
          ...projectDoc.data(),
            id: projectDoc.id,
        }));

        setProjects(fetchedProjects);
        setIsLoading(false);
      },
      (error) => {
        setProjects([]);
        setProjectsError(
          'Projects could not be loaded. Check your connection or access, then reload.',
        );
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user, access?.businessId]);

  const handleUnlockVault = (password, rememberDevice = true) => {
    if (
      !isOffline &&
      user &&
      access?.status === 'active' &&
      typeof password === 'string' &&
      password.trim()
    ) {
      setMasterPassword(password);
      if (rememberDevice) {
        saveStoredMasterPassword(password);
      } else {
        clearStoredMasterPassword();
      }
    }
  };
  const handleLockVault = useCallback((forget = false) => {
    setMasterPassword(null);
    if (forget) {
      clearStoredMasterPassword();
    }
    stopMusicPlayback();
    window.dispatchEvent(new Event('elyx:vault-locked'));
    window.dispatchEvent(new Event('ELYX_VAULT_LOCKED'));
  }, [stopMusicPlayback]);
  useEffect(() => {
    if (!masterPassword || !settings.autoLockMinutes || settings.autoLockMinutes <= 0) return;
    let timer;
    let lastActivity = Date.now();
    const foreground = () => {
      if (Date.now() - lastActivity >= settings.autoLockMinutes * 60000)
        handleLockVault(false);
    };
    const reset = () => {
      clearTimeout(timer);
      lastActivity = Date.now();
      timer = setTimeout(() => handleLockVault(false), settings.autoLockMinutes * 60000);
    };
    reset();
    document.addEventListener('visibilitychange', foreground);
    window.addEventListener('pointerdown', reset);
    window.addEventListener('keydown', reset);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', foreground);
      window.removeEventListener('pointerdown', reset);
      window.removeEventListener('keydown', reset);
    };
  }, [masterPassword, settings.autoLockMinutes, handleLockVault]);

  useEffect(() => {
    const offline = () => {
      setIsOffline(true);
      handleLockVault(false);
    };
    const online = () => {
      setIsOffline(false);
      const saved = getStoredMasterPassword();
      if (saved) setMasterPassword(saved);
    };
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, [handleLockVault]);

  const handleDelete = async (projectId) => {
    if (!projectId || access?.status !== 'active' || access.role === 'viewer')
      return;

    try {
      await deleteDoc(doc(db, 'projects', projectId));

      setProjects((currentProjects) =>
        currentProjects.filter((project) => project.id !== projectId),
      );
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleInstallClick = () => {
    setIsInstallModalOpen(true);
  };

  const handleTestGoogleClick = () => {
    window.open(
      'https://accounts.google.com/',
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleTabChange = (tab) => {
    if (!VALID_TABS.includes(tab)) return;
    setMainTab(tab);
    setIsSidebarOpen(false);
    try {
      localStorage.setItem('elyx_active_tab', tab);
      if (window.location.hash !== `#${tab}`) {
        window.history.replaceState(null, '', `#${tab}`);
      }
    } catch {}
  };

  if (isOSMode) {
    if (isMobile) {
      return (
        <MobileShell
          systemNotice={
            isOffline ? 'Offline — the vault is locked.' : projectsError
          }
          user={user}
          access={access}
          projects={displayedProjects}
          onDeleteProject={handleDelete}
          devices={devices}
          securityEvents={securityEvents}
          selectedDevice={selectedDevice}
          selectedDeviceId={selectedDeviceId}
          setSelectedDeviceId={setSelectedDeviceId}
          handleRegisterDevice={handleRegisterDevice}
          handleRenameDevice={handleRenameDevice}
          handleRevokeDevice={handleRevokeDevice}
          masterPassword={masterPassword}
          handleUnlockVault={handleUnlockVault}
          handleLockVault={handleLockVault}
          logout={logout}
          isRTDBConnected={isRTDBConnected}
          onSwitchToDesktop={() => {
            saveDeviceMode('desktop');
            setDeviceModeState('desktop');
          }}
        />
      );
    }

    return (
      <DesktopShell
        systemNotice={
          isOffline ? 'Offline — the vault is locked.' : projectsError
        }
        user={user}
        access={access}
        projects={displayedProjects}
        onDeleteProject={handleDelete}
        devices={devices}
        securityEvents={securityEvents}
        selectedDevice={selectedDevice}
        selectedDeviceId={selectedDeviceId}
        setSelectedDeviceId={setSelectedDeviceId}
        handleRegisterDevice={handleRegisterDevice}
        handleRenameDevice={handleRenameDevice}
        handleRevokeDevice={handleRevokeDevice}
        masterPassword={masterPassword}
        handleUnlockVault={handleUnlockVault}
        handleLockVault={handleLockVault}
        logout={logout}
        isRTDBConnected={isRTDBConnected}
        onSwitchToMobile={() => {
          saveDeviceMode('mobile');
          setDeviceModeState('mobile');
        }}
      />
    );
  }

  return (
    <div className={styles.layout}>
      <Sidebar
        activeTab={mainTab}
        setActiveTab={handleTabChange}
        projectsCount={displayedProjects.length}
        userEmail={user?.email}
        masterPassword={masterPassword}
        onLockVault={handleLockVault}
        onLogout={logout}
        onInstallClick={handleInstallClick}
        onTestGoogleClick={handleTestGoogleClick}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      <div
        className={`${styles.mainWrapper} ${isSidebarCollapsed ? styles.mainWrapperCollapsed : ''}`}
      >
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            {/* Mobile menu trigger */}
            <button
              type="button"
              className={styles.menuBtn}
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width="22"
                height="22"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Desktop collapse / expand toggle */}
            <button
              type="button"
              className={styles.desktopCollapseBtn}
              onClick={toggleSidebarCollapse}
              title={
                isSidebarCollapsed
                  ? 'Ընդարձակել sidebar-ը'
                  : 'Փոքրացնել sidebar-ը'
              }
              aria-label={
                isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
              }
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width="18"
                height="18"
              >
                {isSidebarCollapsed ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                )}
              </svg>
            </button>

            <div>
              <h1 className={styles.pageTitle}>
                {mainTab === 'daily_workspace'
                  ? '⚡ Daily Workspace'
                  : mainTab === 'notepad'
                    ? '📝 Smart Notepad & Secure Vault'
                    : mainTab === 'media'
                      ? '🎬 Media Vault & Video Studio'
                      : mainTab === 'music'
                        ? '🎵 Music Vault & Background Studio'
                        : mainTab === 'devices'
                          ? '🖥️ My Devices & Tailscale Nodes'
                          : mainTab === 'terminal'
                            ? '⚡ Remote PowerShell Terminal'
                            : mainTab === 'users'
                              ? '👥 Users & Access Management'
                              : mainTab === 'general'
                                ? '🔐 Web Projects Vault'
                                : '⛏️ Minecraft Server Vault'}
              </h1>

              <p className={styles.pageSubtitle}>
                {mainTab === 'daily_workspace'
                  ? 'Productivity & Morning Routine Dashboard'
                  : mainTab === 'notepad'
                    ? 'Markdown editor, interactive checklists, code snippets & AES optional client-side encryption'
                    : mainTab === 'media'
                      ? 'High-res photos, 4K video player, YouTube streams & optional client-side encryption'
                      : mainTab === 'music'
                        ? 'Background playback, drag & drop songs, playlists & MediaSession OS integration'
                        : mainTab === 'devices'
                          ? 'Manage enrolled Windows PCs running Elyx Agent'
                          : mainTab === 'terminal'
                            ? 'Interactive PowerShell PTY session over Tailscale'
                            : mainTab === 'users'
                              ? 'Role Level Control & User Authorization'
                              : 'Credential Encryption'}
              </p>
            </div>
          </div>

          <div className={styles.topBarRight}>
            {/* Quick Background Audio Pill with Play/Pause & Stop */}
            {currentTrack && (
              <div
                className={styles.audioTopPill}
                title={`Playing: ${currentTrack.title} • ${currentTrack.artist || 'Elyx Music'}`}
              >
                <div
                  className={`${styles.audioPillDisc} ${isMusicPlaying ? styles.audioPillPlaying : ''}`}
                  onClick={() => handleTabChange('music')}
                  title="Բացել Music Vault-ը"
                >
                  <img
                    src={
                      currentTrack.coverUrl ||
                      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=80&q=80'
                    }
                    alt=""
                    className={styles.audioPillImg}
                  />
                </div>
                <div
                  className={styles.audioPillInfo}
                  onClick={() => handleTabChange('music')}
                  title="Բացել Music Vault-ը"
                >
                  <span className={styles.audioPillTitle}>
                    {currentTrack.title}
                  </span>
                  <span className={styles.audioPillArtist}>
                    {currentTrack.artist || 'Audio'}
                  </span>
                </div>

                {/* Quick Play/Pause button */}
                <button
                  type="button"
                  className={styles.audioPillBtn}
                  onClick={toggleMusicPlayPause}
                  title={
                    isMusicPlaying ? 'Դադարեցնել (Pause)' : 'Շարունակել (Play)'
                  }
                  aria-label={isMusicPlaying ? 'Pause' : 'Play'}
                >
                  {isMusicPlaying ? (
                    <svg
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      width="12"
                      height="12"
                    >
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      width="12"
                      height="12"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Quick Stop & Turn Off button */}
                <button
                  type="button"
                  className={`${styles.audioPillBtn} ${styles.audioPillStopBtn}`}
                  onClick={stopMusicPlayback}
                  title="Անջատել երգը (Turn Off / Stop)"
                  aria-label="Turn off music"
                >
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    width="12"
                    height="12"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Firebase Realtime Database Live Connection Badge */}
            <div
              className={styles.rtdbBadge}
              title={
                isRTDBConnected
                  ? 'Firebase Realtime Database: Միացված է (Live RTDB)'
                  : 'Firebase Realtime Database: Միանում է...'
              }
            >
              <span
                className={`${styles.rtdbDot} ${isRTDBConnected ? styles.rtdbOnline : ''}`}
              />
              <span>{isRTDBConnected ? 'RTDB Live' : 'RTDB Connecting'}</span>
            </div>

            {/* Elyx OS Mode Feature Flag Toggle */}
            <button
              type="button"
              onClick={toggleOSMode}
              className={`${styles.osModeBadge} ${isOSMode ? styles.osModeActive : ''}`}
              title={
                isOSMode
                  ? 'Elyx OS 1.0 Mode: Active — Click to switch to Classic Dashboard'
                  : 'Classic Dashboard Mode — Click to switch to Elyx OS 1.0 Mode'
              }
              aria-label="Toggle Elyx OS Mode"
            >
              <span className={styles.osModeDot} />
              <span>{isOSMode ? 'Elyx OS 1.0' : 'OS: Classic'}</span>
            </button>

            {access?.role && (
              <span className={styles.roleBadge}>{access.role}</span>
            )}

            {masterPassword && (
              <button
                type="button"
                onClick={handleLockVault}
                className={styles.lockTopBtn}
                title="Lock Vault"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>

                <span>Lock Vault</span>
              </button>
            )}
          </div>
        </header>

        <main className={styles.main}>
          {(isOffline || projectsError) && (
            <p role="status">
              {isOffline ? 'Offline — the vault is locked.' : projectsError}
            </p>
          )}
          {!canUserLaunchApp(mainTab, access?.role) ? (
            <p role="alert">
              You do not have permission to open this application.
            </p>
          ) : getAppById(mainTab)?.requiresMasterPassword && !masterPassword ? (
            <MasterPassModal onSubmit={handleUnlockVault} />
          ) : mainTab === 'daily_workspace' ? (
            <DailyWorkspace />
          ) : mainTab === 'notepad' ? (
            <Notepad
              masterPassword={masterPassword}
              onUnlockVault={handleUnlockVault}
            />
          ) : mainTab === 'media' ? (
            <MediaVault
              masterPassword={masterPassword}
              onUnlockVault={handleUnlockVault}
            />
          ) : mainTab === 'music' ? (
            <MusicVault
              masterPassword={masterPassword}
              onUnlockVault={handleUnlockVault}
            />
          ) : mainTab === 'devices' ? (
            <DeviceList
              devices={devices}
              securityEvents={securityEvents}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={(id) => setSelectedDeviceId(id)}
              onConnectTerminal={(dev) => {
                setSelectedDeviceId(dev.id);
                handleTabChange('terminal');
              }}
              onRegisterDevice={() => setIsEnrollModalOpen(true)}
              onRenameDevice={handleRenameDevice}
              onRevokeDevice={handleRevokeDevice}
            />
          ) : mainTab === 'terminal' ? (
            <RemoteTerminal
              devices={devices}
              selectedDevice={selectedDevice}
              onSelectDevice={(id) => setSelectedDeviceId(id)}
              onOpenDeviceManager={() => handleTabChange('devices')}
            />
          ) : mainTab === 'users' ? (
            <UserManagement />
          ) : !masterPassword ? (
            <MasterPassModal onSubmit={handleUnlockVault} />
          ) : (
            <>
              {mainTab === 'general' ? (
                <>
                  {access?.role !== 'viewer' && (
                    <div className={styles.adminSection}>
                      <AddProject masterPassword={masterPassword} />
                    </div>
                  )}

                  <div>
                    <div className={styles.sectionHeader}>
                      <div>
                        <h2 className={styles.sectionTitle}>
                          Encrypted Projects
                        </h2>

                        <p className={styles.sectionSubtitle}>
                          Decryption keys are generated transiently in memory
                          and never sent to any server.
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div className={styles.scopeToggle} role="tablist" aria-label="Project Scope Filter">
                          <button
                            type="button"
                            role="tab"
                            aria-selected={projectScope === 'my'}
                            className={`${styles.scopeBtn} ${projectScope === 'my' ? styles.scopeBtnActive : ''}`}
                            onClick={() => handleScopeChange('my')}
                            title="Show only your individual projects"
                          >
                            <span>👤 My Projects</span>
                            <span className={styles.scopeCount}>{myProjects.length}</span>
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={projectScope === 'all'}
                            className={`${styles.scopeBtn} ${projectScope === 'all' ? styles.scopeBtnActive : ''}`}
                            onClick={() => handleScopeChange('all')}
                            title="Show all projects in workspace"
                          >
                            <span>🏢 All Projects</span>
                            <span className={styles.scopeCount}>{projects.length}</span>
                          </button>
                        </div>

                        <span className={styles.badge}>
                          {displayedProjects.length}{' '}
                          {displayedProjects.length === 1 ? 'Project' : 'Projects'}
                        </span>
                      </div>
                    </div>

                    {isLoading ? (
                      <div className={styles.grid}>
                        {[1, 2, 3].map((number) => (
                          <div key={number} className={styles.skeleton} />
                        ))}
                      </div>
                    ) : displayedProjects.length === 0 ? (
                      <div className={styles.emptyState}>
                        <svg
                          className={styles.emptyIcon}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>

                        <h3 className={styles.emptyTitle}>
                          {projectScope === 'my'
                            ? 'No Personal Projects'
                            : 'No Projects Found'}
                        </h3>

                        <p className={styles.emptyText}>
                          {projectScope === 'my'
                            ? 'You have not added any individual projects yet. Use the presets above to add your first project.'
                            : 'There are currently no projects available for this business.'}
                        </p>
                      </div>
                    ) : (
                      <div className={styles.grid}>
                        {displayedProjects.map((project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            masterPassword={masterPassword}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <MinecraftVault masterPassword={masterPassword} user={user} />
              )}
            </>
          )}
        </main>
      </div>

      <InstallGuideModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      <DeviceEnrollmentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        onRegister={handleRegisterDevice}
      />

      <GlobalAudioPlayer />
    </div>
  );
};

export default Dashboard;
