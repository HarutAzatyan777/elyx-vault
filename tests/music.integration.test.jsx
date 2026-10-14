import React from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  MusicProvider,
  useMusic,
  useMusicProgress,
} from '../src/context/MusicContext.jsx';
const mock = vi.hoisted(() => ({ loadBlob: vi.fn(), audio: null }));
vi.mock('../src/hooks/useAuth.jsx', () => ({
  useAuth: () => ({ user: { uid: 'alice' } }),
}));
vi.mock('../src/config/firebase.js', () => ({
  auth: { currentUser: { uid: 'alice' } },
}));
vi.mock('../src/services/musicService.js', () => ({
  getAudioBlob: mock.loadBlob,
}));
vi.mock('../src/services/rtdbService.js', () => ({
  broadcastLiveMusicSync: vi.fn(),
}));
let controls, controlRenders, progressRenders;
function Controls() {
  controls = useMusic();
  controlRenders++;
  return null;
}
function Progress() {
  useMusicProgress();
  progressRenders++;
  return null;
}
beforeEach(() => {
  controlRenders = 0;
  progressRenders = 0;
  localStorage.clear();
  mock.loadBlob.mockReset();
  vi.stubGlobal(
    'Audio',
    class extends EventTarget {
      constructor() {
        super();
        this.paused = true;
        this.currentTime = 0;
        this.duration = 100;
        this.src = '';
        mock.audio = this;
      }
      play = vi.fn(async () => {
        this.paused = false;
        this.dispatchEvent(new Event('play'));
      });
      pause = vi.fn(() => {
        this.paused = true;
        this.dispatchEvent(new Event('pause'));
      });
      load = vi.fn();
      removeAttribute = vi.fn(() => {
        this.src = '';
      });
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('playback time updates do not rerender shell/music-control consumers', () => {
  render(
    <MusicProvider>
      <Controls />
      <Progress />
    </MusicProvider>,
  );
  const before = controlRenders,
    beforeProgress = progressRenders;
  act(() => {
    mock.audio.currentTime = 10;
    mock.audio.dispatchEvent(new Event('timeupdate'));
  });
  expect(controlRenders).toBe(before);
  expect(progressRenders).toBeGreaterThan(beforeProgress);
});
it('locking cancels a pending media resolution and prevents playback from restarting', async () => {
  let resolve;
  mock.loadBlob.mockReturnValue(
    new Promise((finish) => {
      resolve = finish;
    }),
  );
  render(
    <MusicProvider>
      <Controls />
    </MusicProvider>,
  );
  let pending;
  act(() => {
    pending = controls.playTrack({
      id: 'one',
      title: 'Test',
      isEncrypted: false,
      url: 'https://example.com/audio',
    });
  });
  act(() => window.dispatchEvent(new Event('elyx:vault-locked')));
  await act(async () => {
    resolve('data:audio/mp3;base64,bytes');
    await pending;
  });
  expect(mock.audio.play).not.toHaveBeenCalled();
  expect(controls.currentTrack).toBe(null);
  expect(controls.queue).toEqual([]);
});
it('unmount unloads audio and removes registered media handlers', () => {
  const handlers = new Map();
  Object.defineProperty(navigator, 'mediaSession', {
    configurable: true,
    value: {
      metadata: { title: 'Sensitive' },
      setActionHandler: (name, value) => handlers.set(name, value),
    },
  });
  const { unmount } = render(
    <MusicProvider>
      <Controls />
    </MusicProvider>,
  );
  unmount();
  expect(mock.audio.src).toBe('');
  expect(navigator.mediaSession.metadata).toBe(null);
  expect(handlers.get('play')).toBe(null);
  delete navigator.mediaSession;
});
it('failed track selection cannot leave the previous stream playing under another title', async () => {
  mock.loadBlob.mockResolvedValue('data:audio/mp3;base64,bytes');
  render(
    <MusicProvider>
      <Controls />
    </MusicProvider>,
  );
  await act(async () => {
    await controls.playTrack({
      id: 'first',
      title: 'First',
      isEncrypted: false,
    });
  });
  expect(controls.isPlaying).toBe(true);
  await act(async () => {
    await controls.playTrack({
      id: 'locked',
      title: 'Locked',
      url: 'ciphertext',
      isEncrypted: true,
    });
  });
  expect(mock.audio.paused).toBe(true);
  expect(mock.audio.src).toBe('');
  expect(controls.currentTrack).toBe(null);
  expect(controls.playbackError).toContain('Unable to play');
});
