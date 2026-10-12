import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { uploadMusicFile, deleteFromStorage } from './storageService.js';

export const DEMO_TRACK_IDS = new Set([
  'starter-track-1',
  'starter-track-2',
  'starter-track-3',
  'starter-track-4',
]);

/**
 * Checks if a track item is one of the legacy demo/sample tracks
 */
export function isDemoTrack(track) {
  if (!track) return false;
  const id = String(track.id || '');
  if (DEMO_TRACK_IDS.has(id)) return true;
  if (id.startsWith('starter-track-')) return true;
  const url = String(track.url || '');
  if (url.includes('soundhelix.com')) return true;
  return false;
}

export const INITIAL_DEFAULT_TRACKS = [];

export const MUSIC_GENRES = [
  { id: 'All', label: 'Բոլոր Երգերը (All)', icon: '🎵' },
  { id: 'Favorites', label: 'Սիրված (Favorites)', icon: '⭐' },
  { id: 'Lo-Fi', label: 'Lo-Fi & Focus', icon: '🎧' },
  { id: 'Synthwave', label: 'Synthwave & Cyber', icon: '⚡' },
  { id: 'Ambient', label: 'Ambient & Calm', icon: '🌌' },
  { id: 'Electronic', label: 'Electronic', icon: '🎹' },
  { id: 'Personal', label: 'Անձնական (My Uploads)', icon: '👤' },
];

/* -------------------------------------------------------------------------- */
/* INDEXEDDB FOR LARGE LOCAL AUDIO BLOBS                                      */
/* -------------------------------------------------------------------------- */

const DB_NAME = 'ElyxMusicDB';
const DB_VERSION = 1;
const STORE_NAME = 'audio_blobs';

function openMusicDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioBlob(id, blobOrDataUrl) {
  try {
    const db = await openMusicDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, data: blobOrDataUrl });
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[IndexedDB] Save audio blob error:', err);
  }
}

export async function getAudioBlob(id) {
  try {
    const db = await openMusicDB();
    if (!db) return null;
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result?.data || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[IndexedDB] Get audio blob error:', err);
    return null;
  }
}

export async function deleteAudioBlob(id) {
  try {
    const db = await openMusicDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
  } catch (err) {
    console.warn('[IndexedDB] Delete audio blob error:', err);
  }
}

/* -------------------------------------------------------------------------- */
/* LOCAL STORAGE & FIRESTORE SYNCHRONIZATION                                  */
/* -------------------------------------------------------------------------- */

const LOCAL_STORAGE_KEY_PREFIX = 'elyx_vault_tracks_';

function getStorageKey(uid) {
  return `${LOCAL_STORAGE_KEY_PREFIX}${uid || 'local'}`;
}

