import React, { Suspense } from 'react';
import { getAppById } from '../registry/appRegistry.js';
import { MOBILE_THEMES } from './types.js';
import AppErrorBoundary from '../windows/AppErrorBoundary.jsx';
import { MasterPassModal } from '../../components/MasterPassModal.jsx';
import styles from './MobileShell.module.css';

// Import All Direct Application Components (Same as Desktop WindowManagerStage)
import DailyWorkspace from '../../components/daily-workspace/DailyWorkspace.jsx';
import Notepad from '../../components/notepad/Notepad.jsx';
import MediaVault from '../../components/media/MediaVault.jsx';
import MusicVault from '../../components/music/MusicVault.jsx';
import MinecraftVault from '../../components/MinecraftVault/MinecraftVault.jsx';
import UserManagement from '../../components/UserManagement.jsx';
import DeviceList from '../../components/remote/DeviceList.jsx';
import RemoteTerminal from '../../components/remote/RemoteTerminal.jsx';
import AddProject from '../../components/AddProject.jsx';
import { ProjectCard } from '../../components/ProjectCard.jsx';
import FileManager from '../files/FileManager.jsx';
import SystemSettingsApp from '../settings/SystemSettingsApp.jsx';
import ExtensionToolsApp from '../settings/ExtensionToolsApp.jsx';

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
  if (!app) return null;

  const isLocked = app.requiresMasterPassword && !masterPassword;

  const renderContent = () => {
    if (isLocked) {
      return (
        <div className={styles.mobileLockedContainer}>
          <div className={styles.mobileLockedCard}>
            <div className={styles.mobileLockedIcon}>🔒</div>
            <h3 className={styles.mobileLockedTitle}>{app.name} is Protected</h3>
            <p className={styles.mobileLockedSubtitle}>
              Please enter your zero-knowledge master password to decrypt this module.
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
              title="Lock Zero-Knowledge Vault"
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
