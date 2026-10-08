import React, { useState } from 'react';
import styles from './RemoteTerminal.module.css';

export function DeviceCard({
  device,
  isSelected,
  onSelect,
  onConnectTerminal,
  onRename,
  onRevoke,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(device.name || '');

  const handleSaveName = (e) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onRename(device.id, nameInput.trim());
      setIsEditing(false);
    }
  };

  const isOnline = device.status === 'online';

  return (
    <div
      className={`${styles.deviceCard} ${isSelected ? styles.deviceCardSelected : ''}`}
      onClick={onSelect}
    >
      <div className={styles.deviceHeader}>
        <div className={styles.deviceTitleArea}>
          <div className={styles.deviceIconWrapper}>
            {device.platform === 'win32' || device.platform === 'windows' ? '💻' : '🖥️'}
          </div>
          <div>
            {isEditing ? (
              <form onSubmit={handleSaveName} className={styles.renameForm} onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className={styles.renameInput}
                  autoFocus
                />
                <button type="submit" className={styles.renameSaveBtn}>Save</button>
              </form>
            ) : (
              <h3 className={styles.deviceName}>
                {device.name}{' '}
                <button
                  type="button"
                  className={styles.inlineEditBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  title="Rename device"
                >
                  ✏️
                </button>
              </h3>
            )}
            <span className={styles.deviceSub}>
              {device.hostname || 'Windows PC'} ({device.arch || 'x64'})
            </span>
          </div>
        </div>

        <span className={`${styles.statusBadge} ${isOnline ? styles.statusOnline : styles.statusOffline}`}>
          <span className={styles.statusDot} />
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      <div className={styles.deviceDetails}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Tailscale IP / Host:</span>
          <span className={styles.detailValue}>{device.tailscaleDomain || device.tailscaleIp || '127.0.0.1'}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Agent Port:</span>
          <span className={styles.detailValue}>{device.agentPort || 9090}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Enrollment Status:</span>
          <span className={styles.detailValue}>{device.enrollmentState || 'Approved'}</span>
        </div>
      </div>

      <div className={styles.deviceFooter} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.connectBtn}
          onClick={() => onConnectTerminal(device)}
        >
          <span>⚡ Open Remote Terminal</span>
        </button>

        <button
          type="button"
          className={styles.revokeBtn}
          onClick={() => onRevoke(device.id, device.name)}
          title="Revoke Device Access"
        >
          Revoke
        </button>
      </div>
    </div>
  );
}

export default DeviceCard;
