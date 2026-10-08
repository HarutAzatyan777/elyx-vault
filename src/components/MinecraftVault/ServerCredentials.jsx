import React, { useState } from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth.jsx';
import { encryptData, decryptData } from '../../utils/crypto';
import styles from './MinecraftVault.module.css';

export const ServerCredentials = ({ items, masterPassword, onRefresh }) => {
  const { user, access } = useAuth();
  const [serverName, setServerName] = useState('');
  const [serverHost, setServerHost] = useState('');
  const [rconPort, setRconPort] = useState('25575');
  const [rconPassword, setRconPassword] = useState('');
  const [sshUser, setSshUser] = useState('root');
  const [sshPassword, setSshPassword] = useState('');
  const [dbName, setDbName] = useState('minecraft');
  const [dbPassword, setDbPassword] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });
  const [copiedField, setCopiedField] = useState(null);
  const [unmaskedFields, setUnmaskedFields] = useState({});

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    if (!serverName.trim() || !rconPassword.trim()) {
      setMessage({ text: 'Server Name and RCON / Admin password are required.', isError: true });
      return;
    }

    if (!masterPassword) {
      setMessage({ text: 'Master password required for encryption.', isError: true });
      return;
    }

    if (!access?.businessId || !user?.uid) {
      setMessage({ text: 'User access missing. Please sign in again.', isError: true });
      return;
    }

    setSubmitting(true);
    setMessage({ text: '', isError: false });

    try {
      const payload = JSON.stringify({
        serverHost: serverHost.trim(),
        rconPort: rconPort.trim(),
        rconPassword: rconPassword.trim(),
        sshUser: sshUser.trim(),
        sshPassword: sshPassword.trim(),
        dbName: dbName.trim(),
        dbPassword: dbPassword.trim(),
        notes: notes.trim(),
      });

      const encryptedData = encryptData(payload, masterPassword);

      await addDoc(collection(db, 'minecraft_vault'), {
        businessId: access.businessId,
        createdBy: user.uid,
        type: 'credential',
        name: serverName.trim(),
        encryptedData,
        createdAt: new Date().toISOString(),
      });

      setServerName('');
      setServerHost('');
      setRconPort('25575');
      setRconPassword('');
      setSshPassword('');
      setDbPassword('');
      setNotes('');
      setMessage({ text: '⚡ Minecraft server credentials encrypted & saved!', isError: false });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('[Firestore Error] Save server credentials failed:', err);
      setMessage({ text: 'Failed to save server credentials.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete these Minecraft server credentials?')) return;
    try {
      await deleteDoc(doc(db, 'minecraft_vault', id));
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to delete credentials');
    }
  };

  const handleCopy = async (val, fieldKey) => {
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (e) {
      alert('Failed to copy');
    }
  };

  const toggleUnmask = (fieldKey) => {
    setUnmaskedFields((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const credItems = items.filter((it) => it.type === 'credential');

  return (
    <div className={styles.credContainer}>
      {/* Save Server Credentials Form */}
      <div className={styles.cardBox}>
        <h3 className={styles.cardHeader}>
          <span className={styles.headerIcon}>🔐</span> Add Minecraft Server Passwords & Keys
        </h3>

        <form onSubmit={handleSaveCredentials} className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Server Name *</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g., Survival Main Server"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Server IP / Domain & Port</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g., play.myserver.com:25565"
              value={serverHost}
              onChange={(e) => setServerHost(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>RCON Port</label>
            <input
              type="text"
              className={styles.input}
              placeholder="25575"
              value={rconPort}
              onChange={(e) => setRconPort(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>RCON Password *</label>
            <input
              type="password"
              className={styles.input}
              placeholder="RCON admin secret"
              value={rconPassword}
              onChange={(e) => setRconPassword(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>SSH / SFTP Username</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g., root or mcuser"
              value={sshUser}
              onChange={(e) => setSshUser(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>SSH / SFTP Password</label>
            <input
              type="password"
              className={styles.input}
              placeholder="SSH / FTP secret password"
              value={sshPassword}
              onChange={(e) => setSshPassword(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Database Name (MySQL/PostgreSQL)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g., minecraft_luckperms"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Database Password</label>
            <input
              type="password"
              className={styles.input}
              placeholder="DB Secret Key"
              value={dbPassword}
              onChange={(e) => setDbPassword(e.target.value)}
            />
          </div>

          <div className={styles.fieldFull}>
            <label className={styles.label}>Additional Server Notes</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g., Server hosted on Pterodactyl, backup run at 04:00 UTC"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" disabled={submitting} className={styles.primaryBtn}>
            {submitting ? 'Encrypting & Saving...' : '🔐 Save Server Credentials'}
          </button>

          {message.text && (
            <p className={message.isError ? styles.messageError : styles.messageSuccess}>
              {message.text}
            </p>
          )}
        </form>
      </div>

      {/* List of Saved Credentials */}
      <div className={styles.savedSection}>
        <h3 className={styles.sectionTitle}>
          Saved Server Credentials ({credItems.length})
        </h3>

        {credItems.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No server credentials saved yet. Add your server keys above!</p>
          </div>
        ) : (
          <div className={styles.savedGrid}>
            {credItems.map((item) => {
              const decryptedRaw = decryptData(item.encryptedData, masterPassword);
              let creds = {};
              if (decryptedRaw) {
                try {
                  creds = JSON.parse(decryptedRaw);
                } catch (e) {}
              }

              return (
                <div key={item.id} className={styles.savedCard}>
                  <div className={styles.cardTop}>
                    <div>
                      <h4 className={styles.cardTitle}>🖥️ {item.name}</h4>
                      {creds.serverHost && (
                        <p className={styles.cardMeta}>IP: <code>{creds.serverHost}</code></p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className={styles.deleteBtn}
                      title="Delete Credentials"
                    >
                      🗑️
                    </button>
                  </div>

                  {!decryptedRaw ? (
                    <div className={styles.errorLock}>
                      🔒 Locked — Master Password Required to Decrypt
                    </div>
                  ) : (
                    <div className={styles.credList}>
                      {/* RCON Pass */}
                      {creds.rconPassword && (
                        <div className={styles.credRow}>
                          <span className={styles.credTag}>RCON Pass ({creds.rconPort || '25575'})</span>
                          <div className={styles.varValBox}>
                            <code className={styles.varVal}>
                              {unmaskedFields[`rcon-${item.id}`] ? creds.rconPassword : '••••••••••••'}
                            </code>
                            <button
                              type="button"
                              onClick={() => toggleUnmask(`rcon-${item.id}`)}
                              className={styles.iconBtn}
                            >
                              {unmaskedFields[`rcon-${item.id}`] ? '👁️‍🗨️' : '👁️'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(creds.rconPassword, `rcon-${item.id}`)}
                              className={styles.iconBtn}
                            >
                              {copiedField === `rcon-${item.id}` ? '✓' : '📋'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* SSH Pass */}
                      {creds.sshPassword && (
                        <div className={styles.credRow}>
                          <span className={styles.credTag}>SSH ({creds.sshUser || 'root'})</span>
                          <div className={styles.varValBox}>
                            <code className={styles.varVal}>
                              {unmaskedFields[`ssh-${item.id}`] ? creds.sshPassword : '••••••••••••'}
                            </code>
                            <button
                              type="button"
                              onClick={() => toggleUnmask(`ssh-${item.id}`)}
                              className={styles.iconBtn}
                            >
                              {unmaskedFields[`ssh-${item.id}`] ? '👁️‍🗨️' : '👁️'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(creds.sshPassword, `ssh-${item.id}`)}
                              className={styles.iconBtn}
                            >
                              {copiedField === `ssh-${item.id}` ? '✓' : '📋'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* DB Pass */}
                      {creds.dbPassword && (
                        <div className={styles.credRow}>
                          <span className={styles.credTag}>Database ({creds.dbName || 'db'})</span>
                          <div className={styles.varValBox}>
                            <code className={styles.varVal}>
                              {unmaskedFields[`db-${item.id}`] ? creds.dbPassword : '••••••••••••'}
                            </code>
                            <button
                              type="button"
                              onClick={() => toggleUnmask(`db-${item.id}`)}
                              className={styles.iconBtn}
                            >
                              {unmaskedFields[`db-${item.id}`] ? '👁️‍🗨️' : '👁️'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(creds.dbPassword, `db-${item.id}`)}
                              className={styles.iconBtn}
                            >
                              {copiedField === `db-${item.id}` ? '✓' : '📋'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {creds.notes && (
                        <div className={styles.notesBox}>
                          📝 {creds.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerCredentials;
