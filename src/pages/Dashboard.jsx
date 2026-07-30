import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { useAuth } from '../hooks/useAuth';
import { MasterPassModal } from '../components/MasterPassModal';
import { ProjectCard } from '../components/ProjectCard';
import AddProject from '../components/AddProject';
import InstallGuideModal from '../components/InstallGuideModal';
import styles from './Dashboard.module.css';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [masterPassword, setMasterPassword] = useState(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'projects'));
        const fetchedProjects = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProjects(fetchedProjects);
      } catch (error) {
        console.error('[Firestore Error] Failed to fetch projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  const handleLockVault = () => {
    setMasterPassword(null);
  };

  const handleDelete = async (projectId) => {
    try {
      await deleteDoc(doc(db, 'projects', projectId));
      setProjects((prevProjects) => prevProjects.filter((p) => p.id !== projectId));
    } catch (error) {
      console.error('[Firestore Error] Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  const triggerDownload = () => {
    const link = document.createElement('a');
    link.href = '/extension.zip';
    link.download = 'extension.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInstallClick = () => {
    triggerDownload();
    setIsInstallModalOpen(true);
  };

  const handleTestGoogleClick = () => {
    window.open(
      'https://accounts.google.com/v3/signin/identifier?flowName=GlifWebSignIn&flowEntry=ServiceLogin',
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <svg className={styles.brandIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h1 className={styles.brandTitle}>Zero-Knowledge Vault</h1>
        </div>

        <div className={styles.nav}>
          <button onClick={handleInstallClick} className={styles.downloadBtn} title="Install to Chrome">
            <svg className={styles.downloadIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Install to Chrome
          </button>

          <button onClick={handleTestGoogleClick} className={styles.testGoogleBtn} title="Open Google Login Page to test auto-fill">
            <svg className={styles.testGoogleIcon} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
            </svg>
            Test Google Auto-fill
          </button>

          <span className={styles.userEmail}>{user?.email}</span>

          {masterPassword && (
            <button onClick={handleLockVault} className={styles.lockButton}>
              Lock Vault
            </button>
          )}

          <button onClick={logout} className={styles.logoutButton}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={styles.main}>
        {!masterPassword ? (
          <MasterPassModal onSubmit={(pass) => setMasterPassword(pass)} />
        ) : (
          <>
            <div className={styles.adminSection}>
              <AddProject masterPassword={masterPassword} />
            </div>

            <div>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Encrypted Projects</h2>
                  <p className={styles.sectionSubtitle}>
                    Decryption keys are generated transiently in memory and never sent to any server.
                  </p>
                </div>
                <span className={styles.badge}>
                  {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
                </span>
              </div>

              {isLoading ? (
                <div className={styles.grid}>
                  {[1, 2, 3].map((n) => (
                    <div key={n} className={styles.skeleton} />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className={styles.emptyState}>
                  <svg className={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className={styles.emptyTitle}>No Projects Found</h3>
                  <p className={styles.emptyText}>
                    There are currently no items in your Firestore 'projects' collection.
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
        )}
      </main>

      {/* Installation Guide Modal */}
      <InstallGuideModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onRedownload={triggerDownload}
      />
    </div>
  );
};

export default Dashboard;
