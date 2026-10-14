import { encryptRequired } from '../../utils/securePayload.js';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NotepadToolbar } from './NotepadToolbar';
import { MarkdownView } from './MarkdownView';
import { NOTE_CATEGORIES } from './notepadTemplates';
import { decryptData } from '../../utils/crypto';
import {
  downloadNoteFile,
  copyTextToClipboard,
} from '../../services/notepadService';
import styles from './NoteEditor.module.css';

export const NoteEditor = ({
  note,
  masterPassword,
  onUpdateNote,
  onDeleteNote,
  onTogglePin,
  onUnlockVault,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Ideas');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [viewMode, setViewMode] = useState('split'); // 'edit' | 'preview' | 'split'
  const [isZenMode, setIsZenMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving'
  const [localPassInput, setLocalPassInput] = useState('');
  const [decryptError, setDecryptError] = useState(false);
  const [encryptionMode, setEncryptionMode] = useState(
    Boolean(note?.isEncrypted),
  );

  const textareaRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Determine if note content is locked
  const isLocked = useMemo(() => {
    if (!note?.isEncrypted) return false;
    return !masterPassword;
  }, [note?.isEncrypted, masterPassword]);

  // Decrypt content if encrypted
  useEffect(() => {
    if (!note) return;

    setEncryptionMode(Boolean(note.isEncrypted));
    setTitle(note.title || '');
    setCategory(note.category || 'Ideas');
    setTags(note.tags || []);
    setDecryptError(false);

    if (note.isEncrypted) {
      if (masterPassword) {
        const decrypted = decryptData(note.content, masterPassword);
        if (decrypted !== null) {
          setContent(decrypted);
        } else {
          setContent('');
          setDecryptError(true);
        }
      } else {
        // Locked
        setContent('');
      }
    } else {
      setContent(note.content || '');
    }
  }, [note?.id, note?.isEncrypted, masterPassword]);

  useEffect(() => {
    return () => {
      clearTimeout(saveTimeoutRef.current);
    };
  }, [note?.id, masterPassword]);

  // Handle local unlock submission
  const handleLocalUnlock = (e) => {
    e.preventDefault();
    if (!localPassInput) return;
    onUnlockVault(localPassInput);
    setLocalPassInput('');
  };

  // Trigger debounced save
  const triggerAutoSave = (
    newTitle,
    newContent,
    newCategory,
    newTags,
    newEncrypted,
    newPinned,
  ) => {
    if (isLocked || decryptError) {
      setSaveStatus('error');
      return;
    }
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      let finalContent = newContent;
      const isEnc = newEncrypted !== undefined ? newEncrypted : encryptionMode;

      if (isEnc) {
        try {
          finalContent = encryptRequired(newContent, masterPassword);
        } catch {
          setSaveStatus('error');
          return;
        }
      }

      try {
        await onUpdateNote({
          id: note.id,
          title: newTitle,
          content: finalContent,
          category: newCategory,
          tags: newTags,
          isEncrypted: Boolean(isEnc),
          isPinned: Boolean(
            newPinned !== undefined ? newPinned : note?.isPinned,
          ),
        });

        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 450);
  };

  // Content change
  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);
    triggerAutoSave(title, val, category, tags, encryptionMode, note?.isPinned);
  };

  // Title change
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    triggerAutoSave(
      val,
      content,
      category,
      tags,
      encryptionMode,
      note?.isPinned,
    );
  };

  // Category change
  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setCategory(val);
    triggerAutoSave(title, content, val, tags, encryptionMode, note?.isPinned);
  };

  // Tag add / remove
  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/^#/, '');
      if (trimmed && !tags.includes(trimmed)) {
        const nextTags = [...tags, trimmed];
        setTags(nextTags);
        setTagInput('');
        triggerAutoSave(
          title,
          content,
          category,
          nextTags,
          encryptionMode,
          note?.isPinned,
        );
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    triggerAutoSave(
      title,
      content,
      category,
      nextTags,
      encryptionMode,
      note?.isPinned,
    );
  };

  // Format action on textarea
  const applyFormatting = (type) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    let replacement = '';
    let cursorOffset = 0;

    switch (type) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        cursorOffset = selected ? replacement.length : 1;
        break;
      case 'strike':
        replacement = `~~${selected || 'strikethrough'}~~`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'h1':
        replacement = `\n# ${selected || 'Heading 1'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'h2':
        replacement = `\n## ${selected || 'Heading 2'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'h3':
        replacement = `\n### ${selected || 'Heading 3'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'checklist':
        replacement = `\n- [ ] ${selected || 'New task'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'bullet':
        replacement = `\n- ${selected || 'List item'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'numbered':
        replacement = `\n1. ${selected || 'Numbered item'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'codeblock':
        replacement = `\n\`\`\`javascript\n${selected || '// code here'}\n\`\`\`\n`;
        cursorOffset = replacement.length;
        break;
      case 'quote':
        replacement = `\n> ${selected || 'Quote'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'link':
        replacement = `[${selected || 'Link Title'}](https://example.com)`;
        cursorOffset = replacement.length;
        break;
      case 'timestamp': {
        const now = new Date();
        replacement = ` [${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] `;
        cursorOffset = replacement.length;
        break;
      }
      default:
        return;
    }

    const nextContent =
      content.substring(0, start) + replacement + content.substring(end);
    setContent(nextContent);
    triggerAutoSave(
      title,
      nextContent,
      category,
      tags,
      encryptionMode,
      note?.isPinned,
    );

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 10);
  };

  // Keyboard Shortcuts (Ctrl+B, Ctrl+I, Tab)
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      applyFormatting('bold');
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      applyFormatting('italic');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextContent =
        content.substring(0, start) + '  ' + content.substring(end);
      setContent(nextContent);
      triggerAutoSave(
        title,
        nextContent,
        category,
        tags,
        encryptionMode,
        note?.isPinned,
      );
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Interactive Checklist Toggle in Preview
  const handleToggleChecklist = (checkIndex) => {
    const lines = content.split('\n');
    let currentIndex = 0;

    const updatedLines = lines.map((line) => {
      const match = line.match(/^(\s*-\s*\[)([ xX])(\]\s*.*)$/);
      if (match) {
        if (currentIndex === checkIndex) {
          const currentChecked = match[2].toLowerCase() === 'x';
          const nextSymbol = currentChecked ? ' ' : 'x';
          currentIndex++;
          return `${match[1]}${nextSymbol}${match[3]}`;
        }
        currentIndex++;
      }
      return line;
    });

    const nextContent = updatedLines.join('\n');
    setContent(nextContent);
    triggerAutoSave(
      title,
      nextContent,
      category,
      tags,
      encryptionMode,
      note?.isPinned,
    );
  };

  // Template insert
  const handleInsertTemplate = (template) => {
    const snippet = template.snippet;
    const nextContent = content ? `${content}\n\n${snippet}` : snippet;
    setContent(nextContent);
    if (template.category && !category) {
      setCategory(template.category);
    }
    triggerAutoSave(
      title,
      nextContent,
      category || template.category,
      tags,
      encryptionMode,
      note?.isPinned,
    );
  };

  // Encryption toggle
  const handleToggleEncrypt = () => {
    if (!masterPassword) {
      alert(
        'Խնդրում ենք նախ բացել Vault-ը (Unlock Vault) Master Password-ով, որպեսզի գաղտնագրումը հասանելի լինի:',
      );
      return;
    }
    const nextEncrypted = !encryptionMode;
    setEncryptionMode(nextEncrypted);
    triggerAutoSave(
      title,
      content,
      category,
      tags,
      nextEncrypted,
      note?.isPinned,
    );
  };

  // Copy content
  const handleCopyContent = async () => {
    return await copyTextToClipboard(content);
  };

  // Export handlers
  const handleExportMarkdown = () => {
    downloadNoteFile({ title, content }, 'markdown');
  };

  const handleExportText = () => {
    downloadNoteFile({ title, content }, 'text');
  };

  const handlePrint = () => {
    window.print();
  };

  // Stats calculation
  const wordsCount = useMemo(() => {
    if (!content.trim()) return 0;
    return content.trim().split(/\s+/).length;
  }, [content]);

  const charCount = content.length;
  const readTimeMin = Math.max(1, Math.ceil(wordsCount / 200));

  if (!note) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIcon}>📝</div>
        <h2>Ընտրեք կամ ստեղծեք նոթ</h2>
        <p>Ձախ կողմի ցանկից ընտրեք նոթ կամ սեղմեք «+ Նոր Նոթ» սկսելու համար:</p>
      </div>
    );
  }

  return (
    <div
      className={`${styles.editorContainer} ${isZenMode ? styles.zenModeActive : ''}`}
    >
      {/* Top Toolbar */}
      <NotepadToolbar
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        isZenMode={isZenMode}
        onToggleZenMode={() => setIsZenMode((prev) => !prev)}
        isPinned={note.isPinned}
        onTogglePin={() => onTogglePin(note.id, !note.isPinned)}
        isEncrypted={encryptionMode}
        onToggleEncrypt={handleToggleEncrypt}
        hasMasterPassword={Boolean(masterPassword)}
        onApplyFormat={applyFormatting}
        onInsertTemplate={handleInsertTemplate}
        onCopyContent={handleCopyContent}
        onExportMarkdown={handleExportMarkdown}
        onExportText={handleExportText}
        onPrintNote={handlePrint}
        onDeleteNote={() => onDeleteNote(note.id)}
      />

      {/* Note Metadata Header (Title, Category, Tags) */}
      <div className={styles.metaHeader}>
        <div className={styles.metaRowTop}>
          <input
            type="text"
            className={styles.titleInput}
            placeholder="Նոթի վերնագիր..."
            value={title}
            onChange={handleTitleChange}
            disabled={isLocked}
          />

          <select
            className={styles.categorySelect}
            value={category}
            onChange={handleCategoryChange}
            disabled={isLocked}
          >
            {NOTE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tags input & chips */}
        <div className={styles.tagsRow}>
          <div className={styles.tagChipsList}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tagBadge}>
                #{tag}
                {!isLocked && (
                  <button
                    type="button"
                    className={styles.tagRemoveBtn}
                    onClick={() => handleRemoveTag(tag)}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {!isLocked && (
              <input
                type="text"
                className={styles.tagInput}
                placeholder="+ Թեգ (Enter)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
              />
            )}
          </div>

          {note.isEncrypted && (
            <span className={styles.encryptedBannerBadge}>
              🔒 Content encrypted · Title and tags remain readable
            </span>
          )}
        </div>
      </div>

      {/* Editor Body */}
      {isLocked ? (
        <div className={styles.lockedContainer}>
          <div className={styles.lockBox}>
            <div className={styles.lockIconBig}>🔒</div>
            <h2 className={styles.lockedTitle}>
              Գաղտնագրված Նոթ (Protected Vault)
            </h2>
            <p className={styles.lockedText}>
              Այս նոթը պաշտպանված է Master Password-ով: Բովանդակությունը
              տեսնելու համար մուտքագրեք Master Password-ը:
            </p>

            <form onSubmit={handleLocalUnlock} className={styles.unlockForm}>
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
      ) : decryptError ? (
        <div className={styles.decryptErrorNotice}>
          ⚠️ Չհաջողվեց վերծանել նոթի բովանդակությունը: Հնարավոր է մուտքագրված
          Master Password-ը սխալ է:
        </div>
      ) : (
        <div className={styles.workspaceArea}>
          {/* Editor Pane (Shown in 'edit' or 'split') */}
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div
              className={`${styles.editorPane} ${viewMode === 'split' ? styles.paneSplit : ''}`}
            >
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                placeholder="Սկսեք գրել ձեր նոթը այստեղ (Markdown ֆորմատով)..."
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                spellCheck="false"
              />
            </div>
          )}

          {/* Preview Pane (Shown in 'preview' or 'split') */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div
              className={`${styles.previewPane} ${viewMode === 'split' ? styles.paneSplit : ''}`}
            >
              <MarkdownView
                content={content}
                onToggleChecklist={handleToggleChecklist}
              />
            </div>
          )}
        </div>
      )}

      {/* Bottom Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.statItem}>
            {wordsCount} {wordsCount === 1 ? 'բառ' : 'բառ'}
          </span>
          <span className={styles.statusDot}>•</span>
          <span className={styles.statItem}>{charCount} նիշ</span>
          <span className={styles.statusDot}>•</span>
          <span className={styles.statItem}>~{readTimeMin} րոպե ընթերցում</span>
        </div>

        <div className={styles.statusRight}>
          <div className={styles.saveBadge}>
            <span
              className={`${styles.saveDot} ${
                saveStatus === 'saving'
                  ? styles.saveDotSaving
                  : styles.saveDotSaved
              }`}
            />
            <span role="status">
              {saveStatus === 'error'
                ? 'Saving failed. Reconnect and retry.'
                : saveStatus === 'saving'
                  ? 'Պահպանվում է...'
                  : 'Պահպանված է'}
            </span>
            {saveStatus === 'error' && (
              <button
                type="button"
                onClick={() =>
                  triggerAutoSave(
                    title,
                    content,
                    category,
                    tags,
                    encryptionMode,
                    note?.isPinned,
                  )
                }
              >
                Retry save
              </button>
            )}
          </div>

          <span className={styles.lastEdit}>
            {note?.updatedAt
              ? new Date(note.updatedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </span>
        </div>
      </div>
    </div>
  );
};
