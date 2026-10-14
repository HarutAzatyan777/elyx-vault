import { pickPersistedFields, MEDIA_FIELDS } from '../utils/persistence.js';
import { isLegacyCiphertext } from '../utils/securePayload.js';
import { subscribeShared } from './sharedSubscriptions.js';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';
import { uploadMediaFile, deleteFromStorage } from './storageService.js';

export const DEMO_MEDIA_IDS = new Set([
  'starter-media-1',
  'starter-media-2',
  'starter-media-3',
  'starter-media-4',
]);

/**
 * Checks if a media item is one of the legacy demo/sample media items
 */
export function isDemoMedia(item) {
  if (!item) return false;
  const id = String(item.id || '');
  if (DEMO_MEDIA_IDS.has(id)) return true;
  if (id.startsWith('starter-media-')) return true;
  const url = String(item.url || '');
  if (url.includes('ForBiggerBlazes.mp4')) return true;
  return false;
}

export const INITIAL_DEFAULT_MEDIA = [];

export const MEDIA_CATEGORIES = [
  { id: 'All', label: 'Բոլորը (All)', icon: '📁', color: '#ec4899' },
  { id: 'Work', label: 'Աշխատանք (Work)', icon: '💼', color: '#3b82f6' },
  {
    id: 'Clips',
    label: 'Կլիպեր & Վիդեո (Clips)',
    icon: '🎥',
    color: '#8b5cf6',
  },
  { id: 'Assets', label: 'Ռեսուրսներ (Assets)', icon: '🎨', color: '#10b981' },
  {
    id: 'Inspiration',
    label: 'Ինսպիրացիա (Ideas)',
    icon: '💡',
    color: '#f59e0b',
  },
  {
    id: 'Personal',
    label: 'Անձնական (Personal)',
    icon: '👤',
    color: '#06b6d4',
  },
];

/* -------------------------------------------------------------------------- */
/* INDEXEDDB STORAGE FOR LARGE UPLOADED MEDIA BLOBS (NO QUOTA LIMIT)          */
/* -------------------------------------------------------------------------- */

