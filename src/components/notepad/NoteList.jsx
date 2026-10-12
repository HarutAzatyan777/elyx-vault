import React, { useState } from 'react';
import { NOTE_CATEGORIES } from './notepadTemplates';
import styles from './NoteList.module.css';

export const NoteList = ({
  notes = [],
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onTogglePin,
  onDuplicateNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Filter notes based on category and search query
  const filteredNotes = notes.filter((note) => {
    // Category match
    if (selectedCategory === 'Pinned' && !note.isPinned) return false;
    if (selectedCategory === 'Encrypted' && !note.isEncrypted) return false;
    if (
      selectedCategory !== 'All' &&
      selectedCategory !== 'Pinned' &&
      selectedCategory !== 'Encrypted' &&
      note.category !== selectedCategory
    ) {
      return false;
    }

    // Search query match
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (note.title || '').toLowerCase().includes(q);
    const contentMatch = (note.content || '').toLowerCase().includes(q);
    const tagsMatch = (note.tags || []).some((t) => t.toLowerCase().includes(q));

    return titleMatch || contentMatch || tagsMatch;
  });

  const formatNoteDate = (isoDate) => {
    if (!isoDate) return '';
    try {
      const d = new Date(isoDate);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className={styles.container}>
      {/* Search & New Note Header */}
      <div className={styles.header}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Փնտրել նոթեր, թեգեր..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <button
          type="button"
          className={styles.newNoteBtn}
          onClick={onCreateNote}
          title="Ստեղծել նոր նոթ"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Նոր Նոթ</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className={styles.categoriesBar}>
        {NOTE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`${styles.catPill} ${selectedCategory === cat.id ? styles.catPillActive : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span>{cat.icon}</span>
            <span>{cat.id}</span>
          </button>
        ))}
        <button
          type="button"
          className={`${styles.catPill} ${selectedCategory === 'Pinned' ? styles.catPillActive : ''}`}
          onClick={() => setSelectedCategory('Pinned')}
        >
          <span>📌</span>
          <span>Pinned</span>
        </button>
        <button
          type="button"
          className={`${styles.catPill} ${selectedCategory === 'Encrypted' ? styles.catPillActive : ''}`}
          onClick={() => setSelectedCategory('Encrypted')}
        >
          <span>🔒</span>
          <span>Secret</span>
        </button>
      </div>

      {/* Stats bar */}
      <div className={styles.statsBar}>
        <span>{filteredNotes.length} նոթ</span>
        {searchQuery && <span className={styles.searchNotice}>Արդյունքներ: «{searchQuery}»</span>}
      </div>

      {/* Notes List */}
      <div className={styles.notesList}>
        {filteredNotes.length === 0 ? (
          <div className={styles.emptyList}>
            <div className={styles.emptyIcon}>📝</div>
            <div className={styles.emptyTitle}>Նոթեր չեն գտնվել</div>
            <p className={styles.emptySubtitle}>
              {searchQuery
                ? 'Փորձեք փոխել որոնման բառը կամ ֆիլտրը'
                : 'Սեղմեք «Նոր Նոթ» կոճակը՝ առաջին նոթը ստեղծելու համար'}
            </p>
            {searchQuery ? (
              <button
                type="button"
                className={styles.resetFilterBtn}
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
              >
                Մաքրել ֆիլտրերը
              </button>
            ) : (
              <button
                type="button"
                className={styles.resetFilterBtn}
                onClick={onCreateNote}
              >
                + Ստեղծել նոթ
              </button>
            )}
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isActive = note.id === activeNoteId;
            const categoryMeta = NOTE_CATEGORIES.find((c) => c.id === note.category);

            // Clean excerpt from markdown symbols
            const rawExcerpt = (note.content || '')
              .replace(/#+\s+/g, '')
              .replace(/`{1,3}/g, '')
              .replace(/\*\*|__/g, '')
              .replace(/[-*]\s+/g, '')
              .replace(/>\s+/g, '')
              .trim();

            return (
              <div
                key={note.id}
                className={`${styles.noteCard} ${isActive ? styles.noteCardActive : ''}`}
                onClick={() => onSelectNote(note.id)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.titleRow}>
                    {note.isPinned && (
                      <span className={styles.pinIcon} title="Pinned Note">
                        📌
                      </span>
                    )}
                    {note.isEncrypted && (
                      <span className={styles.lockIcon} title="Encrypted Vault Note">
                        🔒
                      </span>
                    )}
                    <h3 className={styles.noteTitle}>
                      {note.title || 'Անանուն նոթ'}
                    </h3>
                  </div>

                  <span className={styles.noteDate}>
                    {formatNoteDate(note.updatedAt || note.createdAt)}
                  </span>
                </div>

                <p className={styles.excerpt}>
                  {note.isEncrypted
                    ? '🔒 Պաշտպանված բովանդակություն (Encrypted with Master Password)'
                    : rawExcerpt || 'Դատարկ նոթ...'}
                </p>

                <div className={styles.cardFooter}>
                  <div className={styles.tagsGroup}>
                    {categoryMeta && (
                      <span
                        className={styles.categoryBadge}
                        style={{
                          borderColor: `${categoryMeta.color}40`,
                          backgroundColor: `${categoryMeta.color}15`,
                          color: categoryMeta.color,
                        }}
                      >
                        {categoryMeta.icon} {categoryMeta.id}
                      </span>
                    )}
                    {(note.tags || []).slice(0, 2).map((tag, tIdx) => (
                      <span key={tIdx} className={styles.tagChip}>
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Quick Card Action Buttons */}
                  <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`${styles.cardActionBtn} ${note.isPinned ? styles.cardActionBtnActive : ''}`}
                      onClick={() => onTogglePin(note.id, !note.isPinned)}
                      title={note.isPinned ? 'Unpin' : 'Pin'}
                    >
                      📌
                    </button>
                    <button
                      type="button"
                      className={styles.cardActionBtn}
                      onClick={() => onDuplicateNote(note)}
                      title="Duplicate note"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="13" height="13">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`}
                      onClick={() => onDeleteNote(note.id)}
                      title="Delete note"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="13" height="13">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
