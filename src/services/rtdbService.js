import {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  off,
  serverTimestamp,
  onDisconnect,
} from 'firebase/database';
import { rtdb } from '../config/firebase.js';

/**
 * Check if Realtime Database is initialized
 */
export function isRTDBAvailable() {
  return Boolean(rtdb);
}

/**
 * Setup Realtime Database user presence (Online / Offline status with onDisconnect)
 *
 * @param {string} uid - User ID
 * @param {Object} metadata - Additional info (email, displayName, role)
 * @returns {function():void} - Cleanup function
 */
export function setupUserPresence(uid, metadata = {}) {
  if (!uid || !isRTDBAvailable()) return () => {};

  try {
    const connectedRef = ref(rtdb, '.info/connected');
    const userPresenceRef = ref(rtdb, `presence/${uid}`);

    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const isConnected = snapshot.val() === true;
      if (!isConnected) return;

      // When browser disconnects or closes, mark user as offline
      onDisconnect(userPresenceRef)
        .set({
          state: 'offline',
          lastSeen: serverTimestamp(),
          ...metadata,
        })
        .then(() => {
          // When connected, mark user as online
          set(userPresenceRef, {
            state: 'online',
            lastSeen: serverTimestamp(),
            connectedAt: serverTimestamp(),
            ...metadata,
          });
        })
        .catch((err) => {
          console.warn('[RTDB Presence] onDisconnect setup notice:', err.message);
        });
    });

    return () => {
      off(connectedRef);
      // Mark offline on manual cleanup
      set(userPresenceRef, {
        state: 'offline',
        lastSeen: serverTimestamp(),
        ...metadata,
      }).catch(() => {});
    };
  } catch (err) {
    console.warn('[RTDB Presence] Setup notice:', err);
    return () => {};
  }
}

/**
 * Listen to presence status for a given user
 */
export function subscribeUserPresence(uid, onData) {
  if (!uid || !isRTDBAvailable()) return () => {};

  const userPresenceRef = ref(rtdb, `presence/${uid}`);
  return onValue(
    userPresenceRef,
    (snap) => {
      onData(snap.val());
    },
    (err) => {
      console.warn('[RTDB Presence] Read notice:', err.message);
    }
  );
}

/**
 * Broadcast current playing music track in real time across all user's devices
 */
export function broadcastLiveMusicSync(uid, track, isPlaying) {
  if (!uid || !isRTDBAvailable()) return;

  try {
    const liveMusicRef = ref(rtdb, `presence/${uid}/liveMusic`);
    if (!track) {
      set(liveMusicRef, {
        isPlaying: false,
        track: null,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    set(liveMusicRef, {
      isPlaying: Boolean(isPlaying),
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        coverUrl: track.coverUrl || '',
      },
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[RTDB Music] Live broadcast notice:', err.message);
  }
}

/**
 * Subscribe to live music playing status of user
 */
export function subscribeLiveMusicSync(uid, onData) {
  if (!uid || !isRTDBAvailable()) return () => {};

  const liveMusicRef = ref(rtdb, `presence/${uid}/liveMusic`);
  return onValue(liveMusicRef, (snap) => {
    onData(snap.val());
  });
}

/**
 * Listen to Realtime Database live connection state (.info/connected)
 */
export function subscribeRTDBConnection(onConnectionChange) {
  if (!isRTDBAvailable()) {
    onConnectionChange(false);
    return () => {};
  }

  const connectedRef = ref(rtdb, '.info/connected');
  return onValue(connectedRef, (snap) => {
    onConnectionChange(snap.val() === true);
  });
}

/**
 * Generic helper to write data to Realtime Database
 */
export async function writeRTDB(path, data) {
  if (!isRTDBAvailable()) return false;
  try {
    const dataRef = ref(rtdb, path);
    await set(dataRef, data);
    return true;
  } catch (err) {
    console.warn('[RTDB Write] Error at path:', path, err.message);
    return false;
  }
}

/**
 * Generic helper to read data from Realtime Database once
 */
export async function readRTDB(path) {
  if (!isRTDBAvailable()) return null;
  try {
    const dataRef = ref(rtdb, path);
    const snap = await get(dataRef);
    return snap.exists() ? snap.val() : null;
  } catch (err) {
    console.warn('[RTDB Read] Error at path:', path, err.message);
    return null;
  }
}

/**
 * Generic helper to subscribe to Realtime Database path changes
 */
export function subscribeRTDB(path, onData, onError) {
  if (!isRTDBAvailable()) return () => {};
  const dataRef = ref(rtdb, path);
  return onValue(
    dataRef,
    (snap) => {
      onData(snap.exists() ? snap.val() : null);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}
