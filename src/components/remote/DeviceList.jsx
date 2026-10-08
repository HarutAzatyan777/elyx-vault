import React, { useState } from 'react';
import DeviceCard from './DeviceCard.jsx';
import styles from './RemoteTerminal.module.css';

export function DeviceList({
  devices,
  securityEvents,
  selectedDeviceId,
  onSelectDevice,
  onConnectTerminal,
  onRegisterDevice,
  onRenameDevice,
  onRevokeDevice,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDevices = devices.filter(
    (d) =>
      !searchQuery ||
      d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tailscaleIp?.includes(searchQuery)
  );

  return (
    <div className={styles.deviceListContainer}>
      <div className={styles.topToolbar}>
        <div>
          <h2 className={styles.sectionTitle}>🖥️ My Devices & Tailscale Nodes</h2>
          <p className={styles.sectionSubtitle}>
            Manage enrolled Windows PCs running the Elyx Local Agent.
          </p>
        </div>

        <button
          type="button"
          className={styles.primaryBtn}
          onClick={onRegisterDevice}
        >
          + Register New Device
        </button>
      </div>

      {/* Search Input */}
      <div className={styles.searchBarRow}>
        <input
          type="text"
          placeholder="🔍 Search devices by name, hostname, or IP..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <span className={styles.deviceCountBadge}>
          {filteredDevices.length} Enrolled Node(s)
        </span>
      </div>

      {/* Devices Grid */}
      {filteredDevices.length === 0 ? (
        <div className={styles.emptyDevicesBox}>
          <div className={styles.emptyIcon}>💻</div>
          <h3 className={styles.emptyTitle}>No Registered Devices Found</h3>
          <p className={styles.emptySub}>
            Register your home Windows PC running the Elyx Agent to open interactive PowerShell sessions from anywhere over Tailscale.
          </p>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onRegisterDevice}
          >
            + Register Home PC
          </button>
        </div>
      ) : (
        <div className={styles.devicesGrid}>
          {filteredDevices.map((dev) => (
            <DeviceCard
              key={dev.id}
              device={dev}
              isSelected={selectedDeviceId === dev.id}
              onSelect={() => onSelectDevice(dev.id)}
              onConnectTerminal={onConnectTerminal}
              onRename={onRenameDevice}
              onRevoke={onRevokeDevice}
            />
          ))}
        </div>
      )}

      {/* Security Audit Events */}
      {securityEvents && securityEvents.length > 0 && (
        <div className={styles.auditEventsBox}>
          <h3 className={styles.auditTitle}>🛡️ Security Audit Log</h3>
          <div className={styles.eventsList}>
            {securityEvents.slice(0, 10).map((evt) => (
              <div key={evt.id} className={styles.eventRow}>
                <span className={styles.eventTypeTag}>{evt.type}</span>
                <span className={styles.eventText}>{evt.title}</span>
                <span className={styles.eventTime}>
                  {evt.createdAt?.toDate ? evt.createdAt.toDate().toLocaleTimeString() : 'Just now'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DeviceList;
