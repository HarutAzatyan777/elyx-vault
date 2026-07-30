import React, { useState } from 'react';
import { decryptData } from '../utils/crypto.js';
import styles from './ProjectCard.module.css';

/**
 * Card component displaying project details with 1-click decrypt-and-copy functionality,
 * 1-click Isolated Auto-Login launcher, and project deletion.
 *
 * @param {{
 *   project: { id: string, name: string, loginUrl: string, username?: string, email?: string, encryptedCredentials?: string, encryptedPassword?: string },
 *   masterPassword: string,
 *   onDelete: (id: string) => void
 * }} props
 */
export const ProjectCard = ({ project, masterPassword, onDelete }) => {
  const [isCopied, setIsCopied] = useState(false);

  const getDecryptedPassword = () => {
    const ciphertext = project.encryptedCredentials || project.encryptedPassword || '';
    return decryptData(ciphertext, masterPassword);
  };

  const handleCopyPassword = async () => {
    const decrypted = getDecryptedPassword();

    if (!decrypted) {
      alert('Wrong master password');
      return;
    }

    try {
      await navigator.clipboard.writeText(decrypted);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error('[Clipboard Error] Failed to write to clipboard:', err);
      alert('Failed to copy password to clipboard.');
    }
  };

  const handleLaunchAutoLogin = () => {
    const decryptedPassword = getDecryptedPassword();

    if (!decryptedPassword) {
      alert('Wrong master password. Please verify master password to launch auto-login.');
      return;
    }

    // Account identifier / email
    const emailValue = project.username || project.email || project.loginUrl || project.name || '';

    // Force Google AddSession & prompt=select_account to bypass active session cookie overrides
    let targetUrl = 'https://accounts.google.com/v3/signin/identifier?prompt=select_account&flowName=GlifWebSignIn&flowEntry=AddSession';
    if (project.loginUrl && project.loginUrl.startsWith('http')) {
      targetUrl = project.loginUrl;
    }

    const credentials = {
      email: emailValue,
      password: decryptedPassword
    };

    // Encode security payload for URL hash fragment fallback
    const payload = JSON.stringify(credentials);
    const hashToken = btoa(encodeURIComponent(payload));
    const finalUrl = `${targetUrl}#elyx_autofill=${hashToken}`;

    // Request Chrome Extension background service worker to open tab & auto-fill credentials
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage(
          { action: 'AUTO_LOGIN', url: targetUrl, credentials },
          (res) => {
            if (chrome.runtime.lastError || !res || res.status !== 'success') {
              // Fallback to URL hash token popup window
              window.open(finalUrl, '_blank', 'width=600,height=750,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes');
            }
          }
        );
      } catch (e) {
        window.open(finalUrl, '_blank', 'width=600,height=750,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes');
      }
    } else {
      // Fallback popup window with URL hash token auto-fill
      window.open(finalUrl, '_blank', 'width=600,height=750,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes');
    }
  };

  const handleDeleteClick = () => {
    if (window.confirm('Are you sure you want to permanently delete this project?')) {
      onDelete(project.id);
    }
  };

  const formattedUrl = project.loginUrl
    ? project.loginUrl.startsWith('http')
      ? project.loginUrl
      : `https://${project.loginUrl}`
    : '#';

  return (
    <div className={styles.card}>
      <div className={styles.content}>
        <div className={styles.headerRow}>
          <h3 className={styles.title}>{project.name}</h3>
          <button
            onClick={handleDeleteClick}
            className={styles.deleteBtn}
            title="Delete Project"
            aria-label="Delete Project"
          >
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>

        {project.loginUrl ? (
          <a
            href={formattedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            {project.loginUrl}
          </a>
        ) : (
          <p className={styles.noLink}>No login URL specified</p>
        )}
      </div>

      <div className={styles.actions}>
        <button
          onClick={handleLaunchAutoLogin}
          className={styles.launchBtn}
          title="Launch site in isolated window and auto-login"
        >
          <svg className={styles.launchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Auto-Login
        </button>

        <button
          onClick={handleCopyPassword}
          className={`${styles.button} ${isCopied ? styles.copied : ''}`}
        >
          {isCopied ? 'Copied!' : 'Copy Password'}
        </button>
      </div>
    </div>
  );
};

export default ProjectCard;
