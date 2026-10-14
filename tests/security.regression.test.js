import { afterEach, describe, expect, it, vi } from 'vitest';
import { isActiveAccess, canAcceptInvitation } from '../src/utils/access.js';
import { encryptData, decryptData } from '../src/utils/crypto.js';
import {
  encryptRequired,
  resolveAudioSource,
} from '../src/utils/securePayload.js';
import {
  sanitizeWindowLayout,
  loadSavedWindowLayout,
  saveWindowLayout,
  loadWorkspaces,
  loadActiveWorkspace,
} from '../src/os/workspaces/types.js';
import { subscribeShared } from '../src/services/sharedSubscriptions.js';
import { loadOSSettings } from '../src/os/settings/settingsConfig.js';
import { canUserLaunchApp } from '../src/os/registry/appRegistry.js';
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
describe('security and reliability regressions', () => {
  it('only explicit active known roles authorize access', () => {
    for (const access of [
      null,
      { role: 'owner' },
      { status: 'pending', role: 'owner', businessId: 'a' },
      { status: 'active', role: 'admin', businessId: 'a' },
    ])
      expect(isActiveAccess(access)).toBe(false);
    expect(
      isActiveAccess({ status: 'active', role: 'owner', businessId: 'a' }),
    ).toBe(true);
    expect(canUserLaunchApp('terminal', 'viewer')).toBe(false);
  });
  it('revoked, accepted, wrong-email, and unverified invitations cannot activate', () => {
    const invite = {
      email: 'person@example.com',
      role: 'member',
      businessId: 'a',
      status: 'pending',
    };
    const user = {
      uid: 'person',
      email: 'PERSON@example.com',
      emailVerified: true,
    };
    expect(canAcceptInvitation(invite, user)).toBe(true);
    for (const status of ['accepted', 'revoked', 'disabled'])
      expect(canAcceptInvitation({ ...invite, status }, user)).toBe(false);
    expect(canAcceptInvitation(invite, { ...user, emailVerified: false })).toBe(
      false,
    );
    expect(
      canAcceptInvitation(invite, { ...user, email: 'other@example.com' }),
    ).toBe(false);
  });
  it('keeps the existing passphrase cipher format and aborts missing-key writes', () => {
    const encrypted = encryptData('legacy content', 'password');
    expect(encrypted.startsWith('U2FsdGVkX1')).toBe(true);
    expect(decryptData(encrypted, 'password')).toBe('legacy content');
    expect(decryptData(encrypted, 'wrong')).toBe(null);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => encryptRequired('must never save plaintext', '')).toThrow();
  });
  it('encrypted playback never bypasses decryption using a plaintext binary cache', async () => {
    const load = vi.fn().mockResolvedValue('data:audio/mp3;base64,plaintext');
    const track = {
      id: 'protected',
      isEncrypted: true,
      url: encryptData('https://private.example/song', 'key'),
    };
    await expect(resolveAudioSource(track, null, load)).rejects.toThrow();
    expect(load).not.toHaveBeenCalled();
    await expect(resolveAudioSource(track, 'wrong', load)).rejects.toThrow();
    expect(await resolveAudioSource(track, 'key', load)).toBe(
      'https://private.example/song',
    );
    expect(load).not.toHaveBeenCalled();
  });
  it('recovered layout allowlists metadata, rejects bad geometry, and isolates accounts', () => {
    const input = {
      id: 'notepad_1',
      appId: 'notepad',
      title: 'decrypted secret',
      bounds: { x: 10, y: 40, width: 900, height: 600, password: 'secret' },
      workspaceId: 999,
      customProps: { password: 'secret' },
      masterPassword: 'secret',
    };
    const result = sanitizeWindowLayout([
      null,
      { ...input, id: 'bad', bounds: { x: NaN, y: 0, width: 1, height: 1 } },
      input,
      input,
    ]);
    expect(result).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(result[0].workspaceId).toBe(1);
    saveWindowLayout(result, 'alice');
    expect(loadSavedWindowLayout('bob')).toBe(null);
    expect(loadSavedWindowLayout('alice')).toHaveLength(1);
  });
  it('corrupt workspace preferences recover to valid defaults', () => {
    localStorage.setItem(
      'elyx_workspaces',
      JSON.stringify([
        { id: -1, name: 'bad' },
        { id: 1, name: { injected: true } },
      ]),
    );
    expect(loadWorkspaces()[0].id).toBe(1);
    localStorage.setItem('elyx_active_workspace', 'Infinity');
    expect(loadActiveWorkspace()).toBe(1);
  });
  it('shares one listener and removes only its own underlying subscription', () => {
    let publish;
    const stop = vi.fn();
    const start = vi.fn((emit) => {
      publish = emit;
      emit('first');
      return stop;
    });
    const a = vi.fn(),
      b = vi.fn();
    const unsubscribeA = subscribeShared('test-user', start, a);
    const unsubscribeB = subscribeShared('test-user', start, b);
    expect(start).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenLastCalledWith('first');
    unsubscribeA();
    expect(stop).not.toHaveBeenCalled();
    publish('second');
    expect(b).toHaveBeenLastCalledWith('second');
    unsubscribeB();
    unsubscribeB();
    expect(stop).toHaveBeenCalledTimes(1);
    const unsubscribeC = subscribeShared('test-user', start, vi.fn());
    expect(start).toHaveBeenCalledTimes(2);
    unsubscribeC();
  });
});

it('legacy nonsecret theme/dock preferences recover without rewriting stored data', () => {
  localStorage.setItem('elyx_vault_theme', 'light');
  localStorage.setItem('elyx_dock_mode', 'taskbar');
  expect(loadOSSettings().theme).toBe('light');
  expect(loadOSSettings().desktopMode).toBe('windows');
  expect(localStorage.getItem('elyx_os_settings')).toBe(null);
});

it('existing-format decryption supports empty content and rejects truncated CBC blocks', () => {
  for (const text of ['', 'a', 'a'.repeat(16), 'Unicode: Հայերեն'])
    expect(decryptData(encryptData(text, 'key'), 'key')).toBe(text);
  expect(
    decryptData(encryptData('protected content', 'key').slice(0, -4), 'key'),
  ).toBe(null);
});
