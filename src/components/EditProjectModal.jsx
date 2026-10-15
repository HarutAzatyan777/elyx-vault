import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { decryptData, encryptData } from '../utils/crypto.js';
import { PROJECT_PRESETS } from '../constants/projectPresets.js';
import styles from './EditProjectModal.module.css';
import { useAuth } from '../hooks/useAuth.jsx';

/**
 * Modal to edit an existing encrypted project credentials and settings.
 *
 * @param {{
 *   project: object,
 *   masterPassword: string,
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSaved?: (updated: object) => void
 * }} props
 */
export const EditProjectModal = ({
  project,
  masterPassword,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loginUrl, setLoginUrl] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !project) return;
    setName(project.name || '');
    setLoginUrl(project.loginUrl || '');
    setError('');
    setSuccess(false);

    let initialEmail = project.email || project.username || '';
    let initialPass = '';

    if (masterPassword) {
      const ciphertext =
        project.encryptedCredentials || project.encryptedPassword || '';
      const decrypted = decryptData(ciphertext, masterPassword);
      if (decrypted) {
        try {
          const parsed = JSON.parse(decrypted);
          if (parsed && typeof parsed === 'object') {
            if (parsed.email || parsed.username) {
              initialEmail = parsed.email || parsed.username;
            }
            if (parsed.password || parsed.secret) {
              initialPass = parsed.password || parsed.secret;
            }
          } else {
            initialPass = decrypted;
          }
        } catch {
          initialPass = decrypted;
        }
      }
    }

    setEmail(initialEmail);
    setPassword(initialPass);
  }, [isOpen, project, masterPassword]);

  if (!isOpen || !project) return null;

  const handleApplyPreset = (preset) => {
    setLoginUrl(preset.url);
    if (!name.trim() || PROJECT_PRESETS.some((p) => p.name === name.trim())) {
      setName(preset.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }
    if (!masterPassword) {
      setError('Master password is required for encryption.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = JSON.stringify({
        email: email.trim(),
        username: email.trim(),
        password: password.trim(),
      });

      const encryptedCredentials = encryptData(payload, masterPassword);
      if (!encryptedCredentials) {
        setError('Encryption failed. Check master password.');
        setSubmitting(false);
        return;
      }

      const updateData = {
        name: name.trim(),
        email: email.trim(),
        username: email.trim(),
        loginUrl: loginUrl.trim(),
        encryptedCredentials,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid || 'unknown',
      };

      // Keep createdBy and businessId stable according to Firestore rules
      if (project.businessId) {
        updateData.businessId = project.businessId;
      }
      if (project.createdBy) {
        updateData.createdBy = project.createdBy;
      }

      await updateDoc(doc(db, 'projects', project.id), updateData);

      setSuccess(true);
      onSaved?.({ ...project, ...updateData });
      setTimeout(() => {
        onClose();
      }, 400);
    } catch (err) {
      console.error('[EditProject] Failed to update project:', err);
      setError('Failed to update project. Please verify permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Edit Project: {project.name}</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Quick URL / Service Preset Badges */}
        <div className={styles.presetSection}>
          <label className={styles.presetLabel}>Quick Presets / Templates</label>
          <div className={styles.presetList}>
            {PROJECT_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.presetPill}
                style={{
                  backgroundColor: p.bg,
                  borderColor: p.color,
                }}
                onClick={() => handleApplyPreset(p)}
                title={`Auto-fill ${p.name} login URL`}
              >
                <span>{p.icon}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Project Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Google Account"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email / Username</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., user@example.com"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Login URL</label>
            <input
              type="text"
              value={loginUrl}
              onChange={(e) => setLoginUrl(e.target.value)}
              placeholder="e.g., https://github.com/login"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password / Secret *</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Encrypted password"
                required
                className={styles.input}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '🔒'}
              </button>
            </div>
          </div>

          {error && <p className={styles.errorText}>{error}</p>}
          {success && <p className={styles.successText}>Project updated successfully!</p>}

          <div className={styles.buttonRow}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;
