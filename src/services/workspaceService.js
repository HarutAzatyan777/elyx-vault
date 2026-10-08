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
import { sanitizeUrl, sanitizeUrlForLog } from '../utils/workspaceValidation.js';

// Default presets seed data
export const DEFAULT_PRESETS = [
  {
    name: 'Development',
    description: 'Core dev tools, GitHub repos, Firebase console & local dev environment.',
    icon: 'code',
    color: '#8b5cf6', // Violet
    urls: [
      'https://github.com',
      'https://console.firebase.google.com',
      'http://localhost:5173',
      'https://developer.mozilla.org',
    ],
    accountLabel: 'Dev Profile',
    isFavorite: true,
  },
  {
    name: 'Elyx Business',
    description: 'Corporate tools, business analytics, Google services & client portals.',
    icon: 'briefcase',
    color: '#3b82f6', // Blue
    urls: [
      'https://console.firebase.google.com',
      'https://business.google.com',
      'https://mail.google.com',
    ],
    accountLabel: 'Elyx Admin Account',
    isFavorite: true,
  },
  {
    name: 'Minecraft Admin',
    description: 'Server management panels, monitoring, plugin docs & stats.',
    icon: 'server',
    color: '#10b981', // Emerald
    urls: [
      'https://panel.aternos.org',
      'https://minecraft.fandom.com/wiki/Minecraft_Wiki',
      'https://mcsrvstat.us',
    ],
    accountLabel: 'Minecraft Ops',
    isFavorite: false,
  },
  {
    name: 'Marketing',
    description: 'Social platforms, search engine console, branding & traffic metrics.',
    icon: 'chart',
    color: '#f59e0b', // Amber
    urls: [
      'https://business.facebook.com',
      'https://instagram.com',
      'https://search.google.com/search-console',
      'https://analytics.google.com',
    ],
    accountLabel: 'Marketing Account',
    isFavorite: false,
  },
];

export const DEFAULT_FAVORITE_LINKS = [
  {
    title: 'GitHub Repositories',
    url: 'https://github.com',
    category: 'Dev Tools',
    description: 'Source code management and PR reviews.',
  },
  {
    title: 'Firebase Console',
    url: 'https://console.firebase.google.com',
    category: 'Dev Tools',
    description: 'Database and auth administration.',
  },
  {
    title: 'Localhost Web App',
    url: 'http://localhost:5173',
    category: 'Dev Tools',
    description: 'Vite development server live preview.',
  },
  {
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org',
    category: 'Documentation',
    description: 'Web technology reference and APIs.',
  },
  {
    title: 'Google Search Console',
    url: 'https://search.google.com/search-console',
    category: 'Analytics',
    description: 'Search performance monitoring.',
  },
];

/* -------------------------------------------------------------------------- */
/* REALTIME LISTENERS                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Subscribe to user's workspace presets in real-time
 */
export function subscribeToPresets(uid, onData, onError) {
  if (!uid) return () => {};
  const q = query(
    collection(db, 'workspace_presets'),
    where('uid', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const presets = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      onData(presets);
    },
    onError
  );
}

/**
 * Subscribe to user's favorite links in real-time
 */
export function subscribeToLinks(uid, onData, onError) {
  if (!uid) return () => {};
  const q = query(
    collection(db, 'workspace_links'),
    where('uid', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const links = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      onData(links);
    },
    onError
  );
}

/**
 * Subscribe to user's recent activity logs in real-time (last 20 logs)
 */
export function subscribeToActivity(uid, onData, onError) {
  if (!uid) return () => {};
  const q = query(
    collection(db, 'workspace_activity'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const activities = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      onData(activities);
    },
    onError
  );
}

/**
 * Subscribe to user's active workspace session
 */
export function subscribeToActiveSession(uid, onData, onError) {
  if (!uid) return () => {};
  const q = query(
    collection(db, 'workspace_sessions'),
    where('uid', '==', uid),
    where('status', '==', 'active'),
    limit(1)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onData(null);
      } else {
        const docSnap = snapshot.docs[0];
        onData({ id: docSnap.id, ...docSnap.data() });
      }
    },
    onError
  );
}

/* -------------------------------------------------------------------------- */
/* MUTATIONS & CRUD                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Seed initial default presets and links for a new user if none exist
 */
