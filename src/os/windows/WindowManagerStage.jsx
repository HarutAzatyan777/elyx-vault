import { canUserLaunchApp, getAppById } from '../registry/appRegistry.js';
import { isActiveAccess } from '../../utils/access.js';
import React, { lazy, Suspense, useMemo } from 'react';
import { useWindowManager } from '../hooks/useWindowManager.js';
import { useOS } from '../hooks/useOS.js';
import { WORKSPACE_MODES } from '../workspaces/types.js';
import WindowFrame from './WindowFrame.jsx';
import AppErrorBoundary from './AppErrorBoundary.jsx';
import { MasterPassModal } from '../../components/MasterPassModal.jsx';
import styles from './WindowManagerStage.module.css';

// Direct Application Component Imports
const DailyWorkspace = lazy(
  () => import('../../components/daily-workspace/DailyWorkspace.jsx'),
);
const Notepad = lazy(() => import('../../components/notepad/Notepad.jsx'));
const MediaVault = lazy(() => import('../../components/media/MediaVault.jsx'));
const MusicVault = lazy(() => import('../../components/music/MusicVault.jsx'));
const MinecraftVault = lazy(
  () => import('../../components/MinecraftVault/MinecraftVault.jsx'),
);
const UserManagement = lazy(
  () => import('../../components/UserManagement.jsx'),
);
const DeviceList = lazy(() => import('../../components/remote/DeviceList.jsx'));
const RemoteTerminal = lazy(
  () => import('../../components/remote/RemoteTerminal.jsx'),
);
const AddProject = lazy(() => import('../../components/AddProject.jsx'));
const ProjectCard = lazy(() => import('../../components/ProjectCard.jsx'));
const FileManager = lazy(() => import('../files/FileManager.jsx'));
const SystemSettingsApp = lazy(
  () => import('../settings/SystemSettingsApp.jsx'),
);
const ExtensionToolsApp = lazy(
  () => import('../settings/ExtensionToolsApp.jsx'),
);

