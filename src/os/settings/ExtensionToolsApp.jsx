import React, { useState } from 'react';
import styles from './SystemSettingsApp.module.css';

export function ExtensionToolsApp() {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText('chrome://extensions/');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.settingsRoot} style={{ padding: '24px' }}>
      <div className={styles.section} style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h2 className={styles.sectionHeading}>Elyx Chrome Extension Tools</h2>
        <p className={styles.sectionDesc}>
          Auto-fill credentials, sync passwords, and bridge Zero-Knowledge cryptography directly to your browser tabs.
        </p>

        <div className={styles.statusBox}>
          <div className={styles.statusRow}>
            <span>Extension Bridge:</span>
            <span className={styles.unlockedText}>Ready for Chrome / Edge / Brave</span>
          </div>
          <div className={styles.statusRow}>
            <span>Installation Mode:</span>
            <span className={styles.cipherText}>Developer Unpacked (Local Manifest v3)</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          <div className={styles.specCard}>
            <span style={{ color: '#818cf8', fontWeight: 700 }}>Step 1: Download & Extract</span>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Ensure <code>extension.zip</code> is unzipped into a dedicated folder on your computer.
            </p>
          </div>

          <div className={styles.specCard}>
            <span style={{ color: '#818cf8', fontWeight: 700 }}>Step 2: Enable Developer Mode</span>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Visit <code>chrome://extensions/</code> in your browser and toggle "Developer mode" on.
            </p>
            <button
              type="button"
              className={styles.classicBtn}
              style={{ marginTop: '8px', alignSelf: 'flex-start' }}
              onClick={handleCopyLink}
            >
              {copied ? '✓ Link Copied!' : 'Copy chrome://extensions/ URL'}
            </button>
          </div>

          <div className={styles.specCard}>
            <span style={{ color: '#818cf8', fontWeight: 700 }}>Step 3: Load Unpacked</span>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Click "Load unpacked" and select the unzipped extension directory.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExtensionToolsApp;
