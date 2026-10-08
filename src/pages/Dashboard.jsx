import React, { useEffect, useState } from 'react';
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
import AddProject from '../components/AddProject';
import InstallGuideModal from '../components/InstallGuideModal';

import UserManagement from '../components/UserManagement';
import MinecraftVault from '../components/MinecraftVault/MinecraftVault';
import DailyWorkspace from '../components/daily-workspace/DailyWorkspace';
import DeviceList from '../components/remote/DeviceList';
import DeviceEnrollmentModal from '../components/remote/DeviceEnrollmentModal';
import RemoteTerminal from '../components/remote/RemoteTerminal';
import { useRemoteDevices } from '../hooks/useRemoteDevices';
import Sidebar from '../components/Sidebar';

import styles from './Dashboard.module.css';

export const Dashboard = () => {
  const { user, access, logout } = useAuth();
  const {
    devices,
    securityEvents,
    selectedDevice,
    selectedDeviceId,
    setSelectedDeviceId,
    handleRegisterDevice,
    handleRenameDevice,
    handleRevokeDevice,
  } = useRemoteDevices();

  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [masterPassword, setMasterPassword] = useState(() => {
    try {
      return sessionStorage.getItem('elyx_master_pass') || localStorage.getItem('elyx_master_pass') || null;
    } catch {
      return null;
    }
  });
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [mainTab, setMainTab] = useState('general');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const projectsCollection = collection(db, 'projects');
    const projectsQuery = access?.businessId
      ? query(projectsCollection, where('businessId', '==', access.businessId))
      : projectsCollection;

    const unsubscribe = onSnapshot(
      projectsQuery,
      (querySnapshot) => {
        const fetchedProjects = querySnapshot.docs.map((projectDoc) => ({
          id: projectDoc.id,
          ...projectDoc.data(),
        }));

        setProjects(fetchedProjects);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching projects in real-time:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, access?.businessId]);

  const handleUnlockVault = (password, remember = true) => {
    setMasterPassword(password);
    try {
      sessionStorage.setItem('elyx_master_pass', password);
      if (remember) {
        localStorage.setItem('elyx_master_pass', password);
      }
    } catch (err) {
      console.error('Failed to store master pass:', err);
    }
  };

  const handleLockVault = () => {
    setMasterPassword(null);
    try {
      sessionStorage.removeItem('elyx_master_pass');
      localStorage.removeItem('elyx_master_pass');
    } catch (err) {
      console.error('Failed to clear master pass:', err);
    }
  };

  const handleDelete = async (projectId) => {
    if (!projectId) return;

    try {
      await deleteDoc(doc(db, 'projects', projectId));

      setProjects((currentProjects) =>
        currentProjects.filter((project) => project.id !== projectId)
      );
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleInstallClick = () => {
    setIsInstallModalOpen(true);
  };

  const handleTestGoogleClick = () => {
    window.open('https://accounts.google.com/', '_blank', 'noopener,noreferrer');
  };

  const handleTabChange = (tab) => {
    setMainTab(tab);
    setIsSidebarOpen(false);
  };

  return (
    <div className={styles.layout}>
      <Sidebar
        activeTab={mainTab}
        setActiveTab={handleTabChange}
        projectsCount={projects.length}
        userEmail={user?.email}
        masterPassword={masterPassword}
        onLockVault={handleLockVault}
        onLogout={logout}
        onInstallClick={handleInstallClick}
        onTestGoogleClick={handleTestGoogleClick}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className={styles.mainWrapper}>
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
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

            <div>
              <h1 className={styles.pageTitle}>
                {mainTab === 'daily_workspace'
                  ? '⚡ Daily Workspace'
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
                  : mainTab === 'devices'
                  ? 'Manage enrolled Windows PCs running Elyx Agent'
                  : mainTab === 'terminal'
                  ? 'Interactive PowerShell PTY session over Tailscale'
                  : mainTab === 'users'
                  ? 'Role Level Control & User Authorization'
                  : 'Zero-Knowledge Encrypted Storage'}
              </p>
            </div>
          </div>

          <div className={styles.topBarRight}>
            {access?.role && (
              <span className={styles.roleBadge}>
                {access.role}
              </span>
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
          {mainTab === 'daily_workspace' ? (
            <DailyWorkspace />
          ) : mainTab === 'devices' ? (
            <DeviceList
              devices={devices}
              securityEvents={securityEvents}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={(id) => setSelectedDeviceId(id)}
              onConnectTerminal={(dev) => {
                setSelectedDeviceId(dev.id);
                setMainTab('terminal');
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
              onOpenDeviceManager={() => setMainTab('devices')}
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

                      <span className={styles.badge}>
                        {projects.length}{' '}
                        {projects.length === 1 ? 'Project' : 'Projects'}
                      </span>
                    </div>

                    {isLoading ? (
                      <div className={styles.grid}>
                        {[1, 2, 3].map((number) => (
                          <div
                            key={number}
                            className={styles.skeleton}
                          />
                        ))}
                      </div>
                    ) : projects.length === 0 ? (
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
                          No Projects Found
                        </h3>

                        <p className={styles.emptyText}>
                          There are currently no projects available for this
                          business.
                        </p>
                      </div>
                    ) : (
                      <div className={styles.grid}>
                        {projects.map((project) => (
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
                <MinecraftVault
                  masterPassword={masterPassword}
                  user={user}
                />
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
    </div>
  );
};

export default Dashboard;