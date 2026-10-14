import React, { useEffect, useState } from 'react';
import {
  formatDuration,
  getMediaBlob,
  MEDIA_CATEGORIES,
  downloadMediaFile,
} from '../../services/mediaService';
import styles from './MediaCard.module.css';

export const MediaCard = ({
  item,
  onClick,
  onToggleFavorite,
  onDelete,
  masterPassword,
}) => {
  const [localPreview, setLocalPreview] = useState('');
  useEffect(() => {
    let active = true,
      objectUrl;
    setLocalPreview('');
    if (
      !item.isEncrypted &&
      !item.storagePath &&
      !/^https?:/.test(item.url || '')
    )
      getMediaBlob(item.id).then((value) => {
        if (!active || !value) return;
        if (value instanceof Blob) {
          objectUrl = URL.createObjectURL(value);
          setLocalPreview(objectUrl);
        } else setLocalPreview(value);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, item.url, item.storagePath, item.isEncrypted]);
  const isLocked = Boolean(item.isEncrypted);
  const categoryMeta = MEDIA_CATEGORIES.find((c) => c.id === item.category);

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite(item.id, !item.isFavorite);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (window.confirm(`Ջնջե՞լ «${item.title}» մեդիան:`)) {
      onDelete(item.id);
    }
  };

  const handleDownloadClick = (e) => {
    e.stopPropagation();
    if (!isLocked) {
      downloadMediaFile(item);
    }
  };

  return (
    <div className={styles.card} onClick={onClick}>
      {/* Thumbnail Container */}
      <div className={styles.thumbWrapper}>
        {isLocked ? (
          <div className={styles.lockedThumb}>
            <span className={styles.lockedIcon}>🔒</span>
            <span className={styles.lockedText}>Գաղտնագրված</span>
          </div>
        ) : item.type === 'video' ? (
          <div className={styles.videoThumbBox}>
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt={item.title}
                className={styles.thumbImg}
                loading="lazy"
              />
            ) : (
              <video
                src={localPreview || item.url}
                className={styles.thumbImg}
                muted
                preload="none"
              />
            )}
            <div className={styles.playOverlay}>
              <div className={styles.playIconCircle}>
                <svg
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>

            {item.duration > 0 && (
              <span className={styles.durationBadge}>
                {formatDuration(item.duration)}
              </span>
            )}
          </div>
        ) : (
          <img
            src={localPreview || item.thumbnailUrl || item.url}
            alt={item.title}
            className={styles.thumbImg}
            loading="lazy"
          />
        )}

        {/* Favorite Icon Top Right */}
        <button
          type="button"
          className={`${styles.favBtn} ${item.isFavorite ? styles.favBtnActive : ''}`}
          onClick={handleFavoriteClick}
          title={item.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
        >
          ★
        </button>

        {/* Type Badge Top Left */}
        <div className={styles.typeBadge}>
          {item.type === 'video' ? '🎥 VIDEO' : '🖼️ PHOTO'}
          {(item.isCloudSynced ||
            item.storagePath ||
            (typeof item.url === 'string' &&
              item.url.includes('firebasestorage.googleapis.com'))) && (
            <span title="Պահպանված է Firebase Cloud Storage-ում"> ☁️</span>
          )}
        </div>

        {/* Quick Hover Controls Overlay */}
        <div className={styles.hoverActions}>
          {!isLocked && (
            <button
              type="button"
              className={styles.actionCircleBtn}
              onClick={handleDownloadClick}
              title="Download file"
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width="14"
                height="14"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>
          )}

          <button
            type="button"
            className={`${styles.actionCircleBtn} ${styles.deleteCircleBtn}`}
            onClick={handleDeleteClick}
            title="Delete item"
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="14"
              height="14"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Card Info Footer */}
      <div className={styles.cardFooter}>
        <div className={styles.titleRow}>
          <h4 className={styles.title} title={item.title}>
            {item.title}
          </h4>
        </div>

        {item.description && (
          <p className={styles.description}>{item.description}</p>
        )}

        <div className={styles.metaRow}>
          {categoryMeta && (
            <span
              className={styles.categoryBadge}
              style={{
                color: categoryMeta.color,
                backgroundColor: `${categoryMeta.color}15`,
                borderColor: `${categoryMeta.color}35`,
              }}
            >
              {categoryMeta.icon} {categoryMeta.id}
            </span>
          )}

          {item.dimensions && (
            <span className={styles.dimBadge}>{item.dimensions}</span>
          )}

          {item.isEncrypted && (
            <span className={styles.encBadge} title="Zero-Knowledge Encrypted">
              🔒 AES
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
