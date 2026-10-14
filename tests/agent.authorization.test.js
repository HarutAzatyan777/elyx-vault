// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { authorizeFirebaseRequest } from '../agent/src/auth/authorizeFirebase.js';
const mocks = vi.hoisted(() => ({ verify: vi.fn(), records: {} }));
const services = {
  getApps: () => [{}],
  getAuth: () => ({ verifyIdToken: mocks.verify }),
  getFirestore: () => ({
    doc: (path) => ({
      get: async () => ({
        exists: Boolean(mocks.records[path]),
        data: () => mocks.records[path],
      }),
    }),
  }),
};
beforeEach(() => {
  mocks.verify.mockReset().mockResolvedValue({ uid: 'alice' });
  mocks.records = {
    'userAccess/alice': { status: 'active', role: 'owner', businessId: 'a' },
    'devices/record': {
      uid: 'alice',
      deviceId: 'physical',
      enrollmentState: 'approved',
    },
  };
});
it('verifies Firebase token revocation and both app/device authorization', async () => {
  const identity = await authorizeFirebaseRequest(
    'firebase-token',
    'record',
    'physical',
    ['alice'],
    services,
  );
  expect(mocks.verify).toHaveBeenCalledWith('firebase-token', true);
  expect(identity.uid).toBe('alice');
});
it('rejects unknown paired users, pending roles, and another user’s enrollment', async () => {
  await expect(
    authorizeFirebaseRequest('token', 'record', 'physical', [], services),
  ).rejects.toThrow();
  mocks.records['userAccess/alice'].status = 'pending';
  await expect(
    authorizeFirebaseRequest(
      'token',
      'record',
      'physical',
      ['alice'],
      services,
    ),
  ).rejects.toThrow();
  mocks.records['userAccess/alice'].status = 'active';
  mocks.records['devices/record'].uid = 'bob';
  await expect(
    authorizeFirebaseRequest(
      'token',
      'record',
      'physical',
      ['alice'],
      services,
    ),
  ).rejects.toThrow();
});
it('a revoked Firebase token cannot mint a terminal session', async () => {
  mocks.verify.mockRejectedValueOnce(Error('revoked'));
  await expect(
    authorizeFirebaseRequest(
      'token',
      'record',
      'physical',
      ['alice'],
      services,
    ),
  ).rejects.toThrow();
});
