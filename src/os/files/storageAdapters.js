/**
 * Elyx OS 1.0 — Storage Location Adapters
 * Connects OS File Manager to existing real backend storage sources.
 */

export const STORAGE_LOCATIONS = Object.freeze({
  MEDIA: 'media',
  NOTES: 'notes',
  MUSIC: 'music',
  PROJECTS: 'projects',
  DEVICES: 'devices',
});

export const STORAGE_LOCATION_DEFS = [
  {
    id: STORAGE_LOCATIONS.MEDIA,
    name: 'Media Vault',
    shortName: 'Media',
    description: 'Zero-knowledge encrypted photos, 4K videos, and web streams',
    icon: '📷',
    appId: 'media',
    color: '#ec4899',
    collectionName: 'media_vault',
    supportsFolders: true,
  },
  {
    id: STORAGE_LOCATIONS.NOTES,
    name: 'Notes & Documents',
    shortName: 'Notes',
    description: 'Encrypted Markdown documents, templates, and secure research',
    icon: '📝',
    appId: 'notepad',
    color: '#3b82f6',
    collectionName: 'user_notes',
    supportsFolders: false,
  },
  {
    id: STORAGE_LOCATIONS.MUSIC,
    name: 'Music Vault Library',
    shortName: 'Music',
    description: 'High-fidelity audio tracks, albums, playlists, and streams',
    icon: '🎵',
    appId: 'music',
    color: '#8b5cf6',
    collectionName: 'music_vault',
    supportsFolders: true,
  },
  {
    id: STORAGE_LOCATIONS.PROJECTS,
    name: 'Web Projects & Credentials',
    shortName: 'Projects',
    description: 'AES-256 encrypted web applications, domains, and credentials',
    icon: '🔐',
    appId: 'general',
    color: '#10b981',
    collectionName: 'projects',
    supportsFolders: false,
  },
  {
    id: STORAGE_LOCATIONS.DEVICES,
    name: 'Connected Devices',
    shortName: 'Devices',
    description: 'Enrolled agent nodes, machine certificates, and terminal logs',
    icon: '💻',
    appId: 'devices',
    color: '#06b6d4',
    collectionName: 'devices',
    supportsFolders: false,
  },
];

/**
 * Normalizes a Media item into a standard File Manager entry.
 */
export function normalizeMediaItem(item) {
  return {
    id: item.id || `media_${Date.now()}`,
    sourceLocation: STORAGE_LOCATIONS.MEDIA,
    name: item.title || item.name || 'Untitled Media',
    type: item.type === 'video' ? 'video' : 'image',
    mimeType: item.mimeType || (item.type === 'video' ? 'video/mp4' : 'image/jpeg'),
    sizeBytes: Number(item.sizeBytes || item.size || 0),
    url: item.url || '',
    thumbnailUrl: item.thumbnailUrl || item.url || '',
    folder: item.category || 'All',
    updatedAt: item.createdAt || item.updatedAt || new Date().toISOString(),
    isEncrypted: Boolean(item.isEncrypted !== false),
    metadata: {
      category: item.category || 'General',
      width: item.width,
      height: item.height,
      duration: item.duration,
      storageBackend: item.storagePath ? 'Firebase Cloud Storage' : 'IndexedDB Local Vault',
    },
    appId: 'media',
  };
}

/**
 * Normalizes a Note item into a standard File Manager entry.
 */
export function normalizeNoteItem(note) {
  const content = String(note.content || note.rawContent || '');
  return {
    id: note.id || `note_${Date.now()}`,
    sourceLocation: STORAGE_LOCATIONS.NOTES,
    name: note.title ? `${note.title}.md` : 'Untitled Note.md',
    type: 'document',
    mimeType: 'text/markdown',
    sizeBytes: new Blob([content]).size,
    url: '',
    folder: note.tags && note.tags.length > 0 ? note.tags[0] : 'All Notes',
    updatedAt: note.updatedAt || note.createdAt || new Date().toISOString(),
    isEncrypted: Boolean(note.isEncrypted !== false),
    contentSnippet: content.slice(0, 300),
    metadata: {
      tags: note.tags || [],
      isPinned: Boolean(note.isPinned),
      characterCount: content.length,
      storageBackend: 'Firestore / Local Vault Cache',
    },
    appId: 'notepad',
  };
}

/**
 * Normalizes a Music track item into a standard File Manager entry.
 */
export function normalizeTrackItem(track) {
  return {
    id: track.id || `track_${Date.now()}`,
    sourceLocation: STORAGE_LOCATIONS.MUSIC,
    name: track.title ? `${track.title}.mp3` : 'Untitled Track.mp3',
    type: 'audio',
    mimeType: 'audio/mpeg',
    sizeBytes: Number(track.sizeBytes || track.size || 0),
    url: track.url || '',
    thumbnailUrl: track.coverUrl || '',
    folder: track.genre || 'All',
    updatedAt: track.createdAt || track.updatedAt || new Date().toISOString(),
    isEncrypted: false,
    metadata: {
      artist: track.artist || 'Unknown Artist',
      genre: track.genre || 'General',
      duration: track.duration,
      storageBackend: track.storagePath ? 'Firebase Cloud Storage' : 'IndexedDB Audio Vault',
    },
    appId: 'music',
  };
}

/**
 * Normalizes an Encrypted Project into a standard File Manager entry.
 */
export function normalizeProjectItem(proj) {
  return {
    id: proj.id || `proj_${Date.now()}`,
    sourceLocation: STORAGE_LOCATIONS.PROJECTS,
    name: proj.name || proj.title || 'Untitled Project',
    type: 'project',
    mimeType: 'application/x-elyx-project',
    sizeBytes: 1024,
    url: proj.url || '',
    folder: proj.category || 'Web Projects',
    updatedAt: proj.createdAt || proj.updatedAt || new Date().toISOString(),
    isEncrypted: true,
    metadata: {
      username: proj.username || '',
      url: proj.url || '',
      businessId: proj.businessId || '',
      storageBackend: 'Firestore Zero-Knowledge Encrypted Vault',
    },
    appId: 'general',
  };
}

/**
 * Normalizes an Enrolled Device into a standard File Manager entry.
 */
export function normalizeDeviceItem(dev) {
  return {
    id: dev.id || `dev_${Date.now()}`,
    sourceLocation: STORAGE_LOCATIONS.DEVICES,
    name: dev.name || dev.hostname || 'Windows Agent Node',
    type: 'device',
    mimeType: 'application/x-elyx-device-node',
    sizeBytes: 2048,
    url: '',
    folder: dev.status || 'Active',
    updatedAt: dev.lastSeen || dev.enrolledAt || new Date().toISOString(),
    isEncrypted: true,
    metadata: {
      hostname: dev.hostname || '',
      platform: dev.platform || 'win32',
      ip: dev.ip || '',
      storageBackend: 'Realtime Database Node Registry',
    },
    appId: 'devices',
  };
}

/**
 * Formats byte size cleanly for user display.
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i] || 'GB'}`;
}
