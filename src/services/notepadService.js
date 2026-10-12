import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

export const DEMO_NOTE_IDS = new Set([
  'starter-welcome',
  'starter-tasks',
  'starter-secure',
  'starter-code',
]);

/**
 * Checks if a note is one of the legacy demo/sample notes
 */
export function isDemoNote(note) {
  if (!note) return false;
  const id = String(note.id || '');
  return DEMO_NOTE_IDS.has(id) || id.startsWith('starter-');
}

export const INITIAL_DEFAULT_NOTES = [];

const LOCAL_STORAGE_KEY_PREFIX = 'elyx_vault_notes_';

/**
 * Returns local storage key for a user
 */
function getStorageKey(uid) {
  return `${LOCAL_STORAGE_KEY_PREFIX}${uid || 'local'}`;
}

/**
 * Load notes from LocalStorage
 */
export function getLocalNotes(uid) {
  try {
    const raw = localStorage.getItem(getStorageKey(uid));
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((n) => !isDemoNote(n));
        if (cleaned.length !== parsed.length) {
          setLocalNotes(uid, cleaned);
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.warn('[Notepad] LocalStorage read failed:', err);
  }
  return [];
}

/**
 * Save notes to LocalStorage
 */
export function setLocalNotes(uid, notes) {
  try {
    if (!Array.isArray(notes)) return;
    const cleaned = notes.filter((n) => !isDemoNote(n));
    localStorage.setItem(getStorageKey(uid), JSON.stringify(cleaned));
  } catch (err) {
    console.warn('[Notepad] LocalStorage write failed:', err);
  }
}

/**
 * Safely delete any legacy demo notes from Firestore for the given user
 */
export async function cleanupDemoNotesFromCloud(uid) {
  if (!uid) return 0;
  let deletedCount = 0;
  for (const demoId of DEMO_NOTE_IDS) {
    try {
      await deleteDoc(doc(db, 'user_notes', demoId));
      deletedCount++;
    } catch {}
  }
  return deletedCount;
}

/**
 * Subscribe to user notes (Firestore with transparent LocalStorage sync & fallback)
 */
export function subscribeToNotes(uid, businessId, onData, onError) {
  const localNotes = getLocalNotes(uid);
  onData(localNotes);

  if (!uid) {
    return () => {};
  }

  try {
    const notesColl = collection(db, 'user_notes');
    const q = query(
      notesColl,
      where('uid', '==', uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setLocalNotes(uid, []);
          onData([]);
          return;
        }

        const remoteNotes = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          .filter((n) => !isDemoNote(n));

        // Sort: pinned first, then updatedAt desc
        remoteNotes.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
        });

        // Sync with local storage
        setLocalNotes(uid, remoteNotes);
        onData(remoteNotes);
      },
      (error) => {
        console.warn('[Notepad Firestore] Using LocalStorage fallback:', error.message);
        if (onError) onError(error);
        onData(getLocalNotes(uid));
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Notepad] Firestore subscription setup error:', err);
    onData(getLocalNotes(uid));
    return () => {};
  }
}

/**
 * Save or update a note
 */
export async function saveNoteToStorage({ note, uid, businessId }) {
  const noteId = note.id;
  const now = new Date().toISOString();
  const updatedNote = {
    ...note,
    updatedAt: now,
    uid: uid || 'local',
    businessId: businessId || null,
  };

  // 1. Update in LocalStorage first for instant UI response
  const currentLocal = getLocalNotes(uid);
  const exists = currentLocal.some((n) => n.id === noteId);
  let nextLocal;

  if (exists) {
    nextLocal = currentLocal.map((n) => (n.id === noteId ? updatedNote : n));
  } else {
    nextLocal = [updatedNote, ...currentLocal];
  }
  setLocalNotes(uid, nextLocal);

  // 2. Try Firestore if online and uid available
  if (uid) {
    try {
      const noteDocRef = doc(db, 'user_notes', noteId);
      await updateDoc(noteDocRef, {
        title: updatedNote.title,
        content: updatedNote.content,
        category: updatedNote.category,
        tags: updatedNote.tags || [],
        isPinned: Boolean(updatedNote.isPinned),
        isEncrypted: Boolean(updatedNote.isEncrypted),
        updatedAt: now,
      }).catch(async (err) => {
        // If doc doesn't exist, try setDoc or addDoc
        if (err.code === 'not-found') {
          await addDoc(collection(db, 'user_notes'), {
            ...updatedNote,
            createdAt: updatedNote.createdAt || now,
          });
        }
      });
    } catch (e) {
      // Non-fatal, local storage already contains it
      console.warn('[Notepad] Firestore sync notice:', e.message);
    }
  }

  return updatedNote;
}

/**
 * Delete a note
 */
export async function deleteNoteFromStorage(noteId, uid) {
  // 1. Remove from LocalStorage
  const currentLocal = getLocalNotes(uid);
  const filtered = currentLocal.filter((n) => n.id !== noteId);
  setLocalNotes(uid, filtered);

  // 2. Remove from Firestore if possible
  if (uid) {
    try {
      await deleteDoc(doc(db, 'user_notes', noteId));
    } catch (err) {
      console.warn('[Notepad] Firestore delete notice:', err.message);
    }
  }

  return filtered;
}

/**
 * Export note as Markdown (.md) or Text (.txt)
 */
export function downloadNoteFile(note, format = 'markdown') {
  const extension = format === 'markdown' ? 'md' : 'txt';
  const cleanTitle = (note.title || 'untitled-note')
    .replace(/[^\w\s\u0531-\u058F-]/gi, '')
    .trim()
    .replace(/\s+/g, '_') || 'note';
  const filename = `${cleanTitle}.${extension}`;

  const blob = new Blob([note.content || ''], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyTextToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  // Fallback
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch (err) {
    document.body.removeChild(textarea);
    return false;
  }
}
