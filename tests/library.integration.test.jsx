import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MusicVault } from '../src/components/music/MusicVault.jsx';
import { MediaVault } from '../src/components/media/MediaVault.jsx';
const items = vi.hoisted(() =>
  Array.from({ length: 10000 }, (_, id) => ({
    id: `item-${id}`,
    title: `Item ${String(id).padStart(5, '0')}`,
    type: 'image',
    artist: 'Test',
    genre: 'Personal',
    category: 'Assets',
    createdAt: '2026-10-14T00:00:00Z',
    tags: [],
    url: 'https://example.com/test.jpg',
  })),
);
vi.mock('../src/hooks/useAuth.jsx', () => ({
  useAuth: () => ({
    user: { uid: 'alice' },
    access: { role: 'member', businessId: 'a', status: 'active' },
  }),
}));
vi.mock('../src/config/firebase.js', () => ({
  db: {},
  auth: { currentUser: { uid: 'alice' } },
  storage: null,
  rtdb: null,
}));
vi.mock('../src/context/MusicContext.jsx', () => ({
  useMusic: () => ({
    currentTrack: null,
    isPlaying: false,
    playTrack: vi.fn(),
    togglePlayPause: vi.fn(),
    stopPlayback: vi.fn(),
  }),
}));
vi.mock('../src/services/musicService.js', async (original) => ({
  ...(await original()),
  subscribeToMusic: (_uid, _biz, emit) => {
    emit(items);
    return () => {};
  },
  subscribeToMusicFolders: (_uid, _biz, emit) => {
    emit([]);
    return () => {};
  },
}));
vi.mock('../src/services/mediaService.js', async (original) => ({
  ...(await original()),
  subscribeToMedia: (_uid, _biz, emit) => {
    emit(items);
    return () => {};
  },
}));
afterEach(() => cleanup());
it('10,000 music tracks render only 60 rows per page and can reach later items', () => {
  render(<MusicVault masterPassword="key" />);
  expect(screen.getAllByRole('row')).toHaveLength(61);
  expect(screen.getByText('Item 00000')).toBeTruthy();
  expect(screen.queryByText('Item 00060')).toBe(null);
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.getByText('Item 00060')).toBeTruthy();
  expect(screen.getAllByRole('row')).toHaveLength(61);
});
it('10,000 media items render only 60 preview images per page', () => {
  render(<MediaVault masterPassword="key" />);
  expect(screen.getAllByRole('img')).toHaveLength(60);
  expect(screen.queryByText('Item 00060')).toBe(null);
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.getByText('Item 00060')).toBeTruthy();
});
