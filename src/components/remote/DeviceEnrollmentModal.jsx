import React, { useState } from 'react';
import styles from './RemoteTerminal.module.css';

export function DeviceEnrollmentModal({ isOpen, onClose, onRegister }) {
  const [name, setName] = useState('Home PC - Windows');
  const [platform, setPlatform] = useState('win32');
  const [tailscaleIp, setTailscaleIp] = useState('127.0.0.1');
  const [tailscaleDomain, setTailscaleDomain] = useState('');
  const [agentPort, setAgentPort] = useState(9090);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onRegister({
        name: name.trim(),
        platform,
        tailscaleIp: tailscaleIp.trim() || '127.0.0.1',
        tailscaleDomain: tailscaleDomain.trim(),
        agentPort: parseInt(agentPort, 10) || 9090,
      });
      onClose();
    } catch (err) {
      console.error('Enrollment error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>⚡ Enroll New Windows PC</h2>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Device Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home PC - Windows 11"
              required
              className={styles.formInput}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tailscale IP / Local Address *</label>
              <input
                type="text"
                value={tailscaleIp}
                onChange={(e) => setTailscaleIp(e.target.value)}
                placeholder="100.x.y.z or 127.0.0.1"
                required
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Agent Port</label>
              <input
                type="number"
                value={agentPort}
                onChange={(e) => setAgentPort(e.target.value)}
                placeholder="9090"
                className={styles.formInput}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tailscale MagicDNS Domain (Optional)</label>
            <input
              type="text"
              value={tailscaleDomain}
              onChange={(e) => setTailscaleDomain(e.target.value)}
              placeholder="my-pc.tailnet.ts.net"
              className={styles.formInput}
            />
          </div>

          <div className={styles.agentInstructionBox}>
            <h4>📋 Quick Agent Setup Instructions:</h4>
            <ol>
              <li>Open PowerShell on your Windows PC.</li>
              <li>Navigate to <code>D:\VAHAG\elyx-vault\elyx-vault\agent</code></li>
              <li>Run: <code>npm install && npm start</code></li>
            </ol>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={submitting}>
              {submitting ? 'Enrolling...' : 'Approve & Register Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DeviceEnrollmentModal;