export async function seedDefaultsIfEmpty(uid) {
  if (!uid) return;
  try {
    const presetsRef = collection(db, 'workspace_presets');
    const linksRef = collection(db, 'workspace_links');

    // Create default presets
    for (const preset of DEFAULT_PRESETS) {
      await addDoc(presetsRef, {
        ...preset,
        uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Create default favorite links
    for (const link of DEFAULT_FAVORITE_LINKS) {
      await addDoc(linksRef, {
        ...link,
        uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error seeding default workspace items:', error);
  }
}

/**
 * Add a new workspace preset
 */
export async function createPreset(uid, presetData) {
  if (!uid) throw new Error('User UID is required');

  const validUrls = (presetData.urls || [])
    .map((url) => sanitizeUrl(url))
    .filter(Boolean);

  const newDoc = {
    uid,
    name: presetData.name.trim(),
    description: presetData.description ? presetData.description.trim() : '',
    icon: presetData.icon || 'code',
    color: presetData.color || '#8b5cf6',
    urls: validUrls,
    accountLabel: presetData.accountLabel ? presetData.accountLabel.trim() : '',
    isFavorite: Boolean(presetData.isFavorite),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'workspace_presets'), newDoc);
  await logActivity(uid, 'CREATE_PRESET', `Created preset "${newDoc.name}"`, {
    presetId: docRef.id,
    urlCount: validUrls.length,
  });
  return docRef.id;
}

/**
 * Update an existing workspace preset
 */
export async function updatePreset(uid, presetId, presetData) {
  if (!uid || !presetId) throw new Error('UID and Preset ID are required');

  const validUrls = (presetData.urls || [])
    .map((url) => sanitizeUrl(url))
    .filter(Boolean);

  const updatePayload = {
    name: presetData.name.trim(),
    description: presetData.description ? presetData.description.trim() : '',
    icon: presetData.icon || 'code',
    color: presetData.color || '#8b5cf6',
    urls: validUrls,
    accountLabel: presetData.accountLabel ? presetData.accountLabel.trim() : '',
    isFavorite: Boolean(presetData.isFavorite),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, 'workspace_presets', presetId), updatePayload);
  await logActivity(uid, 'UPDATE_PRESET', `Updated preset "${updatePayload.name}"`, {
    presetId,
  });
}

/**
 * Delete a workspace preset
 */
export async function deletePreset(uid, presetId, presetName) {
  if (!uid || !presetId) throw new Error('UID and Preset ID are required');
  await deleteDoc(doc(db, 'workspace_presets', presetId));
  await logActivity(uid, 'DELETE_PRESET', `Deleted preset "${presetName || 'Workspace'}"`, {
    presetId,
  });
}

/**
 * Add a new favorite link
 */
export async function createLink(uid, linkData) {
  if (!uid) throw new Error('User UID is required');
  const sanitized = sanitizeUrl(linkData.url);
  if (!sanitized) throw new Error('Invalid URL protocol or syntax');

  const newDoc = {
    uid,
    title: linkData.title.trim(),
    url: sanitized,
    category: linkData.category || 'General',
    presetId: linkData.presetId || null,
    description: linkData.description ? linkData.description.trim() : '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'workspace_links'), newDoc);
  await logActivity(uid, 'CREATE_LINK', `Added link "${newDoc.title}"`, {
    linkId: docRef.id,
    domain: newDoc.url,
  });
  return docRef.id;
}

/**
 * Update an existing favorite link
 */
export async function updateLink(uid, linkId, linkData) {
  if (!uid || !linkId) throw new Error('UID and Link ID are required');
  const sanitized = sanitizeUrl(linkData.url);
  if (!sanitized) throw new Error('Invalid URL protocol or syntax');

  const updatePayload = {
    title: linkData.title.trim(),
    url: sanitized,
    category: linkData.category || 'General',
    presetId: linkData.presetId || null,
    description: linkData.description ? linkData.description.trim() : '',
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, 'workspace_links', linkId), updatePayload);
  await logActivity(uid, 'UPDATE_LINK', `Updated link "${updatePayload.title}"`, {
    linkId,
  });
}

/**
 * Delete a favorite link
 */
export async function deleteLink(uid, linkId, linkTitle) {
  if (!uid || !linkId) throw new Error('UID and Link ID are required');
  await deleteDoc(doc(db, 'workspace_links', linkId));
  await logActivity(uid, 'DELETE_LINK', `Deleted link "${linkTitle || 'Favorite Link'}"`, {
    linkId,
  });
}

/* -------------------------------------------------------------------------- */
/* SESSION MANAGEMENT                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Start a new workspace session
 */
export async function startWorkspaceSession(uid, preset) {
  if (!uid || !preset) throw new Error('UID and Preset are required');

  const sessionDoc = {
    uid,
    presetId: preset.id || null,
    presetName: preset.name,
    presetColor: preset.color || '#8b5cf6',
    urls: preset.urls || [],
    startTime: Date.now(),
    status: 'active',
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'workspace_sessions'), sessionDoc);
  await logActivity(
    uid,
    'START_WORK',
    `Started workspace session "${preset.name}" with ${preset.urls.length} resources`,
    {
      presetId: preset.id,
      presetName: preset.name,
      sessionId: docRef.id,
    }
  );

  return { id: docRef.id, ...sessionDoc };
}

/**
 * End an active workspace session
 */
export async function endWorkspaceSession(uid, sessionId, sessionData) {
  if (!uid || !sessionId) throw new Error('UID and Session ID are required');

  const endTime = Date.now();
  const startTime = sessionData?.startTime || endTime;
  const durationSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));

  const updatePayload = {
    endTime,
    durationSeconds,
    status: 'completed',
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, 'workspace_sessions', sessionId), updatePayload);

  const durationFormatted = formatDuration(durationSeconds);
  await logActivity(
    uid,
    'END_WORK',
    `Ended workspace session "${sessionData?.presetName || 'Workspace'}" (Duration: ${durationFormatted})`,
    {
      sessionId,
      presetName: sessionData?.presetName,
      durationSeconds,
    }
  );

  return { ...updatePayload, durationFormatted };
}

/* -------------------------------------------------------------------------- */
/* LOGGING & HELPERS                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Log a safe workspace activity to Firestore without recording secrets
 */
export async function logActivity(uid, type, title, metadata = {}) {
  if (!uid) return;
  try {
    // Sanitize any potential URL values in metadata
    const safeMetadata = { ...metadata };
    if (safeMetadata.url) {
      safeMetadata.url = sanitizeUrlForLog(safeMetadata.url);
    }

    await addDoc(collection(db, 'workspace_activity'), {
      uid,
      type,
      title,
      metadata: safeMetadata,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to log workspace activity:', err);
  }
}

/**
 * Formats duration in seconds into a human-readable string (e.g. "1h 24m 10s")
 */
export function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds < 0) return '0s';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}
