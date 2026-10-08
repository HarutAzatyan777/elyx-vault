import React, { useState, useRef } from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth.jsx';
import { encryptData, decryptData } from '../../utils/crypto';
import styles from './MinecraftVault.module.css';

/**
 * Parses raw .env string into key-value object array
 */
const parseEnvString = (rawText) => {
  if (!rawText) return [];
  const lines = rawText.split(/\r?\n/);
  const parsed = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIdx = trimmed.indexOf('=');
    if (equalsIdx > 0) {
      const key = trimmed.substring(0, equalsIdx).trim();
      let value = trimmed.substring(equalsIdx + 1).trim();
      
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      parsed.push({ key, value });
    }
  }

  return parsed;
};

export const EnvManager = ({ items, masterPassword, onRefresh }) => {
  const { user, access } = useAuth();
  const [envName, setEnvName] = useState('');
  const [envText, setEnvText] = useState('');
  const [parsedPreview, setParsedPreview] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });
  const [copiedKey, setCopiedKey] = useState(null);
  const [showMasked, setShowMasked] = useState({});
  const fileInputRef = useRef(null);

  const handleTextChange = (text) => {
    setEnvText(text);
    const parsed = parseEnvString(text);
    setParsedPreview(parsed);
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    if (!envName) {
      setEnvName(file.name.replace(/\.env$/i, '') || file.name);
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      handleTextChange(content);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSaveEnv = async (e) => {
    e.preventDefault();
    if (!envName.trim() || !envText.trim()) {
      setMessage({ text: 'Please provide an ENV name and content.', isError: true });
      return;
    }

    if (!masterPassword) {
      setMessage({ text: 'Master password required to encrypt .env', isError: true });
      return;
    }

    if (!access?.businessId || !user?.uid) {
      setMessage({ text: 'User access missing. Please sign in again.', isError: true });
      return;
    }

    setSubmitting(true);
    setMessage({ text: '', isError: false });

    try {
      const encryptedEnv = encryptData(envText.trim(), masterPassword);

      if (!encryptedEnv) {
        setMessage({ text: 'Encryption failed. Check master password.', isError: true });
        setSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'minecraft_vault'), {
        businessId: access.businessId,
        createdBy: user.uid,
        type: 'env',
        name: envName.trim(),
        encryptedEnv,
        keyCount: parsedPreview.length,
        createdAt: new Date().toISOString(),
      });

      setEnvName('');
      setEnvText('');
      setParsedPreview([]);
      setMessage({ text: '⚡ .env encrypted & saved to Minecraft Vault!', isError: false });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('[Firestore Error] Save .env failed:', err);
      setMessage({ text: 'Failed to save .env file.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this .env vault item?')) return;
    try {
      await deleteDoc(doc(db, 'minecraft_vault', id));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('[Firestore Error] Delete .env failed:', err);
      alert('Failed to delete .env');
    }
  };

  const handleDownload = (item) => {
    const raw = decryptData(item.encryptedEnv, masterPassword);
    if (!raw) {
      alert('Decryption failed. Check master password.');
      return;
    }

    const blob = new Blob([raw], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.name.toLowerCase().endsWith('.env') ? item.name : `${item.name}.env`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyFull = async (item) => {
    const raw = decryptData(item.encryptedEnv, masterPassword);
    if (!raw) {
      alert('Decryption failed. Check master password.');
      return;
    }

    try {
      await navigator.clipboard.writeText(raw);
      setCopiedKey(`full-${item.id}`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (e) {
      alert('Failed to copy to clipboard.');
    }
  };

  const handleCopyValue = async (val, idKey) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedKey(idKey);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (e) {
      alert('Failed to copy');
    }
  };

  const toggleMask = (keyId) => {
    setShowMasked((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const envItems = items.filter((item) => item.type === 'env');

  return (
    <div className={styles.envContainer}>
      {/* Upload & Import Form */}
      <div className={styles.cardBox}>
        <h3 className={styles.cardHeader}>
          <span className={styles.headerIcon}>📥</span> Import & Encrypt Minecraft .env File
        </h3>
        <p className={styles.cardDesc}>
          Drag & drop a <code>.env</code> file (like <code>server.env</code>, <code>paper.env</code>, <code>rcon.env</code>), or paste raw text below.
        </p>

        <form onSubmit={handleSaveEnv} className={styles.formStack}>
          <div className={styles.field}>
            <label className={styles.label}>Config / .env Name *</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g., PaperMC Production .env"
              value={envName}
              onChange={(e) => setEnvName(e.target.value)}
              required
            />
          </div>

          {/* Drag & Drop Zone */}
          <div
            className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".env,.txt,.properties,.conf"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            <div className={styles.dropZoneIcon}>📁</div>
            <p className={styles.dropZoneText}>
              Drag & Drop your <strong>.env</strong> file here, or <span className={styles.browseText}>click to browse</span>
            </p>
            <span className={styles.dropZoneSubtext}>Supports .env, .properties, .conf, .txt files</span>
          </div>

          {/* Textarea for Manual Raw .env Input */}
          <div className={styles.field}>
            <label className={styles.label}>Or Paste .env Content</label>
            <textarea
              className={styles.textarea}
              rows={6}
              placeholder={`# Example Minecraft .env\nSERVER_NAME=Survival-MC\nRCON_PORT=25575\nRCON_PASSWORD=SuperSecretPass123\nMYSQL_HOST=127.0.0.1\nMYSQL_PASSWORD=db_secret_key`}
              value={envText}
              onChange={(e) => handleTextChange(e.target.value)}
            />
          </div>

          {/* Parsed Key-Value Preview */}
          {parsedPreview.length > 0 && (
            <div className={styles.previewBox}>
              <div className={styles.previewHeader}>
                <span className={styles.previewTitle}>
                  Parsed Keys Detected ({parsedPreview.length})
                </span>
              </div>
              <div className={styles.previewTableWrapper}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>KEY</th>
                      <th>VALUE (Encrypted on save)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedPreview.map((item, idx) => (
                      <tr key={idx}>
                        <td className={styles.keyCol}>{item.key}</td>
                        <td className={styles.valCol}>
                          <code>{item.value}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting} className={styles.primaryBtn}>
            {submitting ? 'Encrypting & Saving .env...' : '🔐 Encrypt & Save .env to Vault'}
          </button>

          {message.text && (
            <p className={message.isError ? styles.messageError : styles.messageSuccess}>
              {message.text}
            </p>
          )}
        </form>
      </div>

      {/* Saved .env Files List */}
      <div className={styles.savedSection}>
        <h3 className={styles.sectionTitle}>
          Saved Minecraft .env Vault ({envItems.length})
        </h3>

        {envItems.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No .env files saved in vault yet. Import or drop one above!</p>
          </div>
        ) : (
          <div className={styles.savedGrid}>
            {envItems.map((item) => {
              const rawEnv = decryptData(item.encryptedEnv, masterPassword);
              const parsed = rawEnv ? parseEnvString(rawEnv) : [];

              return (
                <div key={item.id} className={styles.savedCard}>
                  <div className={styles.cardTop}>
                    <div>
                      <h4 className={styles.cardTitle}>📄 {item.name}</h4>
                      <p className={styles.cardMeta}>
                        {parsed.length} Variables • Saved {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className={styles.deleteBtn}
                      title="Delete .env"
                    >
                      🗑️
                    </button>
                  </div>

                  {!rawEnv ? (
                    <div className={styles.errorLock}>
                      🔒 Locked — Master Password Required to Decrypt
                    </div>
                  ) : (
                    <>
                      {/* Action buttons */}
                      <div className={styles.cardActions}>
                        <button
                          onClick={() => handleCopyFull(item)}
                          className={styles.actionBtn}
                        >
                          {copiedKey === `full-${item.id}` ? '✓ Copied All!' : '📋 Copy Full .env'}
                        </button>
                        <button
                          onClick={() => handleDownload(item)}
                          className={styles.actionBtnSecondary}
                        >
                          ⬇️ Export / Download .env
                        </button>
                      </div>

                      {/* Decrypted Variables View */}
                      <div className={styles.varList}>
                        {parsed.map((pair, pIdx) => {
                          const idKey = `${item.id}-${pair.key}`;
                          const isUnmasked = showMasked[idKey];
                          return (
                            <div key={pIdx} className={styles.varRow}>
                              <span className={styles.varKey}>{pair.key}</span>
                              <div className={styles.varValBox}>
                                <code className={styles.varVal}>
                                  {isUnmasked ? pair.value : '••••••••••••'}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => toggleMask(idKey)}
                                  className={styles.iconBtn}
                                  title={isUnmasked ? 'Hide' : 'Show'}
                                >
                                  {isUnmasked ? '👁️‍🗨️' : '👁️'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyValue(pair.value, idKey)}
                                  className={styles.iconBtn}
                                  title="Copy Value"
                                >
                                  {copiedKey === idKey ? '✓' : '📋'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
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

export default EnvManager;
