import React from 'react';
import { useTheme } from '../context/ThemeContext';
import styles from './Sidebar.module.css';

export const Sidebar = ({
  activeTab,
  setActiveTab,
  projectsCount,
  userEmail,
  masterPassword,
  onLockVault,
  onLogout,
  onInstallClick,
  onTestGoogleClick,
  isOpen,
  onClose,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      )}

      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        {/* Brand Header */}
        <div className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.logoWrapper}>
              <svg className={styles.logoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 className={styles.brandTitle}>Elyx Vault</h1>
              <div className={styles.statusBadge}>
                <span className={styles.statusDot} />
                <span>Zero-Knowledge</span>
              </div>
            </div>
          </div>
          {/* Close button for mobile */}
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close Sidebar">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Content */}
        <div className={styles.navContainer}>
          {/* Vault Sections */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Vault Sections / ԲԱԺԻՆՆԵՐ</span>
            <nav className={styles.navList}>
              <button
                className={`${styles.navItem} ${activeTab === 'daily_workspace' ? styles.navItemActive : ''}`}
                onClick={() => {
                  setActiveTab('daily_workspace');
                  if (onClose) onClose();
                }}
              >
                <div className={styles.navItemIcon}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className={styles.navItemText}>Daily Workspace</span>
              </button>

              <button
                className={`${styles.navItem} ${activeTab === 'general' ? styles.navItemActive : ''}`}
                onClick={() => {
                  setActiveTab('general');
                  if (onClose) onClose();
                }}
              >
                <div className={styles.navItemIcon}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <span className={styles.navItemText}>Web Projects</span>
                {typeof projectsCount === 'number' && (
                  <span className={styles.badge}>{projectsCount}</span>
                )}
              </button>

              <button
                className={`${styles.navItem} ${activeTab === 'minecraft' ? styles.navItemActiveMinecraft : ''}`}
                onClick={() => {
                  setActiveTab('minecraft');
                  if (onClose) onClose();
                }}
              >
                <div className={styles.navItemIcon}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
                <span className={styles.navItemText}>Minecraft Server</span>
              </button>

              <button
                className={`${styles.navItem} ${activeTab === 'users' ? styles.navItemActive : ''}`}
                onClick={() => {
                  setActiveTab('users');
                  if (onClose) onClose();
                }}
              >
                <div className={styles.navItemIcon}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <span className={styles.navItemText}>Users & Roles</span>
              </button>
            </nav>
          </div>

          {/* Remote Access Section */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Remote Access / ՀԵՌԱՀԱՐ ՄՈՒՏՔ</span>
            <nav className={styles.navList}>
              <button
                className={`${styles.navItem} ${activeTab === 'devices' ? styles.navItemActive : ''}`}
                onClick={() => {
                  setActiveTab('devices');
                  if (onClose) onClose();
                }}
              >
                <div className={styles.navItemIcon}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className={styles.navItemText}>My Devices</span>
              </button>

              <button
                className={`${styles.navItem} ${activeTab === 'terminal' ? styles.navItemActive : ''}`}
                onClick={() => {
                  setActiveTab('terminal');
                  if (onClose) onClose();
                }}
              >
                <div className={styles.navItemIcon}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className={styles.navItemText}>Remote Terminal</span>
              </button>
            </nav>
          </div>

          {/* Quick Tools */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Tools & Extensions</span>
            <div className={styles.toolsList}>
              <button onClick={onInstallClick} className={styles.toolBtn}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Install Chrome Extension</span>
              </button>

              <button onClick={onTestGoogleClick} className={styles.toolBtn}>
                <svg fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                </svg>
                <span>Test Google Auto-fill</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Area */}
        <div className={styles.footer}>
          {/* Global Light / Dark Theme Switcher */}
          <button onClick={toggleTheme} className={styles.themeToggleBtn} title="Toggle Light / Dark mode">
            <div className={styles.themeInfo}>
              {theme === 'light' ? (
                <>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18" className={styles.sunIcon}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18" className={styles.moonIcon}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span>Dark Mode</span>
                </>
              )}
            </div>
            <span className={styles.themeBadge}>
              {theme === 'light' ? 'Active' : 'Dark'}
            </span>
          </button>

          {/* User Profile Info */}
          {userEmail && (
            <div className={styles.userCard}>
              <div className={styles.userAvatar}>
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{userEmail.split('@')[0]}</span>
                <span className={styles.userEmail}>{userEmail}</span>
              </div>
            </div>
          )}

          {/* Lock & Logout Buttons */}
          <div className={styles.actionButtons}>
            {masterPassword && (
              <button onClick={onLockVault} className={styles.lockBtn} title="Lock Vault">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Lock</span>
              </button>
            )}
            <button onClick={onLogout} className={styles.logoutBtn} title="Logout">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
