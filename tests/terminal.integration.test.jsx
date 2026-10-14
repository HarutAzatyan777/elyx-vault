import { renderHook, cleanup, act } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useRemoteTerminal } from '../src/hooks/useRemoteTerminal.js';
const mocks = vi.hoisted(() => ({
  dispose: vi.fn(),
  getToken: vi.fn(async () => 'verified-token'),
}));
vi.mock('../src/hooks/useAuth.jsx', () => ({
  useAuth: () => ({
    user: { uid: 'alice', getIdToken: mocks.getToken },
    access: { status: 'active', role: 'owner' },
  }),
}));
vi.mock('../src/services/deviceService.js', () => ({
  logSecurityEvent: vi.fn(),
}));
vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    loadAddon() {}
    open() {}
    onData() {}
    onResize() {}
    writeln() {}
    dispose = mocks.dispose;
  },
}));
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit() {}
  },
}));
vi.mock('@xterm/addon-web-links', () => ({ WebLinksAddon: class {} }));
const device = {
  id: 'enrolled-device',
  deviceId: 'physical-device',
  tailscaleIp: '127.0.0.1',
  agentPort: 9090,
};
beforeEach(() => {
  vi.stubGlobal('WebSocket', vi.fn());
  mocks.dispose.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it('an authorization response arriving after unmount cannot create a socket', async () => {
  let respond;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise((resolve) => {
          respond = resolve;
        }),
    ),
  );
  const { result, unmount } = renderHook(() =>
    useRemoteTerminal(device, '/project'),
  );
  let pending;
  await act(async () => {
    pending = result.current.connect();
    await Promise.resolve();
  });
  unmount();
  await act(async () => {
    respond({ ok: true, json: async () => ({ token: 'agent-session' }) });
    await pending;
  });
  expect(WebSocket).not.toHaveBeenCalled();
});
it('authorization failures do not fall back to a sample token', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: false })),
  );
  const { result } = renderHook(() => useRemoteTerminal(device, '/project'));
  await act(async () => {
    await result.current.connect();
  });
  expect(WebSocket).not.toHaveBeenCalled();
  expect(result.current.error).toContain('authorization failed');
});
it('terminal unmount disposes xterm and its resize listener', () => {
  const remove = vi.spyOn(window, 'removeEventListener');
  const { result, unmount } = renderHook(() =>
    useRemoteTerminal(device, '/project'),
  );
  act(() => result.current.attachTerminal(document.createElement('div')));
  unmount();
  expect(mocks.dispose).toHaveBeenCalledTimes(1);
  expect(remove.mock.calls.some(([event]) => event === 'resize')).toBe(true);
});
it('a remote plain HTTP endpoint is rejected before sending Firebase credentials', async () => {
  vi.stubGlobal('fetch', vi.fn());
  const { result } = renderHook(() =>
    useRemoteTerminal({ ...device, tailscaleIp: '100.64.0.12' }, '/project'),
  );
  await act(async () => {
    await result.current.connect();
  });
  expect(fetch).not.toHaveBeenCalled();
  expect(result.current.error).toContain('TLS');
});