const DB_NAME = 'ElyxMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const dbInstance = e.target.result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMediaBlob(
  id,
  blobOrDataUrl,
  expectedUid = auth.currentUser?.uid,
) {
  try {
    const dbInstance = await openDB();
    if (!dbInstance) return;
    const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const uid = expectedUid;
    if (!uid || uid !== auth.currentUser?.uid) {
      dbInstance.close();
      throw new Error('Sign in to cache files.');
    }
    store.put({ id: `${uid}:${id}`, data: blobOrDataUrl });
    return new Promise((resolve) => {
      tx.oncomplete = () => {
        dbInstance.close();
        resolve(true);
      };
      tx.onerror = () => {
        dbInstance.close();
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('[IndexedDB] Save media blob error:', err);
  }
}

export async function getMediaBlob(id, expectedUid = auth.currentUser?.uid) {
  try {
    const dbInstance = await openDB();
    if (!dbInstance) return null;
    const tx = dbInstance.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const uid = expectedUid;
    if (!uid || uid !== auth.currentUser?.uid) {
      dbInstance.close();
      return null;
    }
    const req = store.get(`${uid}:${id}`);
    return new Promise((resolve) => {
      req.onsuccess = () => {
        if (req.result?.data) {
          resolve(req.result.data);
          return;
        }
        if (
          !getLocalMedia(uid).some(
            (record) => record.id === id && record.uid === uid,
          )
        ) {
          resolve(null);
          return;
        }
        const legacy = store.get(id);
        legacy.onsuccess = () => resolve(legacy.result?.data || null);
        legacy.onerror = () => resolve(null);
      };
      tx.oncomplete = () => dbInstance.close();
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[IndexedDB] Get media blob error:', err);
    return null;
  }
}

export async function deleteMediaBlob(id, expectedUid = auth.currentUser?.uid) {
  try {
    const dbInstance = await openDB();
    if (!dbInstance) return;
    const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const uid = expectedUid;
    if (!uid || uid !== auth.currentUser?.uid) {
      dbInstance.close();
      return;
    }
    store.delete(`${uid}:${id}`);
    tx.oncomplete = () => dbInstance.close();
  } catch (err) {
    console.warn('[IndexedDB] Delete media blob error:', err);
  }
}

/* -------------------------------------------------------------------------- */
/* METADATA PERSISTENCE (LOCAL STORAGE & FIRESTORE)                           */
/* -------------------------------------------------------------------------- */

const LOCAL_STORAGE_KEY_PREFIX = 'elyx_vault_media_';

function getStorageKey(uid) {
  return `${LOCAL_STORAGE_KEY_PREFIX}${uid || 'local'}`;
}

export function getLocalMedia(uid) {
  try {
    const raw = localStorage.getItem(getStorageKey(uid));
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(
          (record) => record && typeof record.id === 'string',
        );
        if (cleaned.length !== parsed.length) {
          setLocalMedia(uid, cleaned);
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.warn('[Media] LocalStorage read notice:');
  }
  return [];
}

export function setLocalMedia(uid, items) {
  try {
    if (!Array.isArray(items)) return;
    const sanitized = items
      .filter((record) => record && typeof record.id === 'string')
      .map((m) => ({
        ...pickPersistedFields(m, MEDIA_FIELDS),
        // Strip base64 data URLs from localStorage (already in IndexedDB)
        url:
          m._encryptedLocalPayload ||
          (typeof m.url === 'string' && /^(data:|blob:)/.test(m.url))
            ? ''
            : m.url,
        thumbnailUrl:
          m._encryptedLocalPayload ||
          (typeof m.thumbnailUrl === 'string' &&
            /^(data:|blob:)/.test(m.thumbnailUrl))
            ? ''
            : m.thumbnailUrl,
      }));
    localStorage.setItem(getStorageKey(uid), JSON.stringify(sanitized));
    return true;
  } catch (err) {
    console.warn('[Media] LocalStorage write notice:');
    return false;
  }
}

let isMediaSyncInProgress = false;

/**
 * Sync local/unsynced media items (photos & videos) to Firebase Storage & Cloud Firestore
 */
export async function syncUnsyncedMediaToCloud(
  uid,
  businessId,
  unsyncedItems = null,
) {
  if (!uid || isMediaSyncInProgress) return;
  isMediaSyncInProgress = true;

  try {
    const currentLocal = getLocalMedia(uid);
    const itemsToSync =
      unsyncedItems && unsyncedItems.length > 0
        ? unsyncedItems.filter(
            (record) => record && typeof record.id === 'string',
          )
        : currentLocal.filter((m) => !isDemoMedia(m) && !m.isCloudSynced);

    if (!itemsToSync.length) return;

    for (const item of itemsToSync) {
      if (item.isEncrypted)
        throw new Error(
          'Encrypted binary cloud sync is unavailable. Existing data was left intact.',
        );
      try {
        let binaryBlob = await getMediaBlob(item.id, uid);
        let finalUrl = item.url || '';
        let finalThumbnail = item.thumbnailUrl || '';
        let storagePath = item.storagePath || null;

        const isAlreadyOnStorage =
          typeof finalUrl === 'string' &&
          finalUrl.includes('firebasestorage.googleapis.com');

        if (!isAlreadyOnStorage && binaryBlob) {
          const uploadRes = await uploadMediaFile({
            file: binaryBlob instanceof Blob ? binaryBlob : null,
            blobData:
              typeof binaryBlob === 'string' && binaryBlob.startsWith('data:')
                ? binaryBlob
                : null,
            uid,
            id: item.id,
            fileName: item.title,
            type: item.type || 'image',
          });

          if (uploadRes?.downloadUrl) {
            finalUrl = uploadRes.downloadUrl;
            storagePath = uploadRes.storagePath;
            if (item.type === 'image') {
              finalThumbnail = uploadRes.downloadUrl;
            }
          }
        }

        const isCloudUrl =
          typeof finalUrl === 'string' && finalUrl.startsWith('http');
        const firestoreMediaDoc = {
          id: item.id,
          title: item.title || '',
          description: item.description || '',
          type: item.type || 'image',
          url: isCloudUrl
            ? finalUrl
            : item.url?.startsWith('http')
              ? item.url
              : '',
          thumbnailUrl:
            typeof finalThumbnail === 'string' &&
            finalThumbnail.startsWith('http')
              ? finalThumbnail
              : '',
          category: item.category || 'Assets',
          tags: item.tags || [],
          isFavorite: Boolean(item.isFavorite),
          isEncrypted: Boolean(item.isEncrypted),
          fileSize: item.fileSize || 0,
          dimensions: item.dimensions || null,
          duration: item.duration || 0,
          storagePath: storagePath || null,
          isCloudSynced: Boolean(storagePath || isCloudUrl),
          uid: uid || 'local',
          businessId: businessId || null,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const docRef = doc(db, 'media_vault', item.id);
        await setDoc(docRef, firestoreMediaDoc, { merge: true });

        const current = getLocalMedia(uid);
        const updated = current.map((m) =>
          m.id === item.id ? { ...m, ...firestoreMediaDoc } : m,
        );
        setLocalMedia(uid, updated);
      } catch (mediaSyncErr) {
        console.warn(
          `[Media Cloud Sync] Sync failed for item ${item.id}:`,
          mediaSyncErr.message,
        );
      }
    }
  } finally {
    isMediaSyncInProgress = false;
  }
}

/**
 * Safely delete any legacy demo media from Firestore and IndexedDB for the given user
 */
export async function cleanupDemoMediaFromCloud(uid) {
  if (!uid) return 0;
  let deletedCount = 0;
  for (const demoId of DEMO_MEDIA_IDS) {
    try {
      const docRef = doc(db, 'media_vault', demoId);
      await deleteDoc(docRef);
      await deleteMediaBlob(demoId);
      deletedCount++;
    } catch {
      // Ignore not found errors
    }
  }
  return deletedCount;
}

/**
 * Realtime subscription to media collection (Firestore is source of truth, no auto-recreation loop)
 */
function subscribeToMediaSource(uid, businessId, onData, onError) {
  const localItems = getLocalMedia(uid);
  onData(localItems);

  if (!uid) return () => {};

  try {
    const mediaColl = collection(db, 'media_vault');
    const q = query(mediaColl, where('uid', '==', uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const remoteItems = snapshot.docs
          .map((docSnap) => ({
            ...docSnap.data(),
            id: docSnap.id,
          }))
          .filter((item) => !isDemoMedia(item));

        remoteItems.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
        );
        const localOnly = getLocalMedia(uid).filter(
          (m) => m._encryptedLocalPayload,
        );
        const merged = [
          ...localOnly,
          ...remoteItems.filter((m) => !localOnly.some((l) => l.id === m.id)),
        ];
        setLocalMedia(uid, merged);
        onData(merged);
      },
      (error) => {
        console.warn(
          '[Media Firestore] Fallback to local storage:',
          error.message,
        );
        if (onError) onError(error);
        onData(error.code === 'permission-denied' ? [] : getLocalMedia(uid));
      },
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Media] Setup subscription notice:', err);
    onData(getLocalMedia(uid));
    return () => {};
  }
}

/**
 * Save new or updated media item (Uploads to Firebase Storage if file or blobData is provided)
 */
export async function saveMediaItem({
  item,
  file,
  blobData,
  uid,
  businessId,
  skipLocalMediaUpdate = false,
  onProgress,
}) {
  if (!uid || uid !== auth.currentUser?.uid)
    throw new Error('Sign in to save files.');
  if (
    item.isEncrypted &&
    !item._encryptedLocalPayload &&
    !isLegacyCiphertext(item.url)
  )
    throw new Error('Encrypted records require ciphertext.');
  const encryptedBinary = Boolean(item.isEncrypted && (file || blobData));
  const now = new Date().toISOString();
  let finalUrl = item.url || '';
  let finalThumbnail = item.thumbnailUrl || '';
  let storagePath = item.storagePath || null;

  // 1. Upload to Firebase Storage if binary data/file is provided and not already on storage
  const isAlreadyOnStorage =
    typeof finalUrl === 'string' &&
    finalUrl.includes('firebasestorage.googleapis.com');
  if (!item.isEncrypted && (file || blobData) && !isAlreadyOnStorage) {
    try {
      const uploadRes = await uploadMediaFile({
        file,
        blobData,
        uid,
        id: item.id,
        fileName: item.title || 'media',
        type: item.type,
        onProgress,
      });

      if (uploadRes?.downloadUrl) {
        finalUrl = uploadRes.downloadUrl;
        storagePath = uploadRes.storagePath;
        if (
          item.type === 'image' &&
          (!finalThumbnail || finalThumbnail.startsWith('data:'))
        ) {
          finalThumbnail = uploadRes.downloadUrl;
        }
      }
    } catch (storageErr) {
      console.warn(
        '[Firebase Storage] Media upload notice, keeping local fallback:',
        storageErr,
      );
    }
  }

  if (uid !== auth.currentUser?.uid)
    throw new Error('Your session changed. Retry after signing in.');
  const mediaItem = {
    ...pickPersistedFields(item, MEDIA_FIELDS),
    _encryptedLocalPayload: Boolean(
      item._encryptedLocalPayload || encryptedBinary,
    ),
    url: finalUrl,
    thumbnailUrl: finalThumbnail,
    storagePath,
    isCloudSynced: Boolean(
      storagePath ||
        (typeof finalUrl === 'string' &&
          finalUrl.includes('firebasestorage.googleapis.com')),
    ),
    uid: uid || 'local',
    businessId: item.businessId ?? businessId ?? null,
    updatedAt: now,
  };

  // 2. If binary blob exists, store in IndexedDB as fast local cache
  if (blobData || file) {
    const cached = await saveMediaBlob(
      mediaItem.id,
      item.isEncrypted ? item.url : blobData || file,
      uid,
    );
    if (item.isEncrypted && !cached)
      throw new Error(
        'Encrypted local storage is unavailable. Nothing was saved.',
      );
  }

  // 3. Update LocalStorage metadata (sanitized)
  if (!skipLocalMediaUpdate) {
    const current = getLocalMedia(uid);
    const exists = current.some((m) => m.id === mediaItem.id);
    let next;
    if (exists) {
      next = current.map((m) => (m.id === mediaItem.id ? mediaItem : m));
    } else {
      next = [mediaItem, ...current];
    }
    setLocalMedia(uid, next);
  }

  // 4. Sync metadata to Firestore (ALWAYS sanitize - never write large data: URLs to Firestore)
  if (uid && !mediaItem._encryptedLocalPayload) {
    try {
      const isCloudUrl =
        typeof mediaItem.url === 'string' && mediaItem.url.startsWith('http');
      const firestoreMediaDoc = {
        id: mediaItem.id,
        title: mediaItem.title || '',
        description: mediaItem.description || '',
        type: mediaItem.type || 'image',
        // ONLY write public HTTP/HTTPS URL, never huge data: URLs
        url: mediaItem.isEncrypted
          ? mediaItem.url
          : isCloudUrl
            ? mediaItem.url
            : '',
        thumbnailUrl: mediaItem.isEncrypted
          ? mediaItem.thumbnailUrl
          : typeof mediaItem.thumbnailUrl === 'string' &&
              mediaItem.thumbnailUrl.startsWith('http')
            ? mediaItem.thumbnailUrl
            : '',
        category: mediaItem.category || 'Assets',
        tags: mediaItem.tags || [],
        isFavorite: Boolean(mediaItem.isFavorite),
        isEncrypted: Boolean(mediaItem.isEncrypted),
        fileSize: mediaItem.fileSize || 0,
        dimensions: mediaItem.dimensions || null,
        duration: mediaItem.duration || 0,
        storagePath: mediaItem.storagePath || null,
        isCloudSynced: Boolean(mediaItem.storagePath || isCloudUrl),
        uid: uid || 'local',
        businessId: businessId || null,
        createdAt: mediaItem.createdAt || now,
        updatedAt: now,
      };

      const docRef = doc(db, 'media_vault', mediaItem.id);
      await setDoc(docRef, firestoreMediaDoc, { merge: true });
    } catch (err) {
      console.warn('[Media] Firestore sync notice:', err.message);
    }
  }

  return mediaItem;
}

/**
 * Save multiple media items in batch (Optimized for minimal overhead)
 */
export async function saveBatchMediaItems(
  batch,
  uid,
  businessId,
  onBatchProgress,
) {
  const savedItems = [];
  try {
    for (let i = 0; i < batch.length; i++) {
      const { item, file, blobData } = batch[i];
      const saved = await saveMediaItem({
        item,
        file,
        blobData,
        uid,
        businessId,
        skipLocalMediaUpdate: true,
        onProgress: (percent) => {
          if (typeof onBatchProgress === 'function') {
            onBatchProgress({ index: i, total: batch.length, percent });
          }
        },
      });
      savedItems.push(saved);
    }
  } finally {
    // Update localStorage once for the entire batch
    const current = getLocalMedia(uid);
    const next = [
      ...savedItems,
      ...current.filter((c) => !savedItems.some((s) => s.id === c.id)),
    ];
    if (
      savedItems.length &&
      !setLocalMedia(uid, next) &&
      savedItems.some((record) => record._encryptedLocalPayload)
    )
      throw new Error(
        'Encrypted file metadata could not be saved. Check browser storage and retry.',
      );
  }
  return savedItems;
}

/**
 * Parse image or video file for batch import
 */
export function parseMediaFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Ֆայլը բացակայում է'));
      return;
    }
    const isVideo =
      file.type.startsWith('video/') ||
      /\.(mp4|webm|mov|ogg)$/i.test(file.name);
    const isImage =
      file.type.startsWith('image/') ||
      /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file.name);

    if (!isImage && !isVideo) {
      reject(new Error('Խնդրում ենք ընտրել միայն նկար կամ վիդեո ֆայլ:'));
      return;
    }

    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const blobUrl = URL.createObjectURL(file);
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (isImage) {
        const img = new Image();
        img.onload = () => {
          resolve({
            file,
            title: cleanTitle,
            type: 'image',
            fileSize: file.size,
            dimensions: `${img.width}x${img.height}`,
            duration: 0,
            blobUrl,
            dataUrl,
            thumbnailUrl: blobUrl,
          });
        };
        img.onerror = () => {
          resolve({
            file,
            title: cleanTitle,
            type: 'image',
            fileSize: file.size,
            dimensions: null,
            duration: 0,
            blobUrl,
            dataUrl,
            thumbnailUrl: blobUrl,
          });
        };
        img.src = blobUrl;
      } else {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          resolve({
            file,
            title: cleanTitle,
            type: 'video',
            fileSize: file.size,
            dimensions: `${video.videoWidth}x${video.videoHeight}`,
            duration: Math.round(video.duration || 0),
            blobUrl,
            dataUrl,
            thumbnailUrl: '',
          });
        };
        video.onerror = () => {
          resolve({
            file,
            title: cleanTitle,
            type: 'video',
            fileSize: file.size,
            dimensions: null,
            duration: 0,
            blobUrl,
            dataUrl,
            thumbnailUrl: '',
          });
        };
        video.src = blobUrl;
      }
    };
    reader.onerror = () => reject(new Error('Ֆայլի ընթերցումը ձախողվեց:'));
    reader.readAsDataURL(file);
  });
}

