import React from 'react';
import {
  cleanup,
  render,
  screen,
  fireEvent,
  act,
  renderHook,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WindowManagerStage } from '../src/os/windows/WindowManagerStage.jsx';
import { NoteEditor } from '../src/components/notepad/NoteEditor.jsx';
import { usePagedItems } from '../src/os/hooks/usePagedItems.js';
import { encryptData, decryptData } from '../src/utils/crypto.js';
const state = vi.hoisted(() => ({ windows: [], onUpdate: vi.fn() }));
vi.mock('../src/os/hooks/useWindowManager.js', () => ({
  useWindowManager: () => ({ windows: state.windows }),
}));
vi.mock('../src/os/hooks/useOS.js', () => ({
  useOS: () => ({
    activeWorkspace: 1,
    workspaces: [{ id: 1, name: 'Main' }],
    workspaceMode: 'desktop',
    settings: { windowSnapEnabled: true },
  }),
}));
vi.mock('../src/config/firebase.js', () => ({
  db: {},
  auth: { currentUser: null },
}));
vi.mock('../src/os/windows/WindowFrame.jsx', () => ({
  default: ({ children }) => <div>{children}</div>,
}));
const props = {
  user: { uid: 'alice' },
  access: { status: 'active', role: 'viewer', businessId: 'a' },
  masterPassword: null,
};
beforeEach(() => {
  state.windows = [];
  state.onUpdate.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it('denies an admin app opened directly or restored by a viewer', () => {
  state.windows = [
    {
      id: 'terminal_1',
      appId: 'terminal',
      title: 'Terminal',
      requiresMasterPassword: false,
      workspaceId: 1,
    },
  ];
  render(<WindowManagerStage {...props} />);
  expect(screen.getByRole('alert').textContent).toContain('permission');
});
it('ignores tampered recovered protection flags and shows an unlock form', () => {
  state.windows = [
    {
      id: 'notepad_1',
      appId: 'notepad',
      title: 'Notes',
      requiresMasterPassword: false,
      workspaceId: 1,
    },
  ];
  render(<WindowManagerStage {...props} />);
  expect(screen.getByLabelText('Master password')).toBeTruthy();
});
it('cancels encrypted autosave when the editor unmounts on vault lock', () => {
  vi.useFakeTimers();
  const note = {
    id: 'note-1',
    title: 'Test',
    content: encryptData('protected text', 'key'),
    isEncrypted: true,
    tags: [],
  };
  const { unmount } = render(
    <NoteEditor
      note={note}
      masterPassword="key"
      onUpdateNote={state.onUpdate}
    />,
  );
  const input = screen.getByDisplayValue('protected text');
  fireEvent.change(input, { target: { value: 'new protected text' } });
  unmount();
  act(() => vi.advanceTimersByTime(1000));
  expect(state.onUpdate).not.toHaveBeenCalled();
});
it('large libraries bound rendered items and retain stable page navigation', () => {
  const items = Array.from({ length: 10000 }, (_, id) => ({ id }));
  const { result } = renderHook(() => usePagedItems(items));
  expect(result.current.items).toHaveLength(60);
  expect(result.current.totalPages).toBe(167);
  act(() => result.current.setPage(2));
  expect(result.current.items[0].id).toBe(60);
});

it('typing immediately after enabling encryption still saves ciphertext', async () => {
  vi.useFakeTimers();
  const note = {
    id: 'note-encrypt',
    title: 'Test',
    content: 'plain draft',
    isEncrypted: false,
    tags: [],
  };
  render(
    <NoteEditor
      note={note}
      masterPassword="key"
      onUpdateNote={state.onUpdate}
    />,
  );
  fireEvent.click(
    screen.getByTitle('Encrypt Note with Master Password / Գաղտնագրել'),
  );
  fireEvent.change(screen.getByDisplayValue('plain draft'), {
    target: { value: 'secret after toggle' },
  });
  await act(async () => {
    vi.advanceTimersByTime(500);
    await Promise.resolve();
  });
  const saved = state.onUpdate.mock.lastCall[0];
  expect(saved.isEncrypted).toBe(true);
  expect(saved.content).not.toContain('secret');
  expect(decryptData(saved.content, 'key')).toBe('secret after toggle');
});
