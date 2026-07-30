import React, { useState } from 'react';
import styles from './InstallGuideModal.module.css';

/**
 * Modal guide explaining step-by-step instructions to install the Chrome extension.
 *
 * @param {{ isOpen: boolean, onClose: () => void, onRedownload: () => void }} props
 */
export const InstallGuideModal = ({ isOpen, onClose, onRedownload }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText('chrome://extensions/');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <svg className={styles.chromeIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className={styles.title}>Install Elyx Vault to Chrome</h2>
          </div>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close modal">
            &times;
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          <div className={styles.downloadNotice}>
            <svg className={styles.downloadNoticeIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span><code>extension.zip</code> file download initiated! Follow 2 simple steps:</span>
          </div>

          <div className={styles.stepsContainer}>
            {/* Step 1 */}
            <div className={styles.stepItem}>
              <div className={styles.stepBadge}>1</div>
              <div className={styles.stepContent}>
                <h4 className={styles.stepTitle}>Extract the Zip Archive</h4>
                <p className={styles.stepDesc}>
                  Unzip the downloaded <code>extension.zip</code> file to a folder on your computer.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className={styles.stepItem}>
              <div className={styles.stepBadge}>2</div>
              <div className={styles.stepContent}>
                <h4 className={styles.stepTitle}>Load Unpacked in Chrome</h4>
                <p className={styles.stepDesc}>
                  Open Chrome extensions page, enable <strong>Developer mode</strong> (top-right toggle), and click <strong>Load unpacked</strong> to select the unzipped folder.
                </p>
                <div className={styles.codeBox}>
                  <span>chrome://extensions/</span>
                  <button onClick={handleCopyLink} className={styles.copyBtn}>
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button onClick={onRedownload} className={styles.redownloadBtn}>
            Re-download extension.zip
          </button>
          <button onClick={onClose} className={styles.doneBtn}>
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallGuideModal;
