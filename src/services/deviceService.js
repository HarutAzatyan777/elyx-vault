import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

/**
 * Real-time subscription to user's registered devices
 */
export function subscribeToDevices(uid, onData, onError) {
  if (!uid) return () => {};
  const q = query(
    collection(db, 'devices'),
    where('uid', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const devices = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      onData(devices);
    },
    onError
  );
}

/**
 * Real-time subscription to security audit events
 */
export function subscribeToSecurityEvents(uid, onData, onError) {
  if (!uid) return () => {};
  const q = query(
    collection(db, 'security_events'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(25)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      onData(events);
    },
    onError
  );
}

/**
 * Registers a new device in Firestore
 */
export async function registerDevice(uid, deviceData) {
  if (!uid) throw new Error('User UID is required');

  const newDevice = {
    uid,
    name: deviceData.name || 'Windows Home PC',
    platform: deviceData.platform || 'win32',
    arch: deviceData.arch || 'x64',
    hostname: deviceData.hostname || 'localhost',
    agentPort: deviceData.agentPort || 9090,
    tailscaleIp: deviceData.tailscaleIp || '127.0.0.1',
    tailscaleDomain: deviceData.tailscaleDomain || '',
    status: 'online',
    enrollmentState: 'approved',
    lastSeenAt: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'devices'), newDevice);
  await logSecurityEvent(uid, 'DEVICE_REGISTERED', `Enrolled new device "${newDevice.name}"`, {
    deviceId: docRef.id,
    platform: newDevice.platform,
  });

  return docRef.id;
}

/**
 * Updates device properties (e.g. rename, status)
 */
export async function updateDevice(uid, deviceId, payload) {
  if (!uid || !deviceId) throw new Error('UID and Device ID are required');

  const updateData = {
    ...payload,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, 'devices', deviceId), updateData);
}

/**
 * Revokes / Deletes a registered device
 */
export async function revokeDevice(uid, deviceId, deviceName) {
  if (!uid || !deviceId) throw new Error('UID and Device ID are required');

  await deleteDoc(doc(db, 'devices', deviceId));
  await logSecurityEvent(uid, 'DEVICE_REVOKED', `Revoked device access for "${deviceName || 'Device'}"`, {
    deviceId,
  });
}

/**
 * Records a security audit event in Firestore
 */
export async function logSecurityEvent(uid, eventType, title, metadata = {}) {
  if (!uid) return;
  try {
    // Sanitize metadata
    const safeMeta = { ...metadata };
    delete safeMeta.password;
    delete safeMeta.token;
    delete safeMeta.input;

    await addDoc(collection(db, 'security_events'), {
      uid,
      type: eventType,
      title,
      metadata: safeMeta,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to log security audit event:', err);
  }
}
