// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  collection,
  where,
  getDocs,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getBytes } from 'firebase/storage';
import { ref as databaseRef, set, get } from 'firebase/database';
const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
describe.skipIf(!enabled)('Firebase authorization emulators', () => {
  let env;
  const db = (uid, claims = {}) =>
    env
      .authenticatedContext(uid, {
        email: `${uid}@example.com`,
        email_verified: true,
        ...claims,
      })
      .firestore();
  const access = (
    uid,
    role = 'member',
    businessId = 'a',
    status = 'active',
  ) => ({ role, businessId, status, email: `${uid}@example.com` });
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-elyx-hardening',
      firestore: { rules: await readFile('firestore.rules', 'utf8') },
      database: { rules: await readFile('database.rules.json', 'utf8') },
      storage: { rules: await readFile('storage.rules', 'utf8') },
    });
  });
  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      const admin = context.firestore();
      for (const [uid, role, business, status] of [
        ['alice', 'member', 'a', 'active'],
        ['viewer', 'viewer', 'a', 'active'],
        ['owner', 'owner', 'a', 'active'],
        ['manager', 'manager', 'a', 'active'],
        ['bob', 'owner', 'b', 'active'],
        ['pending', 'member', 'a', 'pending'],
      ])
        await setDoc(
          doc(admin, 'userAccess', uid),
          access(uid, role, business, status),
        );
      await setDoc(doc(admin, 'projects', 'project-a'), {
        businessId: 'a',
        createdBy: 'alice',
        encryptedPassword: 'ciphertext',
      });
      await setDoc(doc(admin, 'user_notes', 'alice-note'), {
        uid: 'alice',
        businessId: 'a',
        isEncrypted: true,
        content: 'ciphertext',
      });
      await setDoc(doc(admin, 'invitations', 'invitee@example.com'), {
        email: 'invitee@example.com',
        businessId: 'a',
        role: 'member',
        status: 'pending',
      });
    });
  });
  afterAll(async () => {
    await env?.cleanup();
  });
  it('Owner access uses exact UID membership; self inspection is allowed without active access', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'businesses', 'a'), { name: 'Original business' });
    });
    await assertSucceeds(getDoc(doc(db('owner'), 'userAccess', 'owner')));
    await assertSucceeds(getDoc(doc(db('owner'), 'businesses', 'a')));
    await assertSucceeds(getDoc(doc(db('pending'), 'userAccess', 'pending')));
    await assertSucceeds(getDoc(doc(db('missing-owner'), 'userAccess', 'missing-owner')));
    await assertFails(getDoc(doc(db('missing-owner', { role: 'owner', email: 'developerhar@example.com' }), 'businesses', 'a')));
    await assertFails(getDoc(doc(db('owner'), 'businesses', 'b')));
  });
  it('email substring never grants owner and pending users cannot read protected data', async () => {
    await assertFails(
      setDoc(
        doc(db('developerhar-attacker'), 'userAccess', 'developerhar-attacker'),
        access('developerhar-attacker', 'owner'),
      ),
    );
    await assertFails(getDoc(doc(db('pending'), 'projects', 'project-a')));
    await assertFails(
      getDoc(
        doc(env.unauthenticatedContext().firestore(), 'projects', 'project-a'),
      ),
    );
  });
  it('personal data stays private even from business owners and cannot transfer uid', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), 'user_notes', 'alice-note')));
    await assertFails(getDoc(doc(db('owner'), 'user_notes', 'alice-note')));
    await assertFails(getDoc(doc(db('bob'), 'user_notes', 'alice-note')));
    await assertFails(
      updateDoc(doc(db('alice'), 'user_notes', 'alice-note'), { uid: 'bob' }),
    );
  });
  it('business administration is scoped; managers cannot promote or touch owners', async () => {
    await assertFails(
      updateDoc(doc(db('manager'), 'userAccess', 'manager'), { role: 'owner' }),
    );
    await assertFails(
      updateDoc(doc(db('manager'), 'userAccess', 'owner'), { role: 'member' }),
    );
    await assertFails(
      updateDoc(doc(db('owner'), 'userAccess', 'bob'), { role: 'member' }),
    );
    await assertSucceeds(
      updateDoc(doc(db('owner'), 'userAccess', 'alice'), { role: 'manager' }),
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(db('manager'), 'userAccess'),
          where('businessId', '==', 'a'),
        ),
      ),
    );
  });
  it('self profile cannot change status/role and viewers cannot modify business projects', async () => {
    await assertFails(
      updateDoc(doc(db('alice'), 'userAccess', 'alice'), {
        status: 'active',
        role: 'owner',
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db('alice'), 'userAccess', 'alice'), {
        displayName: 'Alice',
      }),
    );
    await assertFails(
      updateDoc(doc(db('viewer'), 'projects', 'project-a'), {
        encryptedPassword: 'changed',
      }),
    );
    await assertFails(
      updateDoc(doc(db('alice'), 'projects', 'project-a'), { businessId: 'b' }),
    );
  });
  it('invitation acceptance is atomic, verified, role-bound and cannot be replayed', async () => {
    const client = db('invitee');
    await assertFails(
      setDoc(doc(client, 'userAccess', 'invitee'), access('invitee')),
    );
    const batch = writeBatch(client);
    batch.set(doc(client, 'userAccess', 'invitee'), access('invitee'));
    batch.update(doc(client, 'invitations', 'invitee@example.com'), {
      status: 'accepted',
      acceptedBy: 'invitee',
    });
    await assertSucceeds(batch.commit());
    await assertFails(
      updateDoc(doc(client, 'invitations', 'invitee@example.com'), {
        status: 'pending',
      }),
    );
    await assertFails(
      updateDoc(doc(client, 'userAccess', 'invitee'), { role: 'owner' }),
    );
  });
  it('revoked invitations and unverified emails cannot claim access', async () => {
    await env.withSecurityRulesDisabled((context) =>
      updateDoc(
        doc(context.firestore(), 'invitations', 'invitee@example.com'),
        { status: 'revoked' },
      ),
    );
    const client = db('invitee');
    const batch = writeBatch(client);
    batch.set(doc(client, 'userAccess', 'invitee'), access('invitee'));
    batch.update(doc(client, 'invitations', 'invitee@example.com'), {
      status: 'accepted',
      acceptedBy: 'invitee',
    });
    await assertFails(batch.commit());
    await assertFails(
      getDoc(
        doc(
          db('invitee', { email_verified: false }),
          'invitations',
          'invitee@example.com',
        ),
      ),
    );
  });
  it('Storage rejects public uploads, cross-user objects, and pending users', async () => {
    const alice = env.authenticatedContext('alice').storage();
    await assertSucceeds(
      uploadBytes(
        storageRef(alice, 'media/alice/test.txt'),
        new Uint8Array([1]),
      ),
    );
    await assertFails(
      uploadBytes(
        storageRef(
          env.authenticatedContext('bob').storage(),
          'media/alice/evil.txt',
        ),
        new Uint8Array([1]),
      ),
    );
    await assertFails(
      uploadBytes(
        storageRef(
          env.unauthenticatedContext().storage(),
          'media/public/evil.txt',
        ),
        new Uint8Array([1]),
      ),
    );
    await assertFails(
      getBytes(
        storageRef(
          env.unauthenticatedContext().storage(),
          'media/alice/test.txt',
        ),
      ),
    );
    await assertFails(
      uploadBytes(
        storageRef(
          env.authenticatedContext('pending').storage(),
          'music/pending/evil.txt',
        ),
        new Uint8Array([1]),
      ),
    );
  });
  it('device/session mutations enforce the same roles as their apps', async () => {
    await assertFails(
      setDoc(doc(db('viewer'), 'devices', 'viewer-device'), { uid: 'viewer' }),
    );
    await assertFails(
      setDoc(doc(db('alice'), 'terminal_sessions', 'member-session'), {
        uid: 'alice',
      }),
    );
    await assertSucceeds(
      setDoc(doc(db('manager'), 'devices', 'manager-device'), {
        uid: 'manager',
      }),
    );
    await assertSucceeds(
      setDoc(doc(db('manager'), 'terminal_sessions', 'manager-session'), {
        uid: 'manager',
      }),
    );
  });
  it('Realtime Database disallows cross-user reads/writes and root writes', async () => {
    const alice = env.authenticatedContext('alice').database(),
      bob = env.authenticatedContext('bob').database();
    await assertSucceeds(
      set(databaseRef(alice, 'presence/alice'), { state: 'online' }),
    );
    await assertFails(get(databaseRef(bob, 'presence/alice')));
    await assertFails(
      set(databaseRef(bob, 'presence/alice'), { state: 'online' }),
    );
    await assertFails(
      set(databaseRef(alice), { presence: { alice: { state: 'online' } } }),
    );
  });
});
