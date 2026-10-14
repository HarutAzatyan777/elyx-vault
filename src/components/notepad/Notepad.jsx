import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { NoteList } from './NoteList';
import { NoteEditor } from './NoteEditor';
import {
  subscribeToNotes,
  saveNoteToStorage,
  deleteNoteFromStorage,
} from '../../services/notepadService';
import styles from './Notepad.module.css';

export const Notepad = ({ masterPassword, onUnlockVault }) => {
  const { user, access } = useAuth();
  const uid = user?.uid;
  const businessId = access?.businessId;

  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(() => {
    try {
      return sessionStorage.getItem('elyx_active_note') || null;
    } catch {
      return null;
    }
  });
  const [toastMessage, setToastMessage] = useState(null);
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);

  useEffect(() => {
    try {
      if (activeNoteId) {
        sessionStorage.setItem('elyx_active_note', activeNoteId);
      }
    } catch {}
  }, [activeNoteId]);

  // Show transient toast
  const showToast = (text, type = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Subscribe to notes
  useEffect(() => {
    const unsub = subscribeToNotes(
      uid,
      businessId,
      (fetchedNotes) => {
        setNotes(fetchedNotes);
        if (fetchedNotes.length > 0) {
          setActiveNoteId((currentId) => {
            const saved = (() => {
              try {
                return sessionStorage.getItem('elyx_active_note');
              } catch {
                return null;
              }
            })();
            const target = currentId || saved;
            if (target && fetchedNotes.some((n) => n.id === target)) {
              return target;
            }
            return fetchedNotes[0].id;
          });
        }
      },
      (err) => {
        console.warn('Real-time notes subscription notice:', err);
      }
    );

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [uid, businessId]);

  // Active note
  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === activeNoteId) || notes[0] || null;
  }, [notes, activeNoteId]);

  // Create new note
  const handleCreateNote = async () => {
    const newId = `note-${Date.now()}`;
    const newNote = {
      id: newId,
      title: 'Նոր Նշում (Untitled)',
      category: 'Ideas',
      tags: [],
      content: '# Նոր Նշում\n\nՍկսեք գրել ձեր մտքերը կամ գործերը այստեղ...',
      isPinned: false,
      isEncrypted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newId);
    setIsMobileListOpen(false);

    await saveNoteToStorage({ note: newNote, uid, businessId });
    showToast('✨ Նոր նոթը ստեղծված է', 'success');
  };

  // Update note
  const handleUpdateNote = async (updatedFields) => {
    const target = notes.find(n => n.id === updatedFields.id);
    if (!target || !masterPassword) return;
    const merged = { ...target, ...updatedFields };

    setNotes((prev) =>
      prev.map((n) => (n.id === merged.id ? merged : n))
    );

    await saveNoteToStorage({ note: merged, uid, businessId });
  };

  // Delete note
  const handleDeleteNote = async (noteId) => {
    const target = notes.find((n) => n.id === noteId);
    const confirmMsg = target?.title
      ? `Վստա՞հ եք, որ ցանկանում եք ջնջել «${target.title}» նոթը:`
      : 'Վստա՞հ եք, որ ցանկանում եք ջնջել այս նոթը:';

    if (!window.confirm(confirmMsg)) return;

    const remaining = notes.filter((n) => n.id !== noteId);
    setNotes(remaining);

    if (activeNoteId === noteId) {
      setActiveNoteId(remaining.length > 0 ? remaining[0].id : null);
    }

    await deleteNoteFromStorage(noteId, uid);
    showToast('🗑️ Նոթը ջնջված է', 'info');
  };

  // Toggle pin
  const handleTogglePin = async (noteId, isPinned) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;

    const updated = { ...target, isPinned };
    const nextNotes = notes.map((n) => (n.id === noteId ? updated : n));

    // Re-sort: pinned first, then updatedAt desc
    nextNotes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

    setNotes(nextNotes);
    await saveNoteToStorage({ note: updated, uid, businessId });
    showToast(isPinned ? '📌 Նոթը ամրացված է վերևում' : 'Հանված է ամրացումից', 'info');
  };

  // Duplicate note
  const handleDuplicateNote = async (sourceNote) => {
    const dupId = `note-${Date.now()}`;
    const duplicated = {
      ...sourceNote,
      id: dupId,
      title: `${sourceNote.title || 'Note'} (Կրկնօրինակ)`,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNotes((prev) => [duplicated, ...prev]);
    setActiveNoteId(dupId);
    setIsMobileListOpen(false);

    await saveNoteToStorage({ note: duplicated, uid, businessId });
    showToast('📑 Նոթի պատճենը ստեղծված է', 'success');
  };

  return (
    <div className={styles.wrapper}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`${styles.toast} ${styles[`toast_${toastMessage.type}`]}`}>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Mobile Bar to toggle list */}
      <div className={styles.mobileBar}>
        <button
          type="button"
          className={styles.mobileListToggleBtn}
          onClick={() => setIsMobileListOpen((prev) => !prev)}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <span>{isMobileListOpen ? 'Փակել Ցանկը' : 'Բացել Նոթերի Ցանկը'}</span>
        </button>

        <button
          type="button"
          className={styles.mobileNewNoteBtn}
          onClick={handleCreateNote}
        >
          + Նոր Նոթ
        </button>
      </div>

      <div className={styles.mainContainer}>
        {/* Left Notes List Sidebar */}
        <div
          className={`${styles.listPane} ${
            isMobileListOpen ? styles.listPaneOpenMobile : ''
          }`}
        >
          <NoteList
            notes={notes}
            activeNoteId={activeNote?.id}
            onSelectNote={(id) => {
              setActiveNoteId(id);
              setIsMobileListOpen(false);
            }}
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
            onTogglePin={handleTogglePin}
            onDuplicateNote={handleDuplicateNote}
          />
        </div>

        {/* Right Editor Area */}
        <div className={styles.editorPane}>
          <NoteEditor
        key={activeNote?.id}
            note={activeNote}
            masterPassword={masterPassword}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onTogglePin={handleTogglePin}
            onUnlockVault={onUnlockVault}
          />
        </div>
      </div>
    </div>
  );
};

export default Notepad;
