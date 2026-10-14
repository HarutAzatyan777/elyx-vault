import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import {
  saveTrackItem,
  getAudioBlob,
  subscribeToMusic,
  getLocalTracks,
} from '../src/services/musicService.js';
import { saveMediaItem, getMediaBlob } from '../src/services/mediaService.js';
import {
  saveNoteToStorage,
  subscribeToNotes,
  getLocalNotes,
} from '../src/services/notepadService.js';
import { encryptData, decryptData } from '../src/utils/crypto.js';
const mocks = vi.hoisted(() => ({
  uid: 'alice',
  uploadMusic: vi.fn(),
  uploadMedia: vi.fn(),
  write: vi.fn(),
  snapshot: null,
  stop: vi.fn(),
}));
vi.mock('../src/config/firebase.js', () => ({
  db: {},
  auth: {
    get currentUser() {
      return { uid: mocks.uid };
    },
  },
}));
vi.mock('../src/services/storageService.js', () => ({
  uploadMusicFile: mocks.uploadMusic,
  uploadMediaFile: mocks.uploadMedia,
  deleteFromStorage: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  collection: (_, name) => name,
  doc: (_, collection, id) => ({ collection, id }),
  query: (...args) => args,
  where: (...args) => args,
  onSnapshot: (_, emit) => {
    mocks.snapshot = emit;
    return mocks.stop;
  },
  setDoc: mocks.write,
  deleteDoc: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(),
  updateDoc: vi.fn(),
}));
beforeEach(() => {
  localStorage.clear();
  window.indexedDB = new IDBFactory();
  mocks.uid = 'alice';
  mocks.write.mockReset().mockResolvedValue(undefined);
  mocks.uploadMusic.mockClear();
  mocks.uploadMedia.mockClear();
});
afterEach(() => localStorage.clear());
it('encrypted audio never uploads or caches the original file', async () => {
  const cipher = encryptData('data:audio/mp3;base64,protected', 'key');
  const saved = await saveTrackItem({
    track: {
      id: 'track-protected',
      title: 'Test',
      url: cipher,
      isEncrypted: true,
    },
    uid: 'alice',
    businessId: 'a',
    file: new Blob(['original plaintext']),
    audioBlob: 'original plaintext',
  });
  expect(saved._encryptedLocalPayload).toBe(true);
  expect(mocks.uploadMusic).not.toHaveBeenCalled();
  expect(mocks.write).not.toHaveBeenCalled();
  expect(decryptData(await getAudioBlob(saved.id), 'key')).toContain(
    'protected',
  );
  expect(
    localStorage.getItem('elyx_vault_music_alice') ||
      JSON.stringify(getLocalTracks('alice')),
  ).not.toContain('original plaintext');
});
it('encrypted media caches ciphertext and survives an empty remote snapshot', async () => {
  const cipher = encryptData('data:image/png;base64,protected', 'key');
  const saved = await saveMediaItem({
    item: {
      id: 'media-protected',
      title: 'Test',
      url: cipher,
      isEncrypted: true,
    },
    uid: 'alice',
    businessId: 'a',
    file: new Blob(['original plaintext']),
    blobData: 'original plaintext',
  });
  expect(mocks.uploadMedia).not.toHaveBeenCalled();
  expect(await getMediaBlob(saved.id)).toBe(cipher);
});
it('plain caches cannot be looked up across accounts by guessing a record ID', async () => {
  await saveTrackItem({
    track: { id: 'track-alice', title: 'Test' },
    uid: 'alice',
    audioBlob: 'alice payload',
  });
  mocks.uid = 'bob';
  expect(await getAudioBlob('track-alice')).toBe(null);
});
it('local-only encrypted items survive snapshots without triggering remote writes', async () => {
  await saveTrackItem({
    track: {
      id: 'track-local',
      title: 'Test',
      url: encryptData('content', 'key'),
      isEncrypted: true,
    },
    uid: 'alice',
    audioBlob: 'raw',
  });
  const emit = vi.fn();
  const stop = subscribeToMusic('alice', 'a', emit);
  mocks.snapshot({ docs: [] });
  expect(emit.mock.lastCall[0]).toHaveLength(1);
  expect(mocks.write).not.toHaveBeenCalled();
  stop();
});
it('a new note uses a stable document ID, and encrypted plaintext writes are rejected', async () => {
  await saveNoteToStorage({
    note: {
      id: 'note-fixed',
      title: 'Test',
      content: encryptData('text', 'key'),
      isEncrypted: true,
    },
    uid: 'alice',
    businessId: 'a',
  });
  expect(mocks.write.mock.calls[0][0]).toEqual({
    collection: 'user_notes',
    id: 'note-fixed',
  });
  await expect(
    saveNoteToStorage({
      note: { id: 'invalid', isEncrypted: true, content: 'plaintext secret' },
      uid: 'alice',
    }),
  ).rejects.toThrow();
});
it('failed cloud note writes remain local, do not recreate themselves from snapshots, and report failure', async () => {
  mocks.write.mockRejectedValueOnce({ code: 'permission-denied' });
  await expect(
    saveNoteToStorage({
      note: { id: 'note-pending', content: 'draft', isEncrypted: false },
      uid: 'alice',
      businessId: 'a',
    }),
  ).rejects.toThrow('cloud saving failed');
  const emit = vi.fn();
  const stop = subscribeToNotes('alice', 'a', emit);
  mocks.snapshot({ docs: [], empty: true });
  expect(getLocalNotes('alice')[0]._pendingCloud).toBe(true);
  expect(emit.mock.lastCall[0][0].id).toBe('note-pending');
  expect(mocks.write).toHaveBeenCalledTimes(1);
  stop();
});
it('cache writes exclude transient plaintext and master keys from record props', async () => {
  await saveNoteToStorage({
    note: {
      id: 'safe-note',
      content: encryptData('protected', 'key'),
      isEncrypted: true,
      masterPassword: 'KEY_MUST_NOT_PERSIST',
      decryptedContent: 'PLAINTEXT_MUST_NOT_PERSIST',
    },
    uid: 'alice',
    businessId: 'a',
  });
  const cached = JSON.stringify(getLocalNotes('alice'));
  expect(cached).not.toContain('KEY_MUST_NOT_PERSIST');
  expect(cached).not.toContain('PLAINTEXT_MUST_NOT_PERSIST');
});
it('a partially failing encrypted batch preserves completed items with one metadata write', async () => {
  const { saveBatchTrackItems } = await import(
    '../src/services/musicService.js'
  );
  const writeCache = vi.spyOn(Storage.prototype, 'setItem');
  await expect(
    saveBatchTrackItems(
      [
        {
          track: {
            id: 'completed',
            title: 'Test',
            url: encryptData('protected', 'key'),
            isEncrypted: true,
          },
          audioBlob: 'original',
        },
        {
          track: {
            id: 'failed',
            title: 'Test',
            url: 'unencrypted',
            isEncrypted: true,
          },
          audioBlob: 'original',
        },
      ],
      'alice',
      'a',
    ),
  ).rejects.toThrow();
  expect(
    getLocalTracks('alice').some((track) => track.id === 'completed'),
  ).toBe(true);
  expect(
    writeCache.mock.calls.filter(
      ([key]) =>
        key.startsWith('elyx_vault_tracks_') ||
        key.startsWith('elyx_vault_music_'),
    ).length,
  ).toBe(1);
  writeCache.mockRestore();
});
it('a legacy note payload ID cannot override its real cloud document identity', async () => {
  const emit = vi.fn();
  const stop = subscribeToNotes('alice', 'a', emit);
  mocks.snapshot({
    docs: [
      {
        id: 'real-cloud-id',
        data: () => ({
          id: 'legacy-local-id',
          uid: 'alice',
          title: 'Legacy note',
          content: 'draft',
          isEncrypted: false,
        }),
      },
    ],
    empty: false,
  });
  const note = emit.mock.lastCall[0][0];
  expect(note.id).toBe('real-cloud-id');
  await saveNoteToStorage({ note, uid: 'alice', businessId: 'a' });
  expect(mocks.write.mock.lastCall[0].id).toBe('real-cloud-id');
  stop();
});
