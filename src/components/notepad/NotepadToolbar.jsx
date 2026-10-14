import React, { useState, useRef, useEffect } from 'react';
import { NOTE_TEMPLATES } from './notepadTemplates';
import styles from './NotepadToolbar.module.css';

export const NotepadToolbar = ({
  viewMode, // 'edit' | 'preview' | 'split'
  onChangeViewMode,
  isZenMode,
  onToggleZenMode,
  isPinned,
  onTogglePin,
  isEncrypted,
  onToggleEncrypt,
  hasMasterPassword,
  onApplyFormat,
  onInsertTemplate,
  onCopyContent,
  onExportMarkdown,
  onExportText,
  onPrintNote,
  onDeleteNote,
}) => {
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [copiedState, setCopiedState] = useState(false);

  const templateMenuRef = useRef(null);
  const exportMenuRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target)) {
        setIsTemplateMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = async () => {
    const success = await onCopyContent();
    if (success) {
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    }
  };

  return (
    <div className={styles.toolbar}>
      {/* Group 1: Formatting Tools (Active mostly in edit/split) */}
      <div className={styles.toolsGroup}>
        <button
          type="button"
          className={styles.toolBtn}
          title="Bold (Ctrl+B) / Թավ"
          onClick={() => onApplyFormat('bold')}
        >
          <strong>B</strong>
        </button>

        <button
          type="button"
          className={styles.toolBtn}
          title="Italic (Ctrl+I) / Շեղ"
          onClick={() => onApplyFormat('italic')}
        >
          <em>I</em>
        </button>

        <button
          type="button"
          className={styles.toolBtn}
          title="Strikethrough / Գծված"
          onClick={() => onApplyFormat('strike')}
        >
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </button>

        <div className={styles.divider} />

        <button
          type="button"
          className={styles.toolBtn}
          title="Heading 1 / Վերնագիր 1"
          onClick={() => onApplyFormat('h1')}
        >
          H1
        </button>

        <button
          type="button"
          className={styles.toolBtn}
          title="Heading 2 / Վերնագիր 2"
          onClick={() => onApplyFormat('h2')}
        >
          H2
        </button>

        <button
          type="button"
          className={styles.toolBtn}
          title="Heading 3 / Վերնագիր 3"
          onClick={() => onApplyFormat('h3')}
        >
          H3
        </button>

        <div className={styles.divider} />

        <button
          type="button"
          className={styles.toolBtn}
          title="Checklist / Ստուգաթերթ (- [ ])"
          onClick={() => onApplyFormat('checklist')}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </button>

        <button
          type="button"
          className={styles.toolBtn}
          title="Bullet list / Կետային ցանկ"
          onClick={() => onApplyFormat('bullet')}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <button
          type="button"
          className={styles.toolBtn}
          title="Numbered list / Համարակալված ցանկ"
          onClick={() => onApplyFormat('numbered')}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </button>

        <button
          type="button"
          className={styles.toolBtn}
          title="Code Block / Կոդի բլոկ"
          onClick={() => onApplyFormat('codeblock')}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>

        <button
          type="button"
          className={styles.toolBtn}
          title="Quote / Մեջբերում"
          onClick={() => onApplyFormat('quote')}
        >
          <svg fill="currentColor" viewBox="0 0 24 24" width="14" height="14">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
        </button>

        <button
          type="button"
          className={styles.toolBtn}
          title="Link / Հղում"
          onClick={() => onApplyFormat('link')}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>

        <button
          type="button"
          className={styles.toolBtn}
          title="Current Timestamp / Ընթացիկ ժամանակ"
          onClick={() => onApplyFormat('timestamp')}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Group 2: Mode Switcher & Productivity Features */}
      <div className={styles.toolsRight}>
        {/* Templates Dropdown */}
        <div className={styles.dropdownWrapper} ref={templateMenuRef}>
          <button
            type="button"
            className={styles.pillBtn}
            onClick={() => setIsTemplateMenuOpen((prev) => !prev)}
            title="Insert Template / Կաղապարներ"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            <span>Templates</span>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isTemplateMenuOpen && (
            <div className={styles.dropdownMenu}>
              <div className={styles.menuHeader}>Ընտրել Կաղապար (Template)</div>
              {NOTE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  className={styles.menuItem}
                  onClick={() => {
                    onInsertTemplate(tmpl);
                    setIsTemplateMenuOpen(false);
                  }}
                >
                  <span className={styles.menuItemText}>{tmpl.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View Mode Toggle: Edit | Split | Preview */}
        <div className={styles.viewModeGroup}>
          <button
            type="button"
            className={`${styles.modeBtn} ${viewMode === 'edit' ? styles.modeBtnActive : ''}`}
            onClick={() => onChangeViewMode('edit')}
            title="Edit mode (Raw Markdown)"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit</span>
          </button>

          <button
            type="button"
            className={`${styles.modeBtn} ${viewMode === 'split' ? styles.modeBtnActive : ''}`}
            onClick={() => onChangeViewMode('split')}
            title="Split Mode (Side-by-side Editor & Preview)"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <span>Split</span>
          </button>

          <button
            type="button"
            className={`${styles.modeBtn} ${viewMode === 'preview' ? styles.modeBtnActive : ''}`}
            onClick={() => onChangeViewMode('preview')}
            title="Preview Mode (Rendered Markdown)"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Preview</span>
          </button>
        </div>

        {/* Zen / Fullscreen Toggle */}
        <button
          type="button"
          className={`${styles.toolBtn} ${isZenMode ? styles.toolBtnHighlight : ''}`}
          onClick={onToggleZenMode}
          title={isZenMode ? 'Exit Zen Mode / Ելք Ֆոկուսից' : 'Zen Focus Mode / Կենտրոնացման ռեժիմ'}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            {isZenMode ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            )}
          </svg>
        </button>

        {/* Pin note toggle */}
        <button
          type="button"
          className={`${styles.toolBtn} ${isPinned ? styles.toolBtnPinned : ''}`}
          onClick={onTogglePin}
          title={isPinned ? 'Unpin Note / Հանել Ամրացումը' : 'Pin Note to Top / Ամրացնել վերևում'}
        >
          <svg fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>

        {/* Zero-Knowledge Encrypt Toggle */}
        <button
          type="button"
          className={`${styles.toolBtn} ${isEncrypted ? styles.toolBtnEncrypted : ''}`}
          onClick={onToggleEncrypt}
          title={
            isEncrypted
              ? 'Note content is encrypted with your vault password'
              : 'Encrypt Note with Master Password / Գաղտնագրել'
          }
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </button>

        {/* Copy All Button */}
        <button
          type="button"
          className={styles.toolBtn}
          onClick={handleCopy}
          title="Copy note content / Պատճենել"
        >
          {copiedState ? (
            <svg fill="none" stroke="#10b981" viewBox="0 0 24 24" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>

        {/* Export Dropdown */}
        <div className={styles.dropdownWrapper} ref={exportMenuRef}>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => setIsExportMenuOpen((prev) => !prev)}
            title="Export / Ներբեռնել"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {isExportMenuOpen && (
            <div className={`${styles.dropdownMenu} ${styles.dropdownRight}`}>
              <div className={styles.menuHeader}>Արտահանել (Export)</div>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  onExportMarkdown();
                  setIsExportMenuOpen(false);
                }}
              >
                <span>📄 Markdown (.md)</span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  onExportText();
                  setIsExportMenuOpen(false);
                }}
              >
                <span>📝 Plain Text (.txt)</span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  onPrintNote();
                  setIsExportMenuOpen(false);
                }}
              >
                <span>🖨️ Print / PDF View</span>
              </button>
            </div>
          )}
        </div>

        {/* Delete Note */}
        <button
          type="button"
          className={`${styles.toolBtn} ${styles.toolBtnDelete}`}
          onClick={onDeleteNote}
          title="Delete Note / Ջնջել Նոթը"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};
