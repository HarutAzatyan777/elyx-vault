import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { encryptData } from '../utils/crypto.js';
import styles from './AddProject.module.css';

/**
 * Admin form component to encrypt project password and save project details to Firestore.
 *
 * @param {{ masterPassword: string }} props
 */
export const AddProject = ({ masterPassword }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loginUrl, setLoginUrl] = useState('');
  const [secretData, setSecretData] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !secretData.trim()) {
      setMessage({ text: 'Please fill out all required fields.', isError: true });
      return;
    }

    if (!masterPassword) {
      setMessage({ text: 'Master password is required for encryption.', isError: true });
      return;
    }

    setSubmitting(true);
    setMessage({ text: '', isError: false });

    try {
      const payload = JSON.stringify({
        email: email.trim(),
        username: email.trim(),
        password: secretData.trim(),
      });

      const encryptedCredentials = encryptData(payload, masterPassword);

      if (!encryptedCredentials) {
        setMessage({ text: 'Encryption failed. Please check master password.', isError: true });
        setSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'projects'), {
        name: name.trim(),
        email: email.trim(),
        username: email.trim(),
        loginUrl: loginUrl.trim(),
        encryptedCredentials,
        createdAt: new Date().toISOString(),
      });

      setName('');
      setEmail('');
      setLoginUrl('');
      setSecretData('');
      setMessage({ text: 'Project encrypted and added successfully!', isError: false });
    } catch (error) {
      console.error('[Firestore Error] Failed to add project:', error);
      setMessage({ text: 'Failed to add project. Please try again.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h3 className={styles.title}>Add New Encrypted Project</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label className={styles.label}>Project Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., GitHub Account"
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
            <input
              type="password"
              value={secretData}
              onChange={(e) => setSecretData(e.target.value)}
              placeholder="Secret password to encrypt"
              required
              className={styles.input}
            />
          </div>
        </div>

        <button type="submit" disabled={submitting} className={styles.submitBtn}>
          {submitting ? 'Encrypting & Saving...' : 'Encrypt & Save Project'}
        </button>

        {message.text && (
          <p className={message.isError ? styles.messageError : styles.messageSuccess}>
            {message.text}
          </p>
        )}
      </form>
    </div>
  );
};

export default AddProject;
