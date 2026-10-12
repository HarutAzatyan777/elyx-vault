import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '../config/firebase.js';

/**
 * Convert data: URL string (Base64) to a standard Blob
 * @param {string} dataUrl
 * @returns {Blob}
 */
export function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(parts[1]);
    const len = binary.length;
    const u8arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      u8arr[i] = binary.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.warn('[Storage] dataUrlToBlob conversion error:', err);
    return null;
  }
}

/**
 * Check if Firebase Storage is initialized and available
 */
export function isStorageConfigured() {
  return Boolean(storage);
}

/**
 * Sanitize file name for safe Firebase Storage path
 */
function sanitizeFileName(name) {
  if (!name) return 'file';
  return name
    .replace(/[^\w\s\u0531-\u058F.-]/gi, '_')
    .trim()
    .replace(/\s+/g, '_');
}

/**
 * Upload a File or Blob or dataURL to Firebase Storage
 *
 * @param {Object} options
 * @param {File|Blob} [options.file] - Raw browser File or Blob
 * @param {string} [options.blobData] - data: URL fallback string
 * @param {string} options.path - Firebase Storage path (e.g. 'media/uid/xyz.jpg')
 * @param {string} [options.contentType] - Optional MIME type override
 * @param {function(number):void} [options.onProgress] - Progress callback (0 - 100)
 * @returns {Promise<{ downloadUrl: string, storagePath: string, size: number } | null>}
 */
export async function uploadFileToStorage({
  file,
  blobData,
  path,
  contentType,
  onProgress,
}) {
  if (!isStorageConfigured()) {
    console.warn('[Firebase Storage] Storage is not configured. Falling back to local.');
    return null;
  }

  // Determine the Blob to upload
  let targetBlob = null;
  if (file instanceof Blob || (typeof File !== 'undefined' && file instanceof File)) {
    targetBlob = file;
  } else if (blobData && typeof blobData === 'string' && blobData.startsWith('data:')) {
    targetBlob = dataUrlToBlob(blobData);
  }

  if (!targetBlob) {
    console.warn('[Firebase Storage] No valid Blob or File found for upload.');
    return null;
  }

  const storageRef = ref(storage, path);
  const metadata = {
    contentType: contentType || targetBlob.type || 'application/octet-stream',
  };

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, targetBlob, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && typeof onProgress === 'function') {
          const percent = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          onProgress(percent);
        }
      },
      (error) => {
        if (error.code === 'storage/unauthorized') {
          console.warn(
            '[Firebase Storage] Permission denied (storage/unauthorized). Խնդրում ենք Firebase Console -> Storage -> Rules բաժնում ստուգել կանոնները (allow read, write: if true; կամ request.auth != null;).'
          );
        } else {
          console.warn('[Firebase Storage] Upload failed for path:', path, error.code || error.message);
        }
        resolve(null);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (typeof onProgress === 'function') {
            onProgress(100);
          }
          resolve({
            downloadUrl,
            storagePath: path,
            size: targetBlob.size,
          });
        } catch (urlErr) {
          console.warn('[Firebase Storage] Failed to get download URL:', urlErr);
          resolve(null);
        }
      }
    );
  });
}

/**
 * Upload media item (image or video) to Firebase Storage
 */
export async function uploadMediaFile({
  file,
  blobData,
  uid,
  id,
  fileName,
  type = 'image',
  onProgress,
}) {
  const cleanName = sanitizeFileName(fileName || (type === 'video' ? 'clip.mp4' : 'photo.jpg'));
  const safeUid = uid || 'public';
  const path = `media/${safeUid}/${id}_${cleanName}`;
  const contentType = file?.type || (type === 'video' ? 'video/mp4' : 'image/jpeg');

  return uploadFileToStorage({
    file,
    blobData,
    path,
    contentType,
    onProgress,
  });
}

/**
 * Upload audio track to Firebase Storage
 */
export async function uploadMusicFile({
  file,
  blobData,
  uid,
  id,
  fileName,
  onProgress,
}) {
  let cleanName = sanitizeFileName(fileName || 'track.mp3');
  if (!/\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(cleanName)) {
    cleanName = `${cleanName}.mp3`;
  }
  const safeUid = uid || 'public';
  const path = `music/${safeUid}/${id}_${cleanName}`;
  const contentType = file?.type || 'audio/mpeg';

  return uploadFileToStorage({
    file,
    blobData,
    path,
    contentType,
    onProgress,
  });
}

/**
 * Delete a file from Firebase Storage by path or URL
 * @param {string} pathOrUrl
 * @returns {Promise<boolean>}
 */
export async function deleteFromStorage(pathOrUrl) {
  if (!pathOrUrl || !isStorageConfigured()) {
    return false;
  }

  // Only attempt deletion for Firebase Storage paths or download URLs
  const isStorageItem =
    pathOrUrl.startsWith('media/') ||
    pathOrUrl.startsWith('music/') ||
    pathOrUrl.includes('firebasestorage.googleapis.com');

  if (!isStorageItem) {
    return false;
  }

  try {
    const fileRef = ref(storage, pathOrUrl);
    await deleteObject(fileRef);
    return true;
  } catch (err) {
    // If already removed or not found, don't throw
    console.warn('[Firebase Storage] Delete notice:', err.message);
    return false;
  }
}
