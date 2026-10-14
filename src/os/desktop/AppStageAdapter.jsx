import { canUserLaunchApp } from '../registry/appRegistry.js';
import { isActiveAccess } from '../../utils/access.js';
import React, { lazy, Suspense } from 'react';
import { getAppById } from '../registry/appRegistry.js';
import { MasterPassModal } from '../../components/MasterPassModal.jsx';
import styles from './AppStageAdapter.module.css';

// Direct module imports
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

export function AppStageAdapter({
  activeAppId,
  onCloseApp,
  masterPassword,
  onUnlockVault,
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
  if (!activeAppId) return null;

  const app = getAppById(activeAppId);
  if (!app || !isActiveAccess(access) || !canUserLaunchApp(app, access.role)) return <p role="alert">Application unavailable or access denied.</p>;

  const requiresPass = app.requiresMasterPassword;
  const isLocked = requiresPass && !masterPassword;

  const renderAppContent = () => {
    if (isLocked) {
      return (
        <div className={styles.lockedContainer}>
          <div className={styles.lockedCard}>
            <div className={styles.lockedIcon}>🔒</div>
            <h3 className={styles.lockedTitle}>{app.name} is Protected</h3>
            <p className={styles.lockedSubtitle}>
              Please enter your vault master password to decrypt this vault module.
            </p>
            <MasterPassModal onSubmit={onUnlockVault} />
          </div>
        </div>
      );
    }

    switch (activeAppId) {
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
              <span className={styles.projectsCountBadge}>{projects.length} Projects</span>
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
            <h3>{app.name}</h3>
            <p>{app.description}</p>
          </div>
        );
    }
  };

  return (
    <div className={styles.stageOverlay} role="dialog" aria-modal="true" aria-label={app.name}>
      {/* Backdrop with frosted glass */}
      <div className={styles.stageBackdrop} onClick={onCloseApp} />

      {/* Main Window Frame Stage */}
      <div className={styles.windowFrame}>
        {/* macOS-style Window Titlebar */}
        <div className={styles.windowTitlebar}>
          <div className={styles.trafficLights}>
            <button
              type="button"
              className={`${styles.trafficBtn} ${styles.trafficClose}`}
              onClick={onCloseApp}
              title="Close window (Esc)"
              aria-label="Close application window"
            />
            <button
              type="button"
              className={`${styles.trafficBtn} ${styles.trafficMin}`}
              onClick={onCloseApp}
              title="Minimize window"
              aria-label="Minimize application window"
            />
            <button
              type="button"
              className={`${styles.trafficBtn} ${styles.trafficMax}`}
              title="Zoom window"
              aria-label="Zoom application window"
            />
          </div>

          <div className={styles.windowTitle}>
            <span
              className={styles.titleIconBadge}
              style={{ backgroundColor: app.icon?.badgeColor || '#6366f1' }}
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox={app.icon?.viewBox || '0 0 24 24'}
                width="14"
                height="14"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={app.icon?.path}
                />
              </svg>
            </span>
            <span className={styles.titleText}>{app.name}</span>
          </div>

          <div className={styles.titlebarRight}>
            <button
              type="button"
              className={styles.doneBtn}
              onClick={onCloseApp}
              title="Return to Desktop"
            >
              Done
            </button>
          </div>
        </div>

        {/* Window Viewport Body */}
        <div className={styles.windowBody}>
          <Suspense fallback={<div className={styles.loadingSpinner}>Loading {app.name}…</div>}>
            {renderAppContent()}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default AppStageAdapter;
