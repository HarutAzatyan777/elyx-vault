import React, { useState } from 'react';
import styles from './MasterPassModal.module.css';

/**
 * Modal dialog prompting the user for their master password to decrypt vault contents.
 *
 * @param {{ onSubmit: (password: string) => void }} props
 */
export const MasterPassModal = ({ onSubmit }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your master password.');
      return;
    }
    setError('');
    onSubmit(password);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <svg
            className={styles.lockIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h2 className={styles.title}>Unlock Vault</h2>
          <p className={styles.subtitle}>
            Enter your master password to decrypt your zero-knowledge vault.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>
              Master Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter master password"
              autoFocus
              className={styles.input}
            />
            {error && <p className={styles.errorText}>{error}</p>}
          </div>

          <button type="submit" className={styles.button}>
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default MasterPassModal;
