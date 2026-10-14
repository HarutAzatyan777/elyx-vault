import React from 'react';
import { cleanup, render, screen, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth, resolveAccess } from '../src/hooks/useAuth.jsx';
const mock = vi.hoisted(() => ({
  auth: { currentUser: null },
  authListener: null,
  snapshots: new Map(),
  getDoc: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock('../src/config/firebase.js', () => ({ auth: mock.auth, db: {} }));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  onIdTokenChanged: (_, callback) => {
    mock.authListener = callback;
    return mock.unsubscribe;
  },
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  doc: (_, collection, id) => ({ collection, id }),
  getDoc: mock.getDoc,
  onSnapshot: (ref, emit) => {
    mock.snapshots.set(ref.id, emit);
    emit({
      exists: () => true,
      id: ref.id,
      data: () => ({ status: 'active', role: 'member', businessId: 'a' }),
    });
    return () => mock.snapshots.delete(ref.id);
  },
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(),
}));
vi.mock('../src/services/rtdbService.js', () => ({
  setupUserPresence: () => () => {},
}));
function State() {
  const { user, access } = useAuth();
  return (
    <p>
      {user?.uid || 'out'}:{access?.role || 'denied'}
    </p>
  );
}
afterEach(() => {
  cleanup();
  mock.getDoc.mockReset();
  mock.snapshots.clear();
  mock.auth.currentUser = null;
});
const snapshot = {
  exists: () => true,
  data: () => ({ status: 'active', role: 'member', businessId: 'a' }),
};
it('an existing active Owner is accepted by exact Auth UID without an email grant', async () => {
  mock.getDoc.mockResolvedValue({
    exists: () => true,
    id: 'historical-owner-uid',
    data: () => ({ role: 'owner', status: 'active', businessId: 'original-business', id: 'wrong-payload-id' }),
  });
  const result = await resolveAccess({ uid: 'historical-owner-uid', email: 'ordinary@example.com' });
  expect(mock.getDoc).toHaveBeenCalledWith({ collection: 'userAccess', id: 'historical-owner-uid' });
  expect(result).toMatchObject({ id: 'historical-owner-uid', role: 'owner', status: 'active', businessId: 'original-business' });
});
it.each([
  { role: 'owner', businessId: 'original-business' },
  { role: 'owner', status: 'pending', businessId: 'original-business' },
  { role: 'owner', status: 'disabled', businessId: 'original-business' },
  { role: 'owner', status: 'active', businessId: '' },
  { role: 'owner', status: 'active', businessId: '   ' },
])('invalid historical Owner membership fails closed: %j', async (record) => {
  mock.getDoc.mockResolvedValue({ exists: () => true, data: () => record });
  expect(await resolveAccess({ uid: 'historical-owner-uid', email: 'developerhar@example.com' })).toBeNull();
});
it('a missing UID record cannot be recovered from email or Owner claims alone', async () => {
  mock.getDoc.mockResolvedValue({ exists: () => false });
  expect(await resolveAccess({ uid: 'different-uid', email: 'developerhar@example.com', emailVerified: false, customClaims: { role: 'owner' } })).toBeNull();
  expect(mock.getDoc).toHaveBeenCalledWith({ collection: 'userAccess', id: 'different-uid' });
});
it('a late authorization response cannot restore access for the previous user', async () => {
  let finishAlice;
  mock.getDoc.mockImplementation((ref) =>
    ref.id === 'alice'
      ? new Promise((resolve) => {
          finishAlice = resolve;
        })
      : Promise.resolve(snapshot),
  );
  render(
    <AuthProvider>
      <State />
    </AuthProvider>,
  );
  const alice = { uid: 'alice' },
    bob = { uid: 'bob' };
  act(() => {
    mock.auth.currentUser = alice;
    void mock.authListener(alice);
  });
  await act(async () => {
    mock.auth.currentUser = bob;
    await mock.authListener(bob);
  });
  expect(screen.getByText('bob:member')).toBeTruthy();
  await act(async () => {
    finishAlice(snapshot);
    await Promise.resolve();
  });
  expect(screen.getByText('bob:member')).toBeTruthy();
  expect(mock.snapshots.has('alice')).toBe(false);
});
it('live revocation fails closed and unmount cleans the access listener', async () => {
  mock.getDoc.mockResolvedValue(snapshot);
  const { unmount } = render(
    <AuthProvider>
      <State />
    </AuthProvider>,
  );
  await act(async () => {
    mock.auth.currentUser = { uid: 'alice' };
    await mock.authListener(mock.auth.currentUser);
  });
  expect(screen.getByText('alice:member')).toBeTruthy();
  act(() =>
    mock.snapshots.get('alice')({
      exists: () => true,
      id: 'alice',
      data: () => ({ status: 'revoked', role: 'owner', businessId: 'a' }),
    }),
  );
  expect(screen.getByText('alice:denied')).toBeTruthy();
  unmount();
  expect(mock.snapshots.size).toBe(0);
});
