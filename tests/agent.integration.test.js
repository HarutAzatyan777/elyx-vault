// @vitest-environment node
import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { WebSocket } from '../agent/node_modules/ws/wrapper.mjs';
import { createAgentServer } from '../agent/src/server.js';
import {
  generateSessionToken,
  verifySessionToken,
} from '../agent/src/auth/tokenVerifier.js';
import { validateDirectoryPath } from '../agent/src/security/pathValidator.js';
import { mkdirSync, mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const pty = vi.hoisted(() => ({
  createSession: vi.fn(),
  getActiveSessionsCount: () => 0,
  closeSession: vi.fn(),
  writeInput: vi.fn(),
  resize: vi.fn(),
}));
vi.mock('../agent/src/terminal/ptyManager.js', () => ({ ptyManager: pty }));
vi.mock('../agent/src/devices/deviceIdentity.js', () => ({
  deviceIdentity: { getIdentity: () => ({ deviceId: 'agent-1' }) },
}));
let server, base;
beforeAll(async () => {
  ({ server } = createAgentServer({
    allowedDirectories: [process.cwd()],
    allowedOrigins: ['https://elyx-vault.web.app'],
    authorizeRequest: async (token, record, device) => {
      if (
        token !== 'verified-firebase-token' ||
        record !== 'enrolled-device' ||
        device !== 'agent-1'
      )
        throw Error('Denied');
      return { uid: 'alice', deviceId: 'agent-1', deviceRecordId: record };
    },
  }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((resolve) => server.close(resolve)));
it('agent denies anonymous token minting and untrusted browser origins', async () => {
  const anonymous = await fetch(`${base}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: 'owner', deviceRecordId: 'enrolled-device' }),
  });
  expect(anonymous.status).toBe(403);
  const hostile = await fetch(`${base}/api/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer verified-firebase-token',
      Origin: 'https://hostile.example',
    },
    body: JSON.stringify({ deviceRecordId: 'enrolled-device' }),
  });
  expect(hostile.status).toBe(403);
});
it('verified identity issues a short-lived device-bound token, not body-supplied uid', async () => {
  const response = await fetch(`${base}/api/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer verified-firebase-token',
      Origin: 'https://elyx-vault.web.app',
    },
    body: JSON.stringify({
      deviceRecordId: 'enrolled-device',
      uid: 'attacker',
    }),
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  const verified = verifySessionToken(body.token, undefined, 'agent-1');
  expect(verified.valid).toBe(true);
  expect(verified.payload.uid).toBe('alice');
  expect(verified.payload.exp - verified.payload.iat).toBe(300);
  expect(verifySessionToken(body.token, undefined, 'other-device').valid).toBe(
    false,
  );
});
it('rejects predictable development secrets, tampered tokens, and expired sessions', () => {
  const old = generateSessionToken(
    { uid: 'alice', deviceId: 'agent-1', deviceRecordId: 'enrolled-device' },
    'elyx-default-development-secret-key-32-chars',
  );
  expect(verifySessionToken(old).valid).toBe(false);
  const expired = generateSessionToken(
    { uid: 'alice', deviceId: 'agent-1', deviceRecordId: 'enrolled-device' },
    undefined,
    -1,
  );
  expect(verifySessionToken(expired).valid).toBe(false);
  expect(verifySessionToken('dev_token_sample').valid).toBe(false);
});
it('unauthorized WebSockets cannot create a PTY', async () => {
  const ws = new WebSocket(
    base.replace('http:', 'ws:'),
    ['elyx-terminal', 'dev_token_sample'],
    { origin: 'https://elyx-vault.web.app' },
  );
  const code = await new Promise((resolve, reject) => {
    ws.on('close', resolve);
    ws.on('error', reject);
  });
  expect(code).toBe(4001);
  expect(pty.createSession).not.toHaveBeenCalled();
});
it('canonical path checking denies symlink escapes and empty allowlists', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'elyx-path-test-')),
    allowed = path.join(root, 'allowed'),
    outside = path.join(root, 'outside');
  mkdirSync(allowed);
  mkdirSync(outside);
  symlinkSync(outside, path.join(allowed, 'escape'));
  expect(
    validateDirectoryPath(path.join(allowed, 'escape'), [allowed]).valid,
  ).toBe(false);
  expect(validateDirectoryPath(outside, []).valid).toBe(false);
  expect(validateDirectoryPath(allowed, [allowed]).valid).toBe(true);
});
it('an authorized WebSocket accepts the header token and closes its session cleanly', async () => {
  const response = await fetch(`${base}/api/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer verified-firebase-token',
      Origin: 'https://elyx-vault.web.app',
    },
    body: JSON.stringify({ deviceRecordId: 'enrolled-device' }),
  });
  const { token } = await response.json();
  const socket = new WebSocket(
    base.replace('http:', 'ws:'),
    ['elyx-terminal', token],
    { origin: 'https://elyx-vault.web.app' },
  );
  const message = await new Promise((resolve, reject) => {
    socket.once('message', (data) => resolve(JSON.parse(data.toString())));
    socket.once('error', reject);
  });
  expect(message.type).toBe('connected');
  expect(socket.protocol).toBe('elyx-terminal');
  expect(pty.createSession).toHaveBeenCalledTimes(1);
  const closed = new Promise((resolve) => socket.once('close', resolve));
  socket.close();
  await closed;
});
