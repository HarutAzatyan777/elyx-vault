import React, { useState } from 'react';
import { useOS } from '../hooks/useOS.js';
import { useSystemStatus } from '../hooks/useSystemStatus.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import { WALLPAPER_PRESETS } from '../desktop/types.js';
import { loadAutoHide, saveAutoHide, saveDockMode } from '../dock/types.js';
import {
  isMasterPasswordSaved,
  clearStoredMasterPassword,
  saveStoredMasterPassword,
} from '../../utils/vaultAuth.js';
import styles from './SystemSettingsApp.module.css';
const categories = [
  'Appearance',
  'Desktop and Wallpaper',
  'Dock and Taskbar',
  'Window Behavior',
  'Workspaces',
  'Notifications',
  'Keyboard Shortcuts',
  'Account',
  'Privacy and Security',
  'Storage',
  'Connected Devices / Local Agent',
  'About Elyx OS',
];
export default function SystemSettingsApp({
  masterPassword,
  onLockVault,
  devices = [],
}) {
  const {
    settings,
    updateSettings,
    workspaces,
    activeWorkspace,
    switchWorkspace,
    createWorkspace,
    renameWorkspace,
    toggleOSMode,
  } = useOS();
  const { user, access, connection, sessionStatus, agentStatus } =
    useSystemStatus();
  const { theme } = useTheme();
  const [active, setActive] = useState('Appearance');
  const [authUpdateTick, setAuthUpdateTick] = useState(0);
  const [autoHide, setAutoHide] = useState(loadAutoHide);
  const [storage, setStorage] = useState(null);
  const [storageError, setStorageError] = useState('');
  const select = (label, key, values) => (
    <label className={styles.toggleRow}>
      <strong>{label}</strong>
      <select
        aria-label={label}
        value={settings[key]}
        onChange={(e) => updateSettings({ [key]: e.target.value })}
      >
        {values.map(([value, name]) => (
          <option key={value} value={value}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
  const toggle = (label, key) => (
    <label className={styles.toggleRow}>
      <strong>{label}</strong>
      <input
        type="checkbox"
        checked={settings[key]}
        onChange={(e) => updateSettings({ [key]: e.target.checked })}
      />
    </label>
  );
  const desktop = (mode) => {
    updateSettings({ desktopMode: mode });
    saveDockMode(mode === 'windows' ? 'taskbar' : 'dock');
  };
  return (
    <div className={styles.settingsRoot} aria-label="System Settings">
      <aside className={styles.settingsSidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Elyx OS · Settings</span>
        </div>
        <nav className={styles.tabsNav} aria-label="Settings categories">
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              aria-current={active === name ? 'page' : undefined}
              className={`${styles.tabBtn} ${active === name ? styles.tabActive : ''}`}
              onClick={() => setActive(name)}
            >
              {name}
            </button>
          ))}
        </nav>
      </aside>
      <main className={styles.settingsContent}>
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>{active}</h2>
          <p className={styles.sectionDesc}>
            Your workspace, your preferences. Changes save on this browser.
          </p>
          {active === 'Appearance' && (
            <>
              {select('Theme', 'theme', [
                ['light', 'Light'],
                ['dark', 'Dark'],
                ['system', 'Follow system'],
              ])}
              <label className={styles.toggleRow}>
                <strong>Desktop mode</strong>
                <select
                  aria-label="Desktop mode"
                  value={settings.desktopMode}
                  onChange={(e) => desktop(e.target.value)}
                >
                  <option value="macos">macOS inspired</option>
                  <option value="windows">Windows inspired</option>
                  <option value="gnome">GNOME inspired</option>
                </select>
              </label>
              {select('Mobile mode', 'mobileMode', [
                ['ios', 'iOS inspired'],
                ['android', 'Android inspired'],
              ])}
              <label className={styles.toggleRow}>
                <strong>Accent color</strong>
                <input
                  type="color"
                  aria-label="Accent color"
                  value={settings.accentColor}
                  onChange={(e) =>
                    updateSettings({ accentColor: e.target.value })
                  }
                />
              </label>
              {toggle('Reduced motion', 'reducedMotion')}
              <p>System motion preferences are also respected.</p>
            </>
          )}
          {active === 'Desktop and Wallpaper' && (
            <div className={styles.wallpaperGrid}>
              {WALLPAPER_PRESETS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  aria-pressed={settings.wallpaperId === w.id}
                  className={`${styles.wallpaperCard} ${settings.wallpaperId === w.id ? styles.cardActive : ''}`}
                  onClick={() => updateSettings({ wallpaperId: w.id })}
                >
                  <div
                    className={styles.previewBox}
                    style={{
                      background: theme === 'light' ? w.lightCss : w.darkCss,
                    }}
                  />
                  <span className={styles.wallpaperName}>{w.name}</span>
                </button>
              ))}
            </div>
          )}
          {active === 'Dock and Taskbar' && (
            <>
              <div className={styles.modeChooser}>
                {[
                  ['macos', 'Floating dock'],
                  ['windows', 'Taskbar'],
                  ['gnome', 'GNOME overview'],
                ].map(([mode, label]) => (
                  <button
                    type="button"
                    key={mode}
                    aria-pressed={settings.desktopMode === mode}
                    className={styles.modeBtn}
                    onClick={() => desktop(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className={styles.toggleRow}>
                Auto hide
                <input
                  type="checkbox"
                  checked={autoHide}
                  onChange={(e) => {
                    setAutoHide(e.target.checked);
                    saveAutoHide(e.target.checked);
                  }}
                />
              </label>
            </>
          )}
          {active === 'Window Behavior' && (
            <>
              {toggle('Window snapping', 'windowSnapEnabled')}
              {toggle('Animations', 'animationsEnabled')}
            </>
          )}
          {active === 'Workspaces' && (
            <>
              {workspaces.map((w) => (
                <div className={styles.toggleRow} key={w.id}>
                  <input
                    aria-label={`Workspace ${w.id} name`}
                    value={w.name}
                    onChange={(e) => renameWorkspace(w.id, e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={activeWorkspace === w.id}
                    onClick={() => switchWorkspace(w.id)}
                  >
                    {activeWorkspace === w.id ? 'Current' : 'Switch'}
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => createWorkspace()}
              >
                Add workspace
              </button>
            </>
          )}
          {active === 'Notifications' && (
            <>
              {toggle('In-app notifications', 'notificationsEnabled')}
              {toggle('Hide notification previews', 'notificationPrivacy')}
              {['system', 'security', 'media', 'workspace', 'devices'].map(
                (category) => (
                  <label className={styles.toggleRow} key={category}>
                    {category}
                    <input
                      type="checkbox"
                      aria-label={`${category} notifications`}
                      checked={
                        !settings.disabledNotificationCategories.includes(
                          category,
                        )
                      }
                      onChange={(e) =>
                        updateSettings({
                          disabledNotificationCategories: e.target.checked
                            ? settings.disabledNotificationCategories.filter(
                                (c) => c !== category,
                              )
                            : [
                                ...settings.disabledNotificationCategories,
                                category,
                              ],
                        })
                      }
                    />
                  </label>
                ),
              )}
              <p>
                Notifications stay in memory and clear when you sign out or lock
                the vault. No browser notification permission is requested.
              </p>
            </>
          )}
          {active === 'Notifications' && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() =>
                window.dispatchEvent(new Event('elyx:open-notifications'))
              }
            >
              Open notification center
            </button>
          )}
          {active === 'Keyboard Shortcuts' && (
            <dl>
              <dt>Command search</dt>
              <dd>Ctrl / ⌘ + K</dd>
              <dt>App launcher</dt>
              <dd>Ctrl / ⌘ + Space</dd>
              <dt>Switch workspace</dt>
              <dd>Ctrl + Left / Right</dd>
              <dt>Close a panel</dt>
              <dd>Escape</dd>
              <dt>Navigate controls</dt>
              <dd>Tab / Shift + Tab</dd>
            </dl>
          )}
          {active === 'Account' && (
            <div className={styles.statusBox}>
              <p>{user?.displayName || 'Authenticated account'}</p>
              <p>{user?.email || 'Signed out'}</p>
              <p>
                Account ID: <code>{user?.uid || 'Unavailable'}</code>
              </p>
              <p>Role: {access?.role || 'Unavailable'}</p>
              <p>Work session: {sessionStatus}</p>
            </div>
          )}
          {active === 'Privacy and Security' && (
            <>
              <div style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                <p>
                  Vault status:{' '}
                  <strong>
                    {masterPassword ? '🔓 Unlocked (Decrypted)' : '🔒 Locked'}
                  </strong>
                </p>
                <p>
                  Remembered on this device:{' '}
                  <strong>
                    {isMasterPasswordSaved()
                      ? '✅ Yes (Auto-unlocks on reload)'
                      : '❌ No (Requires manual entry on reload)'}
                  </strong>
                </p>
              </div>

              <label className={styles.toggleRow}>
                Lock after inactivity
                <select
                  aria-label="Auto lock timeout"
                  value={settings.autoLockMinutes}
                  onChange={(e) =>
                    updateSettings({ autoLockMinutes: Number(e.target.value) })
                  }
                >
                  <option value={0}>Never (Don&apos;t auto-lock)</option>
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes (Default)</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={240}>4 hours</option>
                  <option value={1440}>24 hours</option>
                </select>
              </label>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  marginTop: '1.25rem',
                }}
              >
                <button
                  type="button"
                  className={styles.dangerBtn}
                  disabled={!masterPassword}
                  onClick={onLockVault}
                >
                  Lock vault now
                </button>
                {isMasterPasswordSaved() ? (
                  <button
                    type="button"
                    className={styles.dangerBtn}
                    onClick={() => {
                      clearStoredMasterPassword();
                      setAuthUpdateTick((t) => t + 1);
                    }}
                    title="Remove remembered master password from this browser"
                  >
                    Forget saved password
                  </button>
                ) : (
                  masterPassword && (
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={() => {
                        saveStoredMasterPassword(masterPassword);
                        setAuthUpdateTick((t) => t + 1);
                      }}
                    >
                      Remember password on this device
                    </button>
                  )
                )}
              </div>
            </>
          )}
          {active === 'Storage' && (
            <>
              <p>
                Browser storage estimate, including this origin’s cached files.
                Cloud quota is unavailable.
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (!navigator.storage?.estimate)
                      throw Error(
                        'Storage estimates are unavailable in this browser.',
                      );
                    setStorage(await navigator.storage.estimate());
                  } catch (e) {
                    setStorageError(e.message);
                  }
                }}
              >
                Check storage
              </button>
              <p role="status">
                {storage
                  ? `${((storage.usage || 0) / 1048576).toFixed(1)} MB used / ${((storage.quota || 0) / 1048576).toFixed(1)} MB quota`
                  : storageError}
              </p>
            </>
          )}
          {active === 'Connected Devices / Local Agent' && (
            <>
              <p>Firebase Realtime Database: {connection}</p>
              <p>
                Firestore connection is not inferred from the Realtime Database
                connection.
              </p>
              <p>
                Local Agent: {agentStatus}. Availability is measured by the
                terminal WebSocket.
              </p>
              {devices.map((d) => (
                <p key={d.id}>
                  {d.name} · Registered device ({d.status || 'status unknown'}{' '}
                  reported)
                </p>
              ))}
              {!devices.length && <p>No registered devices available.</p>}
            </>
          )}
          {active === 'About Elyx OS' && (
            <>
              <h3>Elyx OS 1.0</h3>
              <p>A personal cloud workspace built with React and Firebase.</p>
              <p>
                Desktop and mobile modes change the Elyx interface. Audio
                controls affect Elyx playback. Browser APIs cannot control
                system Wi-Fi, hardware volume, or device settings.
              </p>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={toggleOSMode}
              >
                Switch to classic dashboard
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export { SystemSettingsApp };
