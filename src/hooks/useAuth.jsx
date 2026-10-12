import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { setupUserPresence } from '../services/rtdbService';
import { ALL_ROLES, normalizeEmail } from '../utils/access';

const AuthContext = createContext(null);

/**
 * Resolves user authorization from Firestore:
 * 1. Checks active userAccess record by Auth UID.
 * 2. Checks DeveloperHar super-admin bootstrap.
 * 3. Finds pending invitation by normalized doc ID or query fallback.
 * 4. Atomically activates userAccess record and updates invitation to accepted.
 */
async function resolveAccess(user) {
  if (!user?.uid) return null;

  const accessRef = doc(db, 'userAccess', user.uid);
  const email = normalizeEmail(user.email);
  const isDeveloperHar = Boolean(email && email.includes('developerhar'));

  // 1. Check existing active access record by Firebase Auth UID
  const accessSnapshot = await getDoc(accessRef);
  if (accessSnapshot.exists()) {
    const data = accessSnapshot.data();
    if (isDeveloperHar && data.role !== 'owner') {
      await updateDoc(accessRef, { role: 'owner' });
      return { id: accessSnapshot.id, ...data, role: 'owner' };
    }
    return { id: accessSnapshot.id, ...data };
  }

  // 2. DeveloperHar automatic super-admin bootstrapping
  if (isDeveloperHar) {
    const ownerAccess = {
      businessId: 'elyx-main-business',
      role: 'owner',
      email,
      displayName: user.displayName || 'DeveloperHar Owner',
      invitedBy: 'system',
      status: 'active',
      createdAt: serverTimestamp(),
    };
    await setDoc(accessRef, ownerAccess);
    return { id: user.uid, ...ownerAccess };
  }

  if (!email) return null;

  // 3. Search for invitation:
  // Primary check: Direct normalized doc lookup (invitations/{normalizedEmail})
  const invitationRef = doc(db, 'invitations', email);
  let actualInvitationRef = invitationRef;
  let invitationData = null;

  try {
    const directSnap = await getDoc(invitationRef);
    if (directSnap.exists()) {
      invitationData = directSnap.data();
    } else {
      // Fallback 1: Query collection by normalized email field
      const q = query(
        collection(db, 'invitations'),
        where('email', '==', email)
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const foundDoc = querySnap.docs[0];
        actualInvitationRef = foundDoc.ref;
        invitationData = foundDoc.data();
      } else if (user.email && user.email !== email) {
        // Fallback 2: Query by un-normalized original email string if casing differed
        const qOriginal = query(
          collection(db, 'invitations'),
          where('email', '==', user.email.trim())
        );
        const origSnap = await getDocs(qOriginal);
        if (!origSnap.empty) {
          const foundDoc = origSnap.docs[0];
          actualInvitationRef = foundDoc.ref;
          invitationData = foundDoc.data();
        }
      }
    }

    // 4. If a valid invitation is found, atomically accept and activate
    if (invitationData) {
      const assignedRole = ALL_ROLES.includes(invitationData.role)
        ? invitationData.role
        : 'member';
      const businessId = invitationData.businessId || 'elyx-main-business';

      const accessPayload = {
        businessId,
        role: assignedRole,
        email,
        displayName: user.displayName || email.split('@')[0],
        invitedBy: invitationData.createdBy || 'system',
        status: 'active',
        createdAt: serverTimestamp(),
      };

      try {
        await runTransaction(db, async (transaction) => {
          const currentAccess = await transaction.get(accessRef);
          if (!currentAccess.exists()) {
            transaction.set(accessRef, accessPayload);
          }
          transaction.update(actualInvitationRef, {
            status: 'accepted',
            acceptedBy: user.uid,
            acceptedAt: serverTimestamp(),
          });
          // Ensure normalized doc ID exists if original was auto-generated
          if (actualInvitationRef.id !== email) {
            transaction.set(
              doc(db, 'invitations', email),
              {
                ...invitationData,
                email,
                status: 'accepted',
                acceptedBy: user.uid,
                acceptedAt: serverTimestamp(),
              },
              { merge: true }
            );
          }
        });
        return { id: user.uid, ...accessPayload };
      } catch (txError) {
        console.warn('[useAuth] Atomic transaction error, falling back to direct write:', txError);
        await setDoc(accessRef, accessPayload, { merge: true });
        await updateDoc(actualInvitationRef, {
          status: 'accepted',
          acceptedBy: user.uid,
          acceptedAt: serverTimestamp(),
        }).catch((updateErr) => {
          console.warn('[useAuth] Could not mark invitation accepted:', updateErr);
        });
        return { id: user.uid, ...accessPayload };
      }
    }
  } catch (err) {
    console.error('[useAuth] Error resolving invitation access:', err);
  }

  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState('');

  const refreshAccess = useCallback(async () => {
    if (!auth.currentUser) {
      setAccess(null);
      return null;
    }
    setLoading(true);
    setAccessError('');
    try {
      const resolved = await resolveAccess(auth.currentUser);
      setAccess(resolved);
      if (!resolved) {
        setAccessError('This account has not been invited to a business yet. Ask your manager to add this email, then try again.');
      }
      return resolved;
    } catch (err) {
      console.error('[AuthProvider] Failed to refresh access:', err);
      setAccessError('We could not verify your business access. Please try again or contact your manager.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth, async (currentUser) => {
    setLoading(true);
    setAccessError('');
    setUser(currentUser);

    if (!currentUser) {
      setAccess(null);
      setLoading(false);
      return;
    }

    try {
      const resolvedAccess = await resolveAccess(currentUser);
      setAccess(resolvedAccess);
      if (!resolvedAccess) {
        setAccessError('This account has not been invited to a business yet. Ask your manager to add this email, then try again.');
      }
    } catch (error) {
      console.error('[Authorization Error] Failed to verify access:', error);
      setAccess(null);
      setAccessError('We could not verify your business access. Please try again or contact your manager.');
    } finally {
      setLoading(false);
    }
  }), []);

  // Track live user presence in Firebase Realtime Database
  useEffect(() => {
    if (!user?.uid) return;
    const cleanup = setupUserPresence(user.uid, {
      email: user.email || '',
      displayName: user.displayName || '',
      role: access?.role || 'member',
    });
    return cleanup;
  }, [user?.uid, access?.role]);

  const value = useMemo(() => ({
    user,
    access,
    loading,
    accessError,
    refreshAccess,
    loginWithGoogle: async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      return signInWithPopup(auth, provider);
    },
    logout: () => signOut(auth),
  }), [user, access, loading, accessError, refreshAccess]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
};
