import {
  formatFileSize,
  normalizeDeviceItem,
  normalizeMediaItem,
  normalizeNoteItem,
  normalizeProjectItem,
  normalizeTrackItem,
  STORAGE_LOCATION_DEFS,
  STORAGE_LOCATIONS,
} from './storageAdapters.js';
import { getAllApps, getAppById } from '../registry/appRegistry.js';
import { isDemoNote } from '../../services/notepadService.js';
import { isDemoMedia } from '../../services/mediaService.js';
import { isDemoTrack } from '../../services/musicService.js';

/**
 * In-memory automated test suite for Elyx OS 1.0 Application Integration & File Manager.
 */
export function runFileManagerAndIntegrationTests() {
  const results = [];

  const assert = (description, condition) => {
    results.push({ description, success: Boolean(condition) });
  };

  // ==========================================================================
  // Group 1: Storage Location Adapters Verification
  // ==========================================================================
  assert('Storage location definitions array is populated', Array.isArray(STORAGE_LOCATION_DEFS) && STORAGE_LOCATION_DEFS.length >= 5);

  const expectedLocations = [
    STORAGE_LOCATIONS.MEDIA,
    STORAGE_LOCATIONS.NOTES,
    STORAGE_LOCATIONS.MUSIC,
    STORAGE_LOCATIONS.PROJECTS,
    STORAGE_LOCATIONS.DEVICES,
  ];

  const allLocationsDefined = expectedLocations.every((locId) =>
    STORAGE_LOCATION_DEFS.some((def) => def.id === locId)
  );
  assert('All 5 core storage sources are explicitly defined as locations', allLocationsDefined);

  // ==========================================================================
  // Group 2: Item Normalization & Metadata Contracts
  // ==========================================================================
  // 1. Media Normalization
  const sampleMedia = {
    id: 'media_test_1',
    title: 'Secret Vault Photo',
    type: 'image',
    sizeBytes: 2048576,
    url: 'https://storage.googleapis.com/test.jpg',
    category: 'Assets',
    isEncrypted: true,
  };
  const normalizedMedia = normalizeMediaItem(sampleMedia);
  assert('Media normalization extracts file name and mime type', normalizedMedia.name === 'Secret Vault Photo' && normalizedMedia.mimeType === 'image/jpeg');
  assert('Media normalization preserves encryption status', normalizedMedia.isEncrypted === true);
  assert('Media normalization routes to "media" application', normalizedMedia.appId === 'media');

  // 2. Note Normalization
  const sampleNote = {
    id: 'note_test_1',
    title: 'Architecture Blueprint',
    content: '# Elyx OS Architecture\nThis is encrypted documentation.',
    tags: ['Architecture', 'Security'],
    isEncrypted: true,
  };
  const normalizedNote = normalizeNoteItem(sampleNote);
  assert('Note normalization appends .md extension', normalizedNote.name === 'Architecture Blueprint.md');
  assert('Note normalization sets text/markdown mime type', normalizedNote.mimeType === 'text/markdown');
  assert('Note normalization calculates content byte size', normalizedNote.sizeBytes > 0);
  assert('Note normalization routes to "notepad" application', normalizedNote.appId === 'notepad');

  // 3. Music Track Normalization
  const sampleTrack = {
    id: 'track_test_1',
    title: 'Synthwave Skyline',
    artist: 'Elyx Sound',
    genre: 'Synthwave',
    sizeBytes: 8388608,
    url: 'https://storage.googleapis.com/test.mp3',
  };
  const normalizedTrack = normalizeTrackItem(sampleTrack);
  assert('Track normalization appends .mp3 extension', normalizedTrack.name === 'Synthwave Skyline.mp3');
  assert('Track normalization sets audio/mpeg mime type', normalizedTrack.mimeType === 'audio/mpeg');
  assert('Track normalization routes to "music" application', normalizedTrack.appId === 'music');

  // 4. Project Normalization
  const sampleProject = {
    id: 'proj_test_1',
    name: 'Production Cloud Cluster',
    url: 'https://cluster.elyx.io',
    category: 'Infrastructure',
  };
  const normalizedProj = normalizeProjectItem(sampleProject);
  assert('Project normalization preserves name and encrypted status', normalizedProj.name === 'Production Cloud Cluster' && normalizedProj.isEncrypted === true);
  assert('Project normalization routes to "general" application', normalizedProj.appId === 'general');

  // 5. Device Normalization
  const sampleDevice = {
    id: 'dev_test_1',
    hostname: 'DESKTOP-VAHAG',
    status: 'online',
    platform: 'win32',
  };
  const normalizedDevice = normalizeDeviceItem(sampleDevice);
  assert('Device normalization sets hostname as file entry name', normalizedDevice.name === 'DESKTOP-VAHAG');
  assert('Device normalization routes to "devices" application', normalizedDevice.appId === 'devices');

  // ==========================================================================
  // Group 3: File Size Formatter
  // ==========================================================================
  assert('formatFileSize handles 0 bytes', formatFileSize(0) === '0 B');
  assert('formatFileSize formats Kilobytes correctly', formatFileSize(1024) === '1.0 KB');
  assert('formatFileSize formats Megabytes correctly', formatFileSize(1048576) === '1.0 MB');
  assert('formatFileSize formats Gigabytes correctly', formatFileSize(1073741824) === '1.0 GB');

  // ==========================================================================
  // Group 4: App Registry Complete Integration Check (Step 1 & 2)
  // ==========================================================================
  const allApps = getAllApps();
  const requiredAppIds = [
    'daily_workspace',
    'notepad',
    'media',
    'music',
    'general',
    'minecraft',
    'users',
    'devices',
    'terminal',
    'files',
    'settings',
    'extension',
  ];

  const allRequiredAppsRegistered = requiredAppIds.every((id) =>
    allApps.some((app) => app.id === id)
  );
  assert('All 12 vault applications are registered in App Registry', allRequiredAppsRegistered);

  const filesApp = getAppById('files');
  assert('Files application is properly registered with component', Boolean(filesApp && filesApp.component));

  const settingsApp = getAppById('settings');
  assert('Settings application is properly registered with component', Boolean(settingsApp && settingsApp.component));

  // ==========================================================================
  // Group 5: Data Safety & Demo Seeding Protection (Step 5)
  // ==========================================================================
  assert('isDemoNote detects starter notes to prevent auto-seeding', isDemoNote({ id: 'starter-welcome' }) === true);
  assert('isDemoNote permits user notes', isDemoNote({ id: 'user-note-123' }) === false);

  assert('isDemoMedia detects starter media to prevent auto-seeding', isDemoMedia({ id: 'starter-media-1' }) === true);
  assert('isDemoMedia permits user media', isDemoMedia({ id: 'user-media-123' }) === false);

  assert('isDemoTrack detects starter tracks to prevent auto-seeding', isDemoTrack({ id: 'starter-track-1' }) === true);
  assert('isDemoTrack permits user tracks', isDemoTrack({ id: 'user-track-123' }) === false);

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`[FileManager & Integration Tests] Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) {
    console.error('[FileManager & Integration Tests] Failures detected:', results.filter((r) => !r.success));
  }

  return { total: results.length, passed, failed, results };
}
