import React, { useEffect, useRef, useState } from 'react';
import { useRemoteTerminal } from '../../hooks/useRemoteTerminal.js';
import TerminalToolbar from './TerminalToolbar.jsx';
import styles from './RemoteTerminal.module.css';

// Default authorized working directories
const ALLOWED_PROJECT_DIRECTORIES = [
  { id: 'elyx-vault', name: 'Elyx Vault Project', path: 'D:\\VAHAG\\elyx-vault\\elyx-vault' },
  { id: 'malongo', name: 'Malongo Project', path: 'D:\\VAHAG\\malongo' },
  { id: 'tjvjik', name: 'Tjvjik Project', path: 'D:\\VAHAG\\tjvjik' },
];

export function RemoteTerminal({
  devices = [],
  selectedDevice = null,
  onSelectDevice,
  onOpenDeviceManager,
}) {
  const [workingDirectory, setWorkingDirectory] = useState(
    ALLOWED_PROJECT_DIRECTORIES[0].path
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const terminalContainerRef = useRef(null);

  const {
    connected,
    connecting,
    error,
    sessionDurationSec,
    connect,
    disconnect,
    sendInput,
    sendCtrlC,
    clearTerminal,
    attachTerminal,
  } = useRemoteTerminal(selectedDevice, workingDirectory);

  // Attach xterm.js instance to container ref on mount
  useEffect(() => {
    if (terminalContainerRef.current) {
      attachTerminal(terminalContainerRef.current);
    }
  }, [attachTerminal]);

  // Format session duration into HH:MM:SS
  const formatTimer = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs > 0 ? String(hrs).padStart(2, '0') + ':' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className={`${styles.terminalWrapper} ${isFullscreen ? styles.terminalFullscreen : ''}`}>
      {/* Top Header Bar */}
      <div className={styles.terminalHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.headerTitleGroup}>
            <span className={styles.terminalIcon}>⚡</span>
            <div>
              <h2 className={styles.headerTitle}>Remote PowerShell Terminal</h2>
              <span className={styles.headerSub}>
                {selectedDevice ? selectedDevice.name : 'No device selected'} ({selectedDevice?.tailscaleIp || '127.0.0.1'})
              </span>
            </div>
          </div>
        </div>

        {/* Header Controls */}
        <div className={styles.headerControls}>
          {/* Target Device Dropdown */}
          <select
            className={styles.deviceSelect}
            value={selectedDevice?.id || ''}
            onChange={(e) => onSelectDevice(e.target.value)}
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.status === 'online' ? '🟢 Online' : '🔴 Offline'})
              </option>
            ))}
          </select>

          {/* Working Directory Dropdown */}
          <select
            className={styles.directorySelect}
            value={workingDirectory}
            onChange={(e) => setWorkingDirectory(e.target.value)}
            disabled={connected}
          >
            {ALLOWED_PROJECT_DIRECTORIES.map((dir) => (
              <option key={dir.id} value={dir.path}>
                📁 {dir.name} ({dir.path})
              </option>
            ))}
          </select>

          {/* Connect / Disconnect Buttons */}
          {connected ? (
            <button
              type="button"
              className={styles.disconnectBtn}
              onClick={disconnect}
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              className={styles.connectBtnHeader}
              onClick={connect}
              disabled={connecting || !selectedDevice}
            >
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          )}

          <button
            type="button"
            className={styles.iconControlBtn}
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? '↙' : '↗'}
          </button>
        </div>
      </div>

      {/* Connection Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={`${styles.statusDot} ${connected ? styles.statusDotConnected : styles.statusDotDisconnected}`} />
          <span className={styles.statusText}>
            {connected ? 'CONNECTED TO PTY' : connecting ? 'CONNECTING...' : 'DISCONNECTED'}
          </span>
          {connected && (
            <span className={styles.sessionTimerPill}>
              ⏱️ {formatTimer(sessionDurationSec)}
            </span>
          )}
        </div>

        {error && (
          <div className={styles.statusErrorAlert}>
            ⚠️ {error}
          </div>
        )}

        <div className={styles.statusRight}>
          <button
            type="button"
            className={styles.linkBtn}
            onClick={onOpenDeviceManager}
          >
            Manage Devices ➔
          </button>
        </div>
      </div>

      {/* xterm.js Terminal Container */}
      <div className={styles.xtermContainer} ref={terminalContainerRef} />

      {/* Mobile & Accessory Keyboard Toolbar */}
      <TerminalToolbar
        onSendInput={sendInput}
        onSendCtrlC={sendCtrlC}
        onClear={clearTerminal}
      />
    </div>
  );
}

export default RemoteTerminal;
