import { canUserLaunchApp } from '../registry/appRegistry.js';
import { isActiveAccess } from '../../utils/access.js';
import React, { lazy, Suspense } from 'react';
import { getAppById } from '../registry/appRegistry.js';
import { MOBILE_THEMES } from './types.js';
import AppErrorBoundary from '../windows/AppErrorBoundary.jsx';
import { MasterPassModal } from '../../components/MasterPassModal.jsx';
import styles from './MobileShell.module.css';

// Import All Direct Application Components (Same as Desktop WindowManagerStage)
const DailyWorkspace = lazy(() => import('../../components/daily-workspace/DailyWorkspace.jsx'));
const Notepad = lazy(() => import('../../components/notepad/Notepad.jsx'));
const MediaVault = lazy(() => import('../../components/media/MediaVault.jsx'));
const MusicVault = lazy(() => import('../../components/music/MusicVault.jsx'));
const MinecraftVault = lazy(() => import('../../components/MinecraftVault/MinecraftVault.jsx'));
const UserManagement = lazy(() => import('../../components/UserManagement.jsx'));
const DeviceList = lazy(() => import('../../components/remote/DeviceList.jsx'));
const RemoteTerminal = lazy(() => import('../../components/remote/RemoteTerminal.jsx'));
const AddProject = lazy(() => import('../../components/AddProject.jsx'));
const ProjectCard = lazy(() => import('../../components/ProjectCard.jsx'));
const FileManager = lazy(() => import('../files/FileManager.jsx'));
const SystemSettingsApp = lazy(() => import('../settings/SystemSettingsApp.jsx'));
const ExtensionToolsApp = lazy(() => import('../settings/ExtensionToolsApp.jsx'));

export function MobileAppContainer({
  appId,
  theme = MOBILE_THEMES.IOS,
  onBack,
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
  const app = getAppById(appId);
  if (!app) return <p role="alert">Application unavailable. Return home and choose another app.</p>;
  if (!isActiveAccess(access) || !canUserLaunchApp(app, access.role)) return <p role="alert">You do not have permission to open this application.</p>;

  const isLocked = app.requiresMasterPassword && !masterPassword;

  const renderContent = () => {
    if (isLocked) {
      return (
        <div className={styles.mobileLockedContainer}>
          <div className={styles.mobileLockedCard}>
            <div className={styles.mobileLockedIcon}>🔒</div>
            <h3 className={styles.mobileLockedTitle}>{app.name} is Protected</h3>
            <p className={styles.mobileLockedSubtitle}>
              Please enter your vault master password to decrypt this module.
            </p>
            <MasterPassModal onSubmit={onUnlockVault} />
          </div>
        </div>
      );
    }

    switch (appId) {
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
        return (
          <MinecraftVault
            masterPassword={masterPassword}
            user={user}
          />
        );

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
          <div className={styles.mobileProjectsModule}>
            {access?.role !== 'viewer' && (
              <div className={styles.mobileAddProject}>
                <AddProject masterPassword={masterPassword} />
              </div>
            )}
            <div className={styles.mobileProjectsHeader}>
              <h3>Encrypted Web Projects</h3>
              <span className={styles.mobileCountBadge}>{projects.length}</span>
            </div>
            {projects.length === 0 ? (
              <div className={styles.mobileEmptyText}>
                No encrypted projects found.
              </div>
            ) : (
              <div className={styles.mobileProjectsList}>
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
          <div className={styles.mobileGenericApp}>
            <h3>{app.name}</h3>
            <p>Application ready.</p>
          </div>
        );
    }
  };

  return (
    <div
      className={`${styles.appFullscreenContainer} ${
        theme === MOBILE_THEMES.ANDROID ? styles.appContainerAndroid : styles.appContainerIOS
      }`}
      role="main"
      aria-label={`${app.name} Application View`}
    >
      {/* Mobile Top App Bar (iOS Chevron or Android Arrow) */}
      <header className={styles.mobileAppHeader}>
        <button
          type="button"
          className={styles.mobileBackBtn}
          onClick={onBack}
          aria-label="Back to Home"
          title="Back to Home"
        >
          {theme === MOBILE_THEMES.ANDROID ? (
            <span className={styles.androidBackArrow}>←</span>
          ) : (
            <span className={styles.iosBackChevron}>‹ Home</span>
          )}
        </button>

        <div className={styles.mobileHeaderCenter}>
          <span
            className={styles.mobileHeaderAppBadge}
            style={{ backgroundColor: app.icon?.badgeColor || '#6366f1' }}
          >
            {app.icon?.symbol || '📱'}
          </span>
          <span className={styles.mobileHeaderAppTitle}>{app.name}</span>
        </div>

        <div className={styles.mobileHeaderRight}>
          {masterPassword && (
            <button
              type="button"
              className={styles.mobileHeaderLockBtn}
              onClick={onLockVault}
              title="Lock Elyx Vault"
            >
              🔒
            </button>
          )}
        </div>
      </header>

      {/* App Body Content */}
      <div className={styles.mobileAppBody}>
        <AppErrorBoundary appTitle={app.name}>
          <Suspense fallback={<div className={styles.mobileLoadingText}>Loading {app.name}…</div>}>
            {renderContent()}
          </Suspense>
        </AppErrorBoundary>
      </div>
    </div>
  );
}

export default MobileAppContainer;
