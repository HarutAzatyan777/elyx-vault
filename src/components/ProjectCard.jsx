import { getDocFromServer, doc } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { isActiveAccess } from '../utils/access.js';
import React, { useState, useRef, useEffect } from 'react';
import { decryptData } from '../utils/crypto.js';
import styles from './ProjectCard.module.css';

/**
 * Card component displaying project details with 1-click decrypt-and-copy functionality,
 * origin-bound Auto-Login launcher, and project deletion.
 *
 * @param {{
 *   project: { id: string, name: string, loginUrl: string, username?: string, email?: string, encryptedCredentials?: string, encryptedPassword?: string },
 *   masterPassword: string,
 *   onDelete: (id: string) => void
 * }} props
 */
export const ProjectCard = ({ project, masterPassword, onDelete }) => {
  const { user, access } = useAuth();
  const allowed = Boolean(
    user &&
      isActiveAccess(access) &&
      project.businessId === access.businessId &&
      masterPassword,
  );
  const currentPermission = useRef({ allowed, masterPassword });
  currentPermission.current = { allowed, masterPassword };
  useEffect(() => {
    const invalidate = () => {
      currentPermission.current = { allowed: false, masterPassword: null };
    };
    window.addEventListener('elyx:vault-locked', invalidate);
    return () => {
      window.removeEventListener('elyx:vault-locked', invalidate);
      invalidate();
    };
  }, []);
  const authorizeAction = async () => {
    if (!allowed) return false;
    try {
      const snapshot = await getDocFromServer(doc(db, 'userAccess', user.uid));
      const latest = snapshot.exists() ? snapshot.data() : null;
      return (
        currentPermission.current.allowed &&
        currentPermission.current.masterPassword === masterPassword &&
        auth.currentUser?.uid === user.uid &&
        isActiveAccess(latest) &&
        latest.businessId === project.businessId
      );
    } catch {
      alert('Access could not be verified. Reconnect and try again.');
      return false;
    }
  };
  const [isCopied, setIsCopied] = useState(false);

  const getDecryptedData = () => {
    if (!allowed) return { email: '', password: '' };
    const ciphertext =
      project.encryptedCredentials || project.encryptedPassword || '';
    const decrypted = decryptData(ciphertext, masterPassword);

    if (!decrypted) return { email: '', password: '' };

    let email = project.email || project.username || '';
    let password = decrypted;

    try {
      const parsed = JSON.parse(decrypted);
      if (parsed && typeof parsed === 'object') {
        if (parsed.email || parsed.username)
          email = parsed.email || parsed.username;
        if (parsed.password || parsed.secret)
          password = parsed.password || parsed.secret;
      }
    } catch (e) {
      // Plain text password
    }

    if (!email && project.loginUrl) {
      const match = project.loginUrl.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
      );
      if (match) email = match[0];
    }

    if (!email && project.name && project.name.includes('@')) {
      email = project.name.trim();
    }

    return { email, password };
  };

  const handleCopyPassword = async () => {
    if (!(await authorizeAction())) return;
    const { password } = getDecryptedData();

    if (!password) {
      alert('Wrong master password');
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error('[Clipboard Error] Failed to write to clipboard:', err);
      alert('Failed to copy password to clipboard.');
    }
  };

  const handleLaunchAutoLogin = async () => {
    if (!(await authorizeAction())) return;
    const { email, password } = getDecryptedData();

    if (!password) {
      alert(
        'Wrong master password. Please verify master password to launch auto-login.',
      );
      return;
    }

    // Account identifier / email
    const emailValue = email || project.email || project.username || '';

    let targetUrl;
    try {
      const url = new URL(project.loginUrl);
      if (url.protocol !== 'https:' || url.username || url.password)
        throw Error('Insecure URL');
      targetUrl = url.href;
    } catch {
      alert('Auto-login requires an explicit HTTPS login URL.');
      return;
    }

    // Append login_hint for Google URLs to pre-fill email instantly natively
    if (emailValue && new URL(targetUrl).hostname === 'accounts.google.com') {
      try {
        const u = new URL(targetUrl);
        if (!u.searchParams.has('login_hint')) {
          u.searchParams.set('login_hint', emailValue);
        }
        if (!u.searchParams.has('Email')) {
          u.searchParams.set('Email', emailValue);
        }
        targetUrl = u.toString();
      } catch (e) {}
    }

    const credentials = {
      email: emailValue,
      username: emailValue,
      password: password,
    };

    // The extension bridge uses exact trusted origins and origin-bound session credentials.
    // Never transport plaintext in a URL, fragment, or target-page storage.
    const requestId = crypto.randomUUID();
    const receive = (event) => {
      if (event.detail?.requestId !== requestId) return;
      clearTimeout(timeout);
      window.removeEventListener('ELYX_LOGIN_RESULT', receive);
      if (event.detail.status !== 'success')
        alert(
          'Auto-login requires the trusted Elyx extension. No credentials were placed in the URL.',
        );
    };
    const timeout = setTimeout(() => {
      window.removeEventListener('ELYX_LOGIN_RESULT', receive);
      alert(
        'The Elyx extension did not respond. Use Copy Password or install the extension.',
      );
    }, 3000);
    window.addEventListener('ELYX_LOGIN_RESULT', receive);
    window.dispatchEvent(
      new CustomEvent('ELYX_LAUNCH_LOGIN', {
        detail: { requestId, url: targetUrl, credentials },
      }),
    );
  };

  const handleDeleteClick = () => {
    if (!allowed || access.role === 'viewer') return;
    if (
      window.confirm(
        'Are you sure you want to permanently delete this project?',
      )
    ) {
      onDelete(project.id);
    }
  };

  const formattedUrl = project.loginUrl
    ? project.loginUrl.startsWith('http')
      ? project.loginUrl
      : `https://${project.loginUrl}`
    : '#';

  const { email: decryptedEmail } = getDecryptedData();
  const displayEmail =
    project.email || project.username || decryptedEmail || '';

  return (
    <div className={styles.card}>
      <div className={styles.content}>
        <div className={styles.headerRow}>
          <h3 className={styles.title}>{project.name}</h3>
          <button
            disabled={!allowed || access?.role === 'viewer'}
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

        {displayEmail && (
          <p className={styles.emailText} title={displayEmail}>
            {displayEmail}
          </p>
        )}

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
          disabled={!allowed}
          onClick={handleLaunchAutoLogin}
          className={styles.launchBtn}
          title="Open the configured HTTPS site and autofill with the Elyx extension"
        >
          <svg
            className={styles.launchIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Auto-Login
        </button>

        <button
          disabled={!allowed}
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