const WindowApplication = React.memo(function WindowApplication({
  appId,
  title,
  appProps,
}) {
  const {
    masterPassword,
    onUnlockVault,
    onLockVault,
    user,
    access,
    projects,
    onDeleteProject,
    devices,
    securityEvents,
    selectedDevice,
    selectedDeviceId,
    setSelectedDeviceId,
    onRegisterDevice,
    onRenameDevice,
    onRevokeDevice,
    onOpenApp,
  } = appProps;
  const win = { appId, title };
  if (!isActiveAccess(access) || !canUserLaunchApp(win.appId, access.role))
    return (
      <p role="alert">You do not have permission to open this application.</p>
    );
  const isLocked =
    getAppById(win.appId)?.requiresMasterPassword && !masterPassword;

  if (isLocked) {
    return (
      <div className={styles.lockedContainer}>
        <div className={styles.lockedCard}>
          <div className={styles.lockedIcon}>🔒</div>
          <h3 className={styles.lockedTitle}>{win.title} is Protected</h3>
          <p className={styles.lockedSubtitle}>
            Please enter your vault master password to decrypt this vault
            module.
          </p>
          <MasterPassModal onSubmit={onUnlockVault} />
        </div>
      </div>
    );
  }

  switch (win.appId) {
    case 'daily_workspace':
      return <DailyWorkspace />;

    case 'notepad':
      return (
        <Notepad
          masterPassword={masterPassword}
          onUnlockVault={onUnlockVault}
        />
      );

    case 'media':
      return (
        <MediaVault
          masterPassword={masterPassword}
          onUnlockVault={onUnlockVault}
        />
      );

    case 'music':
      return (
        <MusicVault
          masterPassword={masterPassword}
          onUnlockVault={onUnlockVault}
        />
      );

    case 'minecraft':
      return <MinecraftVault masterPassword={masterPassword} user={user} />;

    case 'users':
      return <UserManagement />;

    case 'devices':
      return (
        <DeviceList
          devices={devices}
          securityEvents={securityEvents}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={(id) => setSelectedDeviceId?.(id)}
          onConnectTerminal={(dev) => {
            setSelectedDeviceId?.(dev.id);
            onOpenApp?.('terminal');
          }}
          onRegisterDevice={onRegisterDevice}
          onRenameDevice={onRenameDevice}
          onRevokeDevice={onRevokeDevice}
        />
      );

    case 'terminal':
      return (
        <RemoteTerminal
          devices={devices}
          selectedDevice={selectedDevice}
          onSelectDevice={(id) => setSelectedDeviceId?.(id)}
          onOpenDeviceManager={() => onOpenApp?.('devices')}
        />
      );

    case 'files':
      return (
        <FileManager
          projects={projects}
          devices={devices}
          masterPassword={masterPassword}
          onOpenApp={onOpenApp}
        />
      );

    case 'settings':
      return (
        <SystemSettingsApp
          devices={devices}
          masterPassword={masterPassword}
          onLockVault={onLockVault}
          onUnlockVault={onUnlockVault}
        />
      );

    case 'extension':
      return <ExtensionToolsApp />;

    case 'general':
      return (
        <div className={styles.projectsModule}>
          {access?.role !== 'viewer' && (
            <div className={styles.addProjectSection}>
              <AddProject masterPassword={masterPassword} />
            </div>
          )}
          <div className={styles.projectsHeader}>
            <h3 className={styles.projectsTitle}>Encrypted Web Projects</h3>
            <span className={styles.projectsCountBadge}>
              {projects.length} Projects
            </span>
          </div>
          {projects.length === 0 ? (
            <div className={styles.emptyProjects}>
              <span>No encrypted projects found. Click above to add one.</span>
            </div>
          ) : (
            <div className={styles.projectsGrid}>
              {projects.map((proj) => (
                <ProjectCard
                  key={proj.id}
                  project={proj}
                  masterPassword={masterPassword}
                  onDelete={onDeleteProject}
                />
              ))}
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className={styles.genericPlaceholder}>
          <h3>{win.title}</h3>
          <p>Application ready.</p>
        </div>
      );
  }
});

export function WindowManagerStage({
  masterPassword,
  onUnlockVault,
  onLockVault,
  user,
  access,
  projects = [],
  onDeleteProject,
  devices = [],
  securityEvents = [],
  selectedDevice,
  selectedDeviceId,
  setSelectedDeviceId,
  onRegisterDevice,
  onRenameDevice,
  onRevokeDevice,
  onOpenApp,
}) {
  const {
    windows,
    focusWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    snapWindow,
    moveWindowToWorkspace,
    updateWindowBounds,
  } = useWindowManager();

  const { activeWorkspace, workspaces, workspaceMode } = useOS();

  const appProps = useMemo(
    () => ({
      masterPassword,
      onUnlockVault,
      onLockVault,
      user,
      access,
      projects,
      onDeleteProject,
      devices,
      securityEvents,
      selectedDevice,
      selectedDeviceId,
      setSelectedDeviceId,
      onRegisterDevice,
      onRenameDevice,
      onRevokeDevice,
      onOpenApp,
    }),
    [
      masterPassword,
      onUnlockVault,
      onLockVault,
      user,
      access,
      projects,
      onDeleteProject,
      devices,
      securityEvents,
      selectedDevice,
      selectedDeviceId,
      setSelectedDeviceId,
      onRegisterDevice,
      onRenameDevice,
      onRevokeDevice,
      onOpenApp,
    ],
  );
  if (windows.length === 0) return null;

  return (
    <div className={styles.stageLayer} aria-label="Window Manager Stage">
      {windows.map((win) => {
        const isWorkspaceActive =
          workspaceMode === WORKSPACE_MODES.DESKTOP
            ? (win.workspaceId || 1) === activeWorkspace
            : true;

        return (
          <WindowFrame
            key={win.id}
            win={win}
            onFocus={focusWindow}
            onClose={closeWindow}
            onMinimize={minimizeWindow}
            onMaximize={maximizeWindow}
            onRestore={restoreWindow}
            onSnap={snapWindow}
            onUpdateBounds={(bounds) => updateWindowBounds(win.id, bounds)}
            workspaces={workspaces}
            onMoveToWorkspace={moveWindowToWorkspace}
            isWorkspaceActive={isWorkspaceActive}
          >
            <AppErrorBoundary appTitle={win.title}>
              <Suspense
                fallback={
                  <div className={styles.loadingPlaceholder}>
                    Loading {win.title}…
                  </div>
                }
              >
                <WindowApplication
                  appId={win.appId}
                  title={win.title}
                  appProps={appProps}
                />
              </Suspense>
            </AppErrorBoundary>
          </WindowFrame>
        );
      })}
    </div>
  );
}

export default WindowManagerStage;
