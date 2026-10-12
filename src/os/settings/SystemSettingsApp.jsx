import React, { useState } from 'react';
import { useOS } from '../hooks/useOS.js';
import { WALLPAPER_PRESETS } from '../desktop/types.js';
import {
  DOCK_MODES,
  loadAutoHide,
  loadDockMode,
  saveAutoHide,
  saveDockMode,
} from '../dock/types.js';
import styles from './SystemSettingsApp.module.css';

export function SystemSettingsApp({ masterPassword, onLockVault, onUnlockVault }) {
  const { settings, updateSettings, isOSMode, toggleOSMode } = useOS();

  const [activeTab, setActiveTab] = useState('wallpaper');
  const [dockMode, setDockMode] = useState(loadDockMode);
  const [autoHide, setAutoHide] = useState(loadAutoHide);

  const handleDockModeChange = (mode) => {
    setDockMode(mode);
    saveDockMode(mode);
  };

  const handleAutoHideChange = (enabled) => {
    setAutoHide(enabled);
    saveAutoHide(enabled);
  };

  return (
    <div className={styles.settingsRoot} role="region" aria-label="System Settings">
      {/* Left Navigation Tabs */}
      <aside className={styles.settingsSidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>System Preferences</span>
        </div>

        <nav className={styles.tabsNav}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'wallpaper' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('wallpaper')}
          >
            <span>🎨</span>
            <span>Wallpaper & Glass</span>
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'dock' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('dock')}
          >
            <span>🪟</span>
            <span>Dock & Taskbar</span>
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'security' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <span>🔒</span>
            <span>Security & Cryptography</span>
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'about' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('about')}
          >
            <span>ℹ️</span>
            <span>About Elyx OS</span>
          </button>
        </nav>
      </aside>

      {/* Main Settings Content */}
      <main className={styles.settingsContent}>
        {activeTab === 'wallpaper' && (
          <div className={styles.section}>
            <h2 className={styles.sectionHeading}>Desktop Wallpaper</h2>
            <p className={styles.sectionDesc}>
              Select a visual backdrop inspired by organic aurora waves, cosmic nebulas, and slate gradients.
            </p>

            <div className={styles.wallpaperGrid}>
              {WALLPAPER_PRESETS.map((wp) => (
                <button
                  key={wp.id}
                  type="button"
                  className={`${styles.wallpaperCard} ${
                    settings.wallpaperId === wp.id ? styles.cardActive : ''
                  }`}
                  onClick={() => updateSettings({ wallpaperId: wp.id })}
                >
                  <div className={styles.previewBox} style={{ background: wp.darkCss }} />
                  <span className={styles.wallpaperName}>{wp.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'dock' && (
          <div className={styles.section}>
            <h2 className={styles.sectionHeading}>Dock & Taskbar Appearance</h2>
            <p className={styles.sectionDesc}>
              Customize the desktop interaction shell between macOS floating dock and Windows 11 taskbar.
            </p>

            <div className={styles.settingGroup}>
              <h3 className={styles.groupHeading}>Interface Shell Style</h3>
              <div className={styles.modeChooser}>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${dockMode === DOCK_MODES.DOCK ? styles.modeActive : ''}`}
                  onClick={() => handleDockModeChange(DOCK_MODES.DOCK)}
                >
                  <div className={styles.modeIcon}>🍏</div>
                  <div className={styles.modeText}>
                    <strong>macOS Floating Dock</strong>
                    <span>Centered floating glass shelf with magnification</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`${styles.modeBtn} ${dockMode === DOCK_MODES.TASKBAR ? styles.modeActive : ''}`}
                  onClick={() => handleDockModeChange(DOCK_MODES.TASKBAR)}
                >
                  <div className={styles.modeIcon}>🪟</div>
                  <div className={styles.modeText}>
                    <strong>Windows 11 Taskbar</strong>
                    <span>Full-width bottom bar with Start menu and system tray</span>
                  </div>
                </button>
              </div>
            </div>

            <div className={styles.toggleRow}>
              <div>
                <strong>Auto-Hide Dock / Taskbar</strong>
                <p>Hide shelf until cursor approaches the bottom edge</p>
              </div>
              <button
                type="button"
                className={`${styles.toggleBtn} ${autoHide ? styles.toggleOn : ''}`}
                onClick={() => handleAutoHideChange(!autoHide)}
              >
                {autoHide ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className={styles.section}>
            <h2 className={styles.sectionHeading}>Zero-Knowledge Cryptography</h2>
            <p className={styles.sectionDesc}>
              Elyx OS operates under strict client-side zero-knowledge encryption. Decryption keys reside purely in transient memory.
            </p>

            <div className={styles.statusBox}>
              <div className={styles.statusRow}>
                <span>Vault Status:</span>
                <span className={masterPassword ? styles.unlockedText : styles.lockedText}>
                  {masterPassword ? '🔓 Unlocked (Active Session)' : '🔒 Locked'}
                </span>
              </div>
              <div className={styles.statusRow}>
                <span>Cipher Algorithm:</span>
                <span className={styles.cipherText}>AES-256-CBC • PBKDF2 (10,000 iterations)</span>
              </div>
              <div className={styles.statusRow}>
                <span>Cloud Storage:</span>
                <span className={styles.cipherText}>Ciphertext only (Zero-Knowledge)</span>
              </div>
            </div>

            {masterPassword ? (
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={onLockVault}
              >
                🔒 Lock Vault & Purge Keys Immediately
              </button>
            ) : (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={onUnlockVault}
              >
                🔓 Enter Master Password to Decrypt
              </button>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className={styles.section}>
            <h2 className={styles.sectionHeading}>Elyx OS 1.0</h2>
            <p className={styles.sectionDesc}>
              Personal Cloud Operating System integrating desktop window management, zero-knowledge security, and local daemons.
            </p>

            <div className={styles.specGrid}>
              <div className={styles.specCard}>
                <span>Frontend Framework</span>
                <strong>React 19 • Vite 8</strong>
              </div>
              <div className={styles.specCard}>
                <span>Backend Services</span>
                <strong>Firebase 12 • Firestore • RTDB</strong>
              </div>
              <div className={styles.specCard}>
                <span>Terminal Engine</span>
                <strong>xterm.js • WebSocket Daemon</strong>
              </div>
              <div className={styles.specCard}>
                <span>Window Server</span>
                <strong>Elyx Quartz Multi-Window Stage</strong>
              </div>
            </div>

            <div className={styles.classicSwitchSection}>
              <h3>Desktop Environment Switcher</h3>
              <p>You can toggle back to the classic dashboard at any time without data loss.</p>
              <button
                type="button"
                className={styles.classicBtn}
                onClick={toggleOSMode}
              >
                ⚡ Switch to Classic Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default SystemSettingsApp;