export function getLocalTracks(uid) {
  try {
    const raw = localStorage.getItem(getStorageKey(uid));
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((t) => !isDemoTrack(t));
        if (cleaned.length !== parsed.length) {
          setLocalTracks(uid, cleaned);
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.warn('[Music] LocalStorage read notice:', err);
  }
  return [];
}

export function setLocalTracks(uid, tracks) {
  try {
    if (!Array.isArray(tracks)) return;
    const sanitized = tracks
      .filter((t) => !isDemoTrack(t))
      .map((t) => ({
        ...t,
        // Strip huge data URLs from localStorage (stored safely in IndexedDB)
        url: typeof t.url === 'string' && t.url.startsWith('data:') ? '' : t.url,
        coverUrl: typeof t.coverUrl === 'string' && t.coverUrl.startsWith('data:') ? '' : t.coverUrl,
      }));
    localStorage.setItem(getStorageKey(uid), JSON.stringify(sanitized));
  } catch (err) {
    console.warn('[Music] LocalStorage write notice:', err);
  }
}

let isMusicSyncInProgress = false;

/**
 * Sync local/unsynced tracks to Firebase Storage & Cloud Firestore
 */
export async function syncUnsyncedMusicToCloud(uid, businessId, unsyncedTracks = null) {
  if (!uid || isMusicSyncInProgress) return;
  isMusicSyncInProgress = true;

  try {
    const currentLocal = getLocalTracks(uid);
    const tracksToSync = unsyncedTracks && unsyncedTracks.length > 0
      ? unsyncedTracks.filter((t) => !isDemoTrack(t))
      : currentLocal.filter((t) => !isDemoTrack(t) && !t.isCloudSynced);

    if (!tracksToSync.length) return;

    for (const track of tracksToSync) {
      if (isDemoTrack(track)) continue;
      try {
        let binaryBlob = await getAudioBlob(track.id);
        let finalUrl = track.url || '';
        let storagePath = track.storagePath || null;

        const isAlreadyOnStorage = typeof finalUrl === 'string' && finalUrl.includes('firebasestorage.googleapis.com');

        if (!isAlreadyOnStorage && binaryBlob) {
          const uploadRes = await uploadMusicFile({
            file: binaryBlob instanceof Blob ? binaryBlob : null,
            blobData: typeof binaryBlob === 'string' && binaryBlob.startsWith('data:') ? binaryBlob : null,
            uid,
            id: track.id,
            fileName: track.title || 'track',
          });

          if (uploadRes?.downloadUrl) {
            finalUrl = uploadRes.downloadUrl;
            storagePath = uploadRes.storagePath;
          }
        }

        const isCloudUrl = typeof finalUrl === 'string' && finalUrl.startsWith('http');
        const firestoreTrackDoc = {
          id: track.id,
          title: track.title || '',
          artist: track.artist || 'My Audio',
          album: track.album || '',
          genre: track.genre || 'General',
          folderId: track.folderId || null,
          folder: track.folder || null,
          duration: track.duration || 0,
          fileSize: track.fileSize || 0,
          url: isCloudUrl ? finalUrl : (track.url?.startsWith('http') ? track.url : ''),
          coverUrl: typeof track.coverUrl === 'string' && track.coverUrl.startsWith('http') ? track.coverUrl : '',
          isFavorite: Boolean(track.isFavorite),
          isEncrypted: Boolean(track.isEncrypted),
          storagePath: storagePath || null,
          isCloudSynced: Boolean(storagePath || isCloudUrl),
          uid: uid || 'local',
          businessId: businessId || null,
          createdAt: track.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const docRef = doc(db, 'music_vault', track.id);
        await setDoc(docRef, firestoreTrackDoc, { merge: true });

        // Update local tracks state with synced record
        const current = getLocalTracks(uid);
        const updated = current.map((t) => (t.id === track.id ? { ...t, ...firestoreTrackDoc } : t));
        setLocalTracks(uid, updated);
      } catch (trackSyncErr) {
        console.warn(`[Music Cloud Sync] Sync notice for track ${track.id}:`, trackSyncErr.message);
      }
    }
  } finally {
    isMusicSyncInProgress = false;
  }
}

/**
 * Safely delete any legacy demo tracks from Firestore and IndexedDB for the given user
 */
export async function cleanupDemoTracksFromCloud(uid) {
  if (!uid) return 0;
  let deletedCount = 0;
  for (const demoId of DEMO_TRACK_IDS) {
    try {
      const docRef = doc(db, 'music_vault', demoId);
      await deleteDoc(docRef);
      await deleteAudioBlob(demoId);
      deletedCount++;
    } catch {
      // Ignore not found errors
    }
  }
  return deletedCount;
}

/**
 * Subscribe to tracks in realtime (Firestore snapshot is source of truth, no auto-recreation loop)
 */
export function subscribeToMusic(uid, businessId, onData, onError) {
  const localTracks = getLocalTracks(uid);
  onData(localTracks);

  if (!uid) return () => {};

  try {
    const musicColl = collection(db, 'music_vault');
    const q = query(musicColl, where('uid', '==', uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const remoteTracks = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          .filter((t) => !isDemoTrack(t));

        remoteTracks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setLocalTracks(uid, remoteTracks);
        onData(remoteTracks);
      },
      (error) => {
        console.warn('[Music Firestore] Fallback to local storage:', error.message);
        if (onError) onError(error);
        onData(getLocalTracks(uid));
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Music] Setup subscription notice:', err);
    onData(getLocalTracks(uid));
    return () => {};
  }
}


/**
 * Save or update track (Uploads to Firebase Storage if file or audioBlob is provided)
 */
export async function saveTrackItem({
  track,
  file,
  audioBlob,
  uid,
  businessId,
  skipLocalTracksUpdate = false,
  onProgress,
}) {
  const now = new Date().toISOString();
  let finalUrl = track.url || '';
  let storagePath = track.storagePath || null;

  // 1. Upload to Firebase Storage if binary data/file is provided and not already on storage
  const isAlreadyOnStorage = typeof finalUrl === 'string' && finalUrl.includes('firebasestorage.googleapis.com');
  if ((file || audioBlob) && !isAlreadyOnStorage) {
    try {
      const uploadRes = await uploadMusicFile({
        file,
        blobData: audioBlob,
        uid,
        id: track.id,
        fileName: track.title || 'track',
        onProgress,
      });

      if (uploadRes?.downloadUrl) {
        finalUrl = uploadRes.downloadUrl;
        storagePath = uploadRes.storagePath;
      }
    } catch (storageErr) {
      console.warn('[Firebase Storage] Music upload notice, keeping local fallback:', storageErr);
    }
  }

  const trackItem = {
    ...track,
    url: finalUrl,
    storagePath,
    isCloudSynced: Boolean(storagePath || (typeof finalUrl === 'string' && finalUrl.includes('firebasestorage.googleapis.com'))),
    uid: uid || 'local',
    businessId: businessId || null,
    updatedAt: now,
  };

  // 2. If binary blob exists, store in IndexedDB as fast local cache
  if (audioBlob || file) {
    await saveAudioBlob(trackItem.id, audioBlob || file);
  }

  // 3. Local storage update (sanitized)
  if (!skipLocalTracksUpdate) {
    const current = getLocalTracks(uid);
    const exists = current.some((t) => t.id === trackItem.id);
    let next;
    if (exists) {
      next = current.map((t) => (t.id === trackItem.id ? trackItem : t));
    } else {
      next = [trackItem, ...current];
    }
    setLocalTracks(uid, next);
  }

  // 4. Firestore update (ALWAYS sanitize - never write large data: URLs to Firestore)
  if (uid) {
    try {
      const isCloudUrl = typeof trackItem.url === 'string' && trackItem.url.startsWith('http');
      const firestoreTrackDoc = {
        id: trackItem.id,
        title: trackItem.title || '',
        artist: trackItem.artist || 'My Audio',
        album: trackItem.album || '',
        genre: trackItem.genre || 'General',
        folderId: trackItem.folderId || null,
        folder: trackItem.folder || null,
        duration: trackItem.duration || 0,
        fileSize: trackItem.fileSize || 0,
        // ONLY write public HTTP/HTTPS URL, never huge data: URLs
        url: isCloudUrl ? trackItem.url : '',
        coverUrl: typeof trackItem.coverUrl === 'string' && trackItem.coverUrl.startsWith('http') ? trackItem.coverUrl : '',
        isFavorite: Boolean(trackItem.isFavorite),
        isEncrypted: Boolean(trackItem.isEncrypted),
        storagePath: trackItem.storagePath || null,
        isCloudSynced: Boolean(trackItem.storagePath || isCloudUrl),
        uid: uid || 'local',
        businessId: businessId || null,
        createdAt: trackItem.createdAt || now,
        updatedAt: now,
      };

      const docRef = doc(db, 'music_vault', trackItem.id);
      await setDoc(docRef, firestoreTrackDoc, { merge: true });
    } catch (err) {
      console.warn('[Music] Firestore sync notice:', err.message);
    }
  }

  return trackItem;
}

/**
 * Save multiple tracks in batch (Optimized for minimal overhead)
 */
export async function saveBatchTrackItems(batch, uid, businessId, onBatchProgress) {
  const savedTracks = [];
  for (let i = 0; i < batch.length; i++) {
    const { track, file, audioBlob } = batch[i];
    const saved = await saveTrackItem({
      track,
      file,
      audioBlob,
      uid,
      businessId,
      skipLocalTracksUpdate: true,
      onProgress: (percent) => {
        if (typeof onBatchProgress === 'function') {
          onBatchProgress({ index: i, total: batch.length, percent });
        }
      },
    });
    savedTracks.push(saved);
  }

  // Update localStorage once for the entire batch
  const current = getLocalTracks(uid);
  const next = [...savedTracks, ...current.filter((c) => !savedTracks.some((s) => s.id === c.id))];
  setLocalTracks(uid, next);

  return savedTracks;
}

/**
 * Delete track
 */
export async function deleteTrackItem(trackId, uid) {
  const current = getLocalTracks(uid);
  const targetTrack = current.find((t) => t.id === trackId);

  // 1. Delete from Firebase Storage if stored on cloud
  if (targetTrack?.storagePath || (targetTrack?.url && targetTrack.url.includes('firebasestorage.googleapis.com'))) {
    try {
      await deleteFromStorage(targetTrack.storagePath || targetTrack.url);
    } catch (err) {
      console.warn('[Music] Firebase Storage delete notice:', err);
    }
  }

  // 2. Delete from IndexedDB
  await deleteAudioBlob(trackId);

  // 3. Delete from LocalStorage
  const filtered = current.filter((t) => t.id !== trackId);
  setLocalTracks(uid, filtered);

  // 4. Delete from Firestore
  if (uid) {
    try {
      await deleteDoc(doc(db, 'music_vault', trackId));
    } catch (err) {
      console.warn('[Music] Firestore delete notice:', err.message);
    }
  }

  return filtered;
}

/* -------------------------------------------------------------------------- */
/* AUDIO FILE PARSER (FOR DRAG & DROP AND UPLOAD)                             */
/* -------------------------------------------------------------------------- */

export function parseAudioFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || (!file.type?.startsWith('audio/') && !/\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(file.name))) {
      reject(new Error('Ֆայլը չի հանդիսանում աուդիո ֆայլ (MP3, WAV, FLAC, M4A, OGG)'));
      return;
    }

    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const blobUrl = URL.createObjectURL(file);
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const audio = new Audio();
      audio.preload = 'metadata';

      audio.onloadedmetadata = () => {
        resolve({
          file,
          title: cleanTitle,
          artist: 'My Audio',
          duration: Math.round(audio.duration || 0),
          fileSize: file.size,
          blobUrl,
          dataUrl,
          type: file.type || 'audio/mpeg',
        });
      };

      audio.onerror = () => {
        resolve({
          file,
          title: cleanTitle,
          artist: 'My Audio',
          duration: 0,
          fileSize: file.size,
          blobUrl,
          dataUrl,
          type: file.type || 'audio/mpeg',
        });
      };

      audio.src = blobUrl;
    };

    reader.onerror = () => reject(new Error('Ֆայլի ընթերցումը ձախողվեց'));
    reader.readAsDataURL(file);
  });
}

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

