import React from 'react';
import styles from './DailyWorkspace.module.css';

export function QuickActions({
  onNewPreset,
  onNewLink,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  categories,
}) {
  return (
    <div className={styles.quickActionsBar}>
      <div className={styles.searchWrapper}>
        <svg className={styles.searchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search presets, favorite links, categories..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className={styles.searchClearBtn}
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className={styles.quickActionButtons}>
        {categories && categories.length > 0 && (
          <div className={styles.filterChipGroup}>
            <button
              type="button"
              className={`${styles.filterChip} ${activeFilter === 'ALL' ? styles.filterChipActive : ''}`}
              onClick={() => onFilterChange('ALL')}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`${styles.filterChip} ${activeFilter === cat ? styles.filterChipActive : ''}`}
                onClick={() => onFilterChange(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className={styles.actionAddGroup}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onNewLink}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Add Link</span>
          </button>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onNewPreset}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ New Preset</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuickActions;
