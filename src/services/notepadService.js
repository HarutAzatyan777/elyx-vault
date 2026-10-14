import { pickPersistedFields, NOTE_FIELDS } from '../utils/persistence.js';
import { isLegacyCiphertext } from '../utils/securePayload.js';
import { subscribeShared } from './sharedSubscriptions.js';
import {
  setDoc,
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
import { auth, db } from '../config/firebase.js';

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
        const cleaned = parsed.filter(
          (record) => record && typeof record.id === 'string',
        );
        if (cleaned.length !== parsed.length) {
          setLocalNotes(uid, cleaned);
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.warn('[Notepad] LocalStorage read failed:');
  }
  return [];
}

/**
 * Save notes to LocalStorage
 */
export function setLocalNotes(uid, notes) {
  try {
    if (!Array.isArray(notes)) return;
    const cleaned = notes
      .filter((record) => record && typeof record.id === 'string')
      .map((note) => pickPersistedFields(note, NOTE_FIELDS));
    localStorage.setItem(getStorageKey(uid), JSON.stringify(cleaned));
    return true;
  } catch (err) {
    console.warn('[Notepad] Local storage unavailable.');
    return false;
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
function subscribeToNotesSource(uid, businessId, onData, onError) {
  const localNotes = getLocalNotes(uid);
  onData(localNotes);

  if (!uid) {
    return () => {};
  }

  try {
    const notesColl = collection(db, 'user_notes');
    const q = query(notesColl, where('uid', '==', uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const remoteNotes = snapshot.docs
          .map((docSnap) => ({
            ...docSnap.data(),
            id: docSnap.id,
          }))
          .filter((record) => record && typeof record.id === 'string');

        // Sort: pinned first, then updatedAt desc
        remoteNotes.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
        });

        // Sync with local storage
        const pending = getLocalNotes(uid).filter((note) => note._pendingCloud);
        const merged = [
          ...pending,
          ...remoteNotes.filter(
            (note) => !pending.some((local) => local.id === note.id),
          ),
        ];
        setLocalNotes(uid, merged);
        onData(merged);
      },
      (error) => {
        console.warn(
          '[Notepad Firestore] Using LocalStorage fallback:',
          error.message,
        );
        if (onError) onError(error);
        onData(error.code === 'permission-denied' ? [] : getLocalNotes(uid));
      },
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
  if (!uid || uid !== auth.currentUser?.uid)
    throw new Error('Sign in to save notes.');
  if (note.isEncrypted && !isLegacyCiphertext(note.content))
    throw new Error('Encrypted notes require ciphertext.');
  const noteId = note.id;
  const now = new Date().toISOString();
  const updatedNote = {
    ...pickPersistedFields(note, NOTE_FIELDS),
    _pendingCloud: true,
    updatedAt: now,
    uid: uid || 'local',
    businessId: note.businessId ?? businessId ?? null,
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
  const cachedLocally = setLocalNotes(uid, nextLocal);

  // 2. Try Firestore if online and uid available
  if (uid) {
    try {
      const noteDocRef = doc(db, 'user_notes', noteId);
      const { _pendingCloud, ...cloudNote } = updatedNote;
      await setDoc(
        noteDocRef,
        { ...cloudNote, createdAt: updatedNote.createdAt || now },
        { merge: true },
      );
      updatedNote._pendingCloud = false;
      setLocalNotes(
        uid,
        getLocalNotes(uid).map((current) =>
          current.id === noteId ? updatedNote : current,
        ),
      );
    } catch (e) {
      // Non-fatal, local storage already contains it
      throw new Error(
        cachedLocally
          ? 'The note is cached locally but cloud saving failed. Reconnect and retry.'
          : 'Saving failed. Storage is unavailable; reconnect and retry.',
      );
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
  const cleanTitle =
    (note.title || 'untitled-note')
      .replace(/[^\w\s\u0531-\u058F-]/gi, '')
      .trim()
      .replace(/\s+/g, '_') || 'note';
  const filename = `${cleanTitle}.${extension}`;

  const blob = new Blob([note.content || ''], {
    type: 'text/plain;charset=utf-8',
  });
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

export function subscribeToNotes(uid, businessId, onData, onError) {
  if (!uid) {
    onData([]);
    return () => {};
  }
  return subscribeShared(
    'subscribeToNotes:' + uid,
    (emit, fail) => subscribeToNotesSource(uid, businessId, emit, fail),
    onData,
    onError,
  );
}