export function formatAudioDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function downloadMediaFile(item) {
  const link = document.createElement('a');
  link.href = item.url;
  const cleanName = (item.title || 'track')
    .replace(/[^\w\s\u0531-\u058F-]/gi, '')
    .trim()
    .replace(/\s+/g, '_');
  link.download = `${cleanName}.mp3`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* -------------------------------------------------------------------------- */
/* MUSIC FOLDERS / PLAYLISTS / COLLECTIONS                                     */
/* -------------------------------------------------------------------------- */

export const DEMO_FOLDER_IDS = new Set([
  'folder-favorites',
  'folder-focus',
  'folder-gym',
]);

/**
 * Checks if a folder item is one of the legacy demo folders
 */
export function isDemoFolder(folder) {
  if (!folder) return false;
  const id = String(folder.id || '');
  return DEMO_FOLDER_IDS.has(id);
}

export const INITIAL_DEFAULT_FOLDERS = [];

const FOLDERS_STORAGE_KEY_PREFIX = 'elyx_vault_music_folders_';

function getFoldersStorageKey(uid) {
  return `${FOLDERS_STORAGE_KEY_PREFIX}${uid || 'local'}`;
}

export function getLocalMusicFolders(uid) {
  try {
    const raw = localStorage.getItem(getFoldersStorageKey(uid));
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((f) => !isDemoFolder(f));
        if (cleaned.length !== parsed.length) {
          setLocalMusicFolders(uid, cleaned);
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.warn('[Music Folders] LocalStorage read notice:', err);
  }
  return [];
}

export function setLocalMusicFolders(uid, folders) {
  try {
    if (!Array.isArray(folders)) return;
    const cleaned = folders.filter((f) => !isDemoFolder(f));
    localStorage.setItem(getFoldersStorageKey(uid), JSON.stringify(cleaned));
  } catch (err) {
    console.warn('[Music Folders] LocalStorage write notice:', err);
  }
}

export async function syncUnsyncedMusicFoldersToCloud(uid, businessId, unsyncedFolders = null) {
  if (!uid) return;
  const folders = unsyncedFolders || getLocalMusicFolders(uid);
  for (const f of folders) {
    if (isDemoFolder(f)) continue;
    try {
      const docRef = doc(db, 'music_folders', f.id);
      await setDoc(docRef, { ...f, uid, businessId: businessId || null }, { merge: true });
    } catch (err) {
      console.warn('[Music Folders Cloud Sync] Notice:', err.message);
    }
  }
}

/**
 * Safely delete any legacy demo folders from Firestore for the given user
 */
export async function cleanupDemoFoldersFromCloud(uid) {
  if (!uid) return 0;
  let deletedCount = 0;
  for (const demoId of DEMO_FOLDER_IDS) {
    try {
      await deleteDoc(doc(db, 'music_folders', demoId));
      deletedCount++;
    } catch {
      // Ignore not found errors
    }
  }
  return deletedCount;
}

export function subscribeToMusicFolders(uid, businessId, onData, onError) {
  const local = getLocalMusicFolders(uid);
  onData(local);

  if (!uid) return () => {};

  try {
    const foldersColl = collection(db, 'music_folders');
    const q = query(foldersColl, where('uid', '==', uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const remote = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          .filter((f) => !isDemoFolder(f));

        remote.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setLocalMusicFolders(uid, remote);
        onData(remote);
      },
      (error) => {
        console.warn('[Music Folders] Firestore notice:', error.message);
        if (onError) onError(error);
        onData(getLocalMusicFolders(uid));
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Music Folders] Setup notice:', err);
    onData(getLocalMusicFolders(uid));
    return () => {};
  }
}

export async function saveMusicFolder({ folder, uid, businessId }) {
  const folderRecord = {
    ...folder,
    uid: uid || 'local',
    businessId: businessId || null,
    updatedAt: new Date().toISOString(),
  };

  const current = getLocalMusicFolders(uid);
  const exists = current.some((f) => f.id === folderRecord.id);
  const next = exists
    ? current.map((f) => (f.id === folderRecord.id ? folderRecord : f))
    : [...current, folderRecord];
  setLocalMusicFolders(uid, next);

  if (uid) {
    try {
      const docRef = doc(db, 'music_folders', folderRecord.id);
      await setDoc(docRef, folderRecord, { merge: true });
    } catch (err) {
      console.warn('[Music Folders] Firestore sync notice:', err.message);
    }
  }

  return folderRecord;
}

export async function deleteMusicFolder(folderId, uid) {
  const current = getLocalMusicFolders(uid);
  const filtered = current.filter((f) => f.id !== folderId);
  setLocalMusicFolders(uid, filtered);

  if (uid) {
    try {
      await deleteDoc(doc(db, 'music_folders', folderId));
    } catch (err) {
      console.warn('[Music Folders] Firestore delete notice:', err.message);
    }
  }

  return filtered;
}

/* -------------------------------------------------------------------------- */
/* RECURSIVE DIRECTORY & FILE SCANNER FOR DRAG & DROP FOLDERS                 */
/* -------------------------------------------------------------------------- */

export async function scanDroppedItems(dataTransfer) {
  const items = dataTransfer?.items;
  const result = [];

  const readDirectoryEntries = async (dirReader) => {
    const all = [];
    let entries;
    do {
      entries = await new Promise((resolve) => {
        dirReader.readEntries((batch) => resolve(batch || []), () => resolve([]));
      });
      if (entries && entries.length > 0) {
        all.push(...entries);
      }
    } while (entries && entries.length > 0);
    return all;
  };

  const getFileFromEntry = (fileEntry) => {
    return new Promise((resolve) => {
      fileEntry.file((f) => resolve(f), () => resolve(null));
    });
  };

  const scanEntry = async (entry, folderName = null) => {
    if (!entry) return;
    if (entry.isFile) {
      const file = await getFileFromEntry(entry);
      if (file) {
        result.push({
          file,
          folderName,
          fullPath: entry.fullPath || file.name,
        });
      }
    } else if (entry.isDirectory) {
      const currentFolder = folderName || entry.name;
      const reader = entry.createReader();
      const children = await readDirectoryEntries(reader);
      for (const child of children) {
        await scanEntry(child, currentFolder);
      }
    }
  };

  if (items && items.length > 0) {
    const promises = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (typeof item.webkitGetAsEntry === 'function') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          promises.push(scanEntry(entry, entry.isDirectory ? entry.name : null));
        }
      }
    }
    if (promises.length > 0) {
      await Promise.all(promises);
      if (result.length > 0) return result;
    }
  }

  // Fallback to regular files
  const files = Array.from(dataTransfer?.files || []);
  return files.map((f) => ({
    file: f,
    folderName: null,
    fullPath: f.name,
  }));
}