/**
 * Delete a media item
 */
export async function deleteMediaItem(mediaId, uid) {
  const current = getLocalMedia(uid);
  const targetItem = current.find((m) => m.id === mediaId);

  // 1. Delete from Firebase Storage if stored on cloud
  if (
    targetItem?.storagePath ||
    (targetItem?.url &&
      targetItem.url.includes('firebasestorage.googleapis.com'))
  ) {
    try {
      await deleteFromStorage(targetItem.storagePath || targetItem.url);
    } catch (err) {
      console.warn('[Media] Firebase Storage delete notice:', err);
    }
  }

  // 2. Delete from IndexedDB
  await deleteMediaBlob(mediaId);

  // 3. Delete from LocalStorage
  const filtered = current.filter((m) => m.id !== mediaId);
  setLocalMedia(uid, filtered);

  // 4. Delete from Firestore
  if (uid) {
    try {
      await deleteDoc(doc(db, 'media_vault', mediaId));
    } catch (err) {
      console.warn('[Media] Firestore delete notice:', err.message);
    }
  }

  return filtered;
}

/* -------------------------------------------------------------------------- */
/* UTILITIES (FORMATTING, YOUTUBE DETECTION, FILE DOWNLOAD)                   */
/* -------------------------------------------------------------------------- */

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function parseYouTubeVideoId(url) {
  if (!url) return null;
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function downloadMediaFile(item) {
  const link = document.createElement('a');
  link.href = item.url;
  const extension = item.type === 'video' ? 'mp4' : 'jpg';
  const cleanName = (item.title || 'media')
    .replace(/[^\w\s\u0531-\u058F-]/gi, '')
    .trim()
    .replace(/\s+/g, '_');
  link.download = `${cleanName}.${extension}`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function subscribeToMedia(uid, businessId, onData, onError) {
  if (!uid) {
    onData([]);
    return () => {};
  }
  return subscribeShared(
    'subscribeToMedia:' + uid,
    (emit, fail) => subscribeToMediaSource(uid, businessId, emit, fail),
    onData,
    onError,
  );
}
