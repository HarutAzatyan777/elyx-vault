// @vitest-environment node
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { beforeEach, expect, it, vi } from 'vitest';
let handlers, records, chrome;
beforeEach(() => {
  handlers = {};
  records = {};
  chrome = {
    runtime: {
      id: 'extension-id',
      getURL: (file) => `chrome-extension://extension-id/${file}`,
      onMessage: { addListener: (fn) => (handlers.message = fn) },
      onMessageExternal: { addListener: (fn) => (handlers.external = fn) },
    },
    storage: {
      session: {
        get: async (key) =>
          key == null ? { ...records } : { [key]: records[key] },
        set: async (value) => Object.assign(records, value),
        remove: async (key) => {
          for (const name of Array.isArray(key) ? key : [key])
            delete records[name];
        },
      },
    },
    tabs: {
      create: vi.fn(async () => ({ id: 1 })),
      sendMessage: vi.fn(),
      query: async () => [],
      onUpdated: { addListener: (fn) => (handlers.updated = fn) },
      onRemoved: { addListener: (fn) => (handlers.removed = fn) },
    },
  };
  const context = vm.createContext({
    chrome,
    URL,
    Date,
    console,
    importScripts: () => {},
  });
  vm.runInContext(readFileSync('extension/securityPolicy.js', 'utf8'), context);
  vm.runInContext(readFileSync('extension/background.js', 'utf8'), context);
});
const flush = () => new Promise((resolve) => setImmediate(resolve));
it('untrusted pages cannot launch autofill through internal or external bridges', async () => {
  const reply = vi.fn(),
    request = {
      action: 'AUTO_LOGIN',
      url: 'https://target.example/login',
      credentials: { password: 'secret' },
    };
  handlers.message(
    request,
    { id: 'extension-id', url: 'https://hostile.example', frameId: 0 },
    reply,
  );
  await flush();
  expect(reply.mock.lastCall[0].status).toBe('error');
  expect(chrome.tabs.create).not.toHaveBeenCalled();
  handlers.external(
    request,
    { url: 'https://elyx-vault.web.app.hostile.example' },
    reply,
  );
  expect(reply.mock.lastCall[0].status).toBe('error');
});
it('credentials are only delivered to the target origin in its top-level frame', async () => {
  const reply = vi.fn();
  handlers.message(
    {
      action: 'AUTO_LOGIN',
      url: 'https://target.example/login',
      credentials: { password: 'secret' },
    },
    { id: 'extension-id', url: 'chrome-extension://extension-id/popup.html' },
    reply,
  );
  await flush();
  expect(reply.mock.lastCall[0].status).toBe('success');
  const frameReply = vi.fn();
  handlers.message(
    { action: 'GET_PENDING_CREDENTIALS' },
    { tab: { id: 1 }, url: 'https://target.example/login', frameId: 1 },
    frameReply,
  );
  expect(frameReply.mock.lastCall[0].credentials).toBe(null);
  await handlers.updated(
    1,
    { status: 'complete' },
    { url: 'https://hostile.example' },
  );
  expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  expect(records.pending_autofill_1).toBeUndefined();
});
it('expired credential records are removed instead of being forwarded', async () => {
  records.pending_autofill_1 = {
    origin: 'https://target.example',
    expiresAt: 0,
    credentials: { password: 'secret' },
  };
  await handlers.updated(
    1,
    { status: 'complete' },
    { url: 'https://target.example/login' },
  );
  expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  expect(records.pending_autofill_1).toBeUndefined();
});
it('does not persist page credentials or restore master keys from durable extension storage', () => {
  const content = readFileSync('extension/content.js', 'utf8'),
    popup = readFileSync('extension/popup.js', 'utf8'),
    card = readFileSync('src/components/ProjectCard.jsx', 'utf8');
  expect(content).not.toContain("sessionStorage.setItem('__elyx_cached_creds'");
  expect(popup).not.toContain('chrome.storage.local.set');
  expect(card).not.toContain('#elyx_autofill=');
});
it('a launch queued before lock cannot store credentials after the vault locks', async () => {
  let finish;
  chrome.tabs.create.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const sender = {
    id: 'extension-id',
    url: 'chrome-extension://extension-id/popup.html',
  };
  const reply = vi.fn();
  handlers.message(
    {
      action: 'AUTO_LOGIN',
      url: 'https://target.example/login',
      credentials: { password: 'secret' },
    },
    sender,
    reply,
  );
  handlers.message({ action: 'CLEAR_PENDING_CREDENTIALS' }, sender, vi.fn());
  finish({ id: 1 });
  await flush();
  expect(records.pending_autofill_1).toBeUndefined();
  expect(reply.mock.lastCall[0].status).toBe('error');
});
