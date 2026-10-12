import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  formatBytes,
  formatDuration,
  downloadMediaFile,
  parseYouTubeVideoId,
} from '../../services/mediaService';
import { decryptData } from '../../utils/crypto';
import styles from './MediaViewerModal.module.css';

export const MediaViewerModal = ({
  item,
  items = [],
  isOpen,
  onClose,
  onSelectPrev,
  onSelectNext,
  onToggleFavorite,
  onDelete,
  masterPassword,
  onUnlockVault,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [localPassInput, setLocalPassInput] = useState('');

  const videoRef = useRef(null);

  // Decrypt URL if item is encrypted
  const decryptedUrl = useMemo(() => {
    if (!item) return '';
    if (!item.isEncrypted) return item.url;
    if (!masterPassword) return null; // Locked
    const decrypted = decryptData(item.url, masterPassword);
    return decrypted || item.url;
  }, [item, masterPassword]);

  const isLocked = item?.isEncrypted && !masterPassword;

  // Keyboard navigation (Escape to close, Left/Right arrows)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && onSelectPrev) {
        onSelectPrev();
      } else if (e.key === 'ArrowRight' && onSelectNext) {
        onSelectNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSelectPrev, onSelectNext, onClose]);

  // Reset zoom on item change
  useEffect(() => {
    setZoomLevel(1);
  }, [item?.id]);

  if (!isOpen || !item) return null;

  const ytId = item.youtubeId || parseYouTubeVideoId(decryptedUrl || item.url);

  const handleCopyLink = async () => {
    try {
      if (decryptedUrl) {
        await navigator.clipboard.writeText(decryptedUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (err) {
      console.warn('Copy link failed', err);
    }
  };

  const handleZoom = (delta) => {
    setZoomLevel((prev) => Math.min(3, Math.max(0.5, +(prev + delta).toFixed(1))));
  };

  const handlePlaybackRateChange = (speed) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleUnlockSubmit = (e) => {
    e.preventDefault();
    if (localPassInput && onUnlockVault) {
      onUnlockVault(localPassInput);
      setLocalPassInput('');
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.lightboxContainer} onClick={(e) => e.stopPropagation()}>
        {/* Top Control Bar */}
        <div className={styles.topBar}>
          <div className={styles.titleArea}>
            <span className={styles.typeIcon}>{item.type === 'video' ? '🎥' : '🖼️'}</span>
            <div className={styles.titleWrapper}>
              <h3 className={styles.itemTitle}>{item.title}</h3>
              <span className={styles.metaSub}>
                {item.category} {item.dimensions ? `• ${item.dimensions}` : ''}
              </span>
            </div>
          </div>

          <div className={styles.actionButtons}>
            {/* Zoom controls for images */}
            {item.type === 'image' && !isLocked && (
              <div className={styles.zoomControls}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => handleZoom(-0.25)}
                  title="Zoom Out"
                >
                  −
                </button>
                <span className={styles.zoomLabel}>{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => handleZoom(0.25)}
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => setZoomLevel(1)}
                  title="Reset Zoom"
                >
                  ⟲
                </button>
              </div>
            )}

            {/* Video Playback Speed */}
            {item.type === 'video' && !ytId && !isLocked && (
              <div className={styles.speedSelector}>
                {[0.5, 1, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`${styles.speedBtn} ${playbackRate === s ? styles.speedBtnActive : ''}`}
                    onClick={() => handlePlaybackRateChange(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}

            {/* Favorite button */}
            <button
              type="button"
              className={`${styles.iconBtn} ${item.isFavorite ? styles.iconBtnFav : ''}`}
              onClick={() => onToggleFavorite(item.id, !item.isFavorite)}
              title={item.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
            >
              ★
            </button>

            {/* Copy Link */}
            <button
              type="button"
              className={styles.iconBtn}
              onClick={handleCopyLink}
              title="Copy Media URL"
            >
              {copiedLink ? (
                <svg fill="none" stroke="#10b981" viewBox="0 0 24 24" width="18" height="18">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
            </button>

            {/* Download */}
            {!isLocked && decryptedUrl && (
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => downloadMediaFile({ ...item, url: decryptedUrl })}
                title="Download file"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            )}

            {/* Toggle Info Sidebar */}
            <button
              type="button"
              className={`${styles.iconBtn} ${showInfoSidebar ? styles.iconBtnActive : ''}`}
              onClick={() => setShowInfoSidebar((prev) => !prev)}
              title="View Information"
            >
              ℹ
            </button>

            {/* Delete */}
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
              onClick={() => {
                if (window.confirm(`Վստա՞հ եք, որ ցանկանում եք ջնջել «${item.title}»-ը:`)) {
                  onDelete(item.id);
                  onClose();
                }
              }}
              title="Delete item"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            {/* Close */}
            <button type="button" className={styles.closeBtn} onClick={onClose} title="Close (Esc)">
              ×
            </button>
          </div>
        </div>

        {/* Main View Area */}
        <div className={styles.contentBody}>
          {/* Previous Button */}
          {items.length > 1 && (
            <button
              type="button"
              className={`${styles.navBtn} ${styles.navBtnPrev}`}
              onClick={onSelectPrev}
              title="Previous (Left Arrow)"
            >
              ‹
            </button>
          )}

          {/* Media Center Pane */}
          <div className={styles.mediaViewport}>
            {isLocked ? (
              <div className={styles.lockedContainer}>
                <div className={styles.lockBox}>
                  <div className={styles.lockIconBig}>🔒</div>
                  <h3 className={styles.lockedTitle}>Գաղտնագրված Մեդիա (Vault Protected)</h3>
                  <p className={styles.lockedText}>
                    Այս մեդիա ֆայլը պաշտպանված է Master Password-ով (Zero-Knowledge): Դիտելու համար մուտքագրեք Master Password-ը:
                  </p>
                  <form onSubmit={handleUnlockSubmit} className={styles.unlockForm}>
                    <input
                      type="password"
                      className={styles.unlockInput}
                      placeholder="Մուտքագրեք Master Password..."
                      value={localPassInput}
                      onChange={(e) => setLocalPassInput(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" className={styles.unlockBtn}>
                      Բացել Պահոցը
                    </button>
                  </form>
                </div>
              </div>
            ) : ytId ? (
              /* YouTube Player */
              <div className={styles.ytWrapper}>
                <iframe
                  className={styles.ytIframe}
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                  title={item.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : item.type === 'video' ? (
              /* Native Video Player */
              <video
                ref={videoRef}
                src={decryptedUrl}
                controls
                autoPlay
                className={styles.videoPlayer}
              />
            ) : (
              /* Image with Zoom */
              <div className={styles.imageWrapper}>
                <img
                  src={decryptedUrl}
                  alt={item.title}
                  className={styles.viewerImage}
                  style={{ transform: `scale(${zoomLevel})` }}
                />
              </div>
            )}
          </div>

          {/* Next Button */}
          {items.length > 1 && (
            <button
              type="button"
              className={`${styles.navBtn} ${styles.navBtnNext}`}
              onClick={onSelectNext}
              title="Next (Right Arrow)"
            >
              ›
            </button>
          )}

          {/* Metadata Information Drawer */}
          {showInfoSidebar && (
            <div className={styles.infoDrawer}>
              <div className={styles.drawerHeader}>
                <h4>Ֆայլի Մանրամասներ</h4>
                <button type="button" onClick={() => setShowInfoSidebar(false)}>
                  ×
                </button>
              </div>

              <div className={styles.drawerContent}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Անվանում:</span>
                  <span className={styles.infoValue}>{item.title}</span>
                </div>

                {item.description && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Նկարագրություն:</span>
                    <span className={styles.infoValue}>{item.description}</span>
                  </div>
                )}

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Տեսակը:</span>
                  <span className={styles.infoValue}>
                    {item.type === 'video' ? 'Վիդեո (Video)' : 'Լուսանկար (Image)'}
                  </span>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Կատեգորիա:</span>
                  <span className={styles.infoValue}>{item.category || 'General'}</span>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Պահոց:</span>
                  <span className={styles.infoValue}>
                    {item.storagePath || (typeof item.url === 'string' && item.url.includes('firebasestorage.googleapis.com'))
                      ? '☁️ Firebase Cloud Storage'
                      : '💾 Local / Cache'}
                  </span>
                </div>

                {item.fileSize && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Ֆայլի Չափ:</span>
                    <span className={styles.infoValue}>{formatBytes(item.fileSize)}</span>
                  </div>
                )}

                {item.dimensions && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Կետայնություն:</span>
                    <span className={styles.infoValue}>{item.dimensions}</span>
                  </div>
                )}

                {item.duration && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Տևողություն:</span>
                    <span className={styles.infoValue}>{formatDuration(item.duration)}</span>
                  </div>
                )}

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Ավելացված է:</span>
                  <span className={styles.infoValue}>
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Պաշտպանություն:</span>
                  <span className={styles.infoValue}>
                    {item.isEncrypted ? '🔒 Zero-Knowledge AES-256' : 'Ստանդարտ'}
                  </span>
                </div>

                {(item.tags || []).length > 0 && (
                  <div className={styles.tagsSection}>
                    <span className={styles.infoLabel}>Թեգեր:</span>
                    <div className={styles.tagsContainer}>
                      {item.tags.map((t, i) => (
                        <span key={i} className={styles.tagChip}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
