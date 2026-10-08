import React, { useState } from 'react';
import { extractDomain, getFaviconUrl } from '../../utils/workspaceValidation.js';
import styles from './DailyWorkspace.module.css';

// SVG Icon Mapping
function PresetIcon({ name, color }) {
  const props = {
    fill: 'none',
    stroke: color || 'currentColor',
    viewBox: '0 0 24 24',
    width: '22',
    height: '22',
  };

  switch (name) {
    case 'briefcase':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'server':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'code':
    default:
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
  }
}

export function WorkspacePresetCard({
  preset,
  isSelected,
  onSelect,
  onStart,
  onEdit,
  onDelete,
}) {
  const [showUrlPreview, setShowUrlPreview] = useState(false);

  const accentColor = preset.color || '#8b5cf6';
  const urls = preset.urls || [];

  return (
    <div
      className={`${styles.presetCard} ${isSelected ? styles.presetCardSelected : ''}`}
      style={{ '--preset-accent': accentColor }}
      onClick={onSelect}
    >
      <div className={styles.presetHeader}>
        <div className={styles.presetTitleArea}>
          <div
            className={styles.presetIconWrapper}
            style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}
          >
            <PresetIcon name={preset.icon} color={accentColor} />
          </div>
          <div>
            <h3 className={styles.presetName}>{preset.name}</h3>
            {preset.accountLabel && (
              <span className={styles.accountBadge}>
                👤 {preset.accountLabel}
              </span>
            )}
          </div>
        </div>

        <div className={styles.presetHeaderActions} onClick={(e) => e.stopPropagation()}>
          {preset.isFavorite && (
            <span className={styles.starBadge} title="Favorite Preset">
              ★
            </span>
          )}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => onEdit(preset)}
            title="Edit Preset"
            aria-label="Edit Preset"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            onClick={() => onDelete(preset)}
            title="Delete Preset"
            aria-label="Delete Preset"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <p className={styles.presetDescription}>
        {preset.description || 'Custom configured workspace collection.'}
      </p>

      {/* Favicons row */}
      <div className={styles.faviconsRow}>
        <div className={styles.faviconStack}>
          {urls.slice(0, 5).map((url, idx) => (
            <img
              key={idx}
              src={getFaviconUrl(url)}
              alt={extractDomain(url)}
              className={styles.miniFavicon}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
              title={extractDomain(url)}
            />
          ))}
          {urls.length > 5 && (
            <span className={styles.moreUrlsCount}>+{urls.length - 5}</span>
          )}
        </div>

        <button
          type="button"
          className={styles.togglePreviewBtn}
          onClick={(e) => {
            e.stopPropagation();
            setShowUrlPreview(!showUrlPreview);
          }}
        >
          {urls.length} Links {showUrlPreview ? '▲' : '▼'}
        </button>
      </div>

      {/* Collapsible URL list preview */}
      {showUrlPreview && (
        <div className={styles.urlPreviewList} onClick={(e) => e.stopPropagation()}>
          {urls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.urlPreviewItem}
            >
              <img
                src={getFaviconUrl(url)}
                alt=""
                className={styles.urlItemFavicon}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className={styles.urlItemText}>{extractDomain(url)}</span>
              <span className={styles.urlExternalIcon}>↗</span>
            </a>
          ))}
        </div>
      )}

      {/* Bottom Launch Action */}
      <div className={styles.presetCardFooter} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.launchBtn}
          onClick={() => onStart(preset)}
          style={{ backgroundColor: accentColor }}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
          <span>Launch Workspace</span>
        </button>
      </div>
    </div>
  );
}

export default WorkspacePresetCard;
