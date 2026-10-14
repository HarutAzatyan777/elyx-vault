import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { setupUserPresence } from '../services/rtdbService';
import {
  canAcceptInvitation,
  isActiveAccess,
  normalizeEmail,
} from '../utils/access';
const AuthContext = createContext(null);
const deniedMessage =
  'This account does not have active business access. Ask your administrator to review your invitation or permissions.';

export async function resolveAccess(user) {
  if (!user?.uid) return null;
  const accessRef = doc(db, 'userAccess', user.uid);
  const existing = await getDoc(accessRef);
  if (existing.exists())
    return isActiveAccess(existing.data())
      ? { ...existing.data(), id: existing.id }
      : null;
  if (!user.emailVerified || !normalizeEmail(user.email)) return null;
  // Owners must be provisioned by a trusted administrator. Email text grants no privileges.
  const invitationRef = doc(db, 'invitations', normalizeEmail(user.email));
  return runTransaction(db, async (transaction) => {
    const [currentAccess, invitation] = await Promise.all([
      transaction.get(accessRef),
      transaction.get(invitationRef),
    ]);
    if (currentAccess.exists())
      return isActiveAccess(currentAccess.data())
        ? { ...currentAccess.data(), id: user.uid }
        : null;
    if (!invitation.exists() || !canAcceptInvitation(invitation.data(), user))
      return null;
    const invite = invitation.data();
    const payload = {
      businessId: invite.businessId,
      role: invite.role,
      email: normalizeEmail(user.email),
      displayName: user.displayName || '',
      invitedBy: invite.createdBy || '',
      status: 'active',
      createdAt: serverTimestamp(),
    };
    transaction.set(accessRef, payload);
    transaction.update(invitationRef, {
      status: 'accepted',
      acceptedBy: user.uid,
      acceptedAt: serverTimestamp(),
    });
    return { ...payload, id: user.uid };
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState('');
  const generation = useRef(0);
  const refreshAccess = useCallback(async () => {
    const current = auth.currentUser;
    const version = generation.current;
    setAccess(null);
    setLoading(true);
    setAccessError('');
    try {
      if (!current) return null;
      await current.getIdToken(true);
      const resolved = await resolveAccess(current);
      if (
        version !== generation.current ||
        auth.currentUser?.uid !== current.uid
      )
        return null;
      setAccess(resolved);
      if (!resolved) setAccessError(deniedMessage);
      return resolved;
    } catch {
      if (version === generation.current)
        setAccessError(
          'Access could not be verified. Reconnect and try again.',
        );
      return null;
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubscribeAccess = () => {};
    const unsubscribeAuth = onIdTokenChanged(auth, async (current) => {
      const version = ++generation.current;
      window.dispatchEvent(new Event('elyx:vault-locked'));
      window.dispatchEvent(new Event('ELYX_VAULT_LOCKED'));
      unsubscribeAccess();
      unsubscribeAccess = () => {};
      setAccess(null);
      setUser(current);
      setLoading(true);
      setAccessError('');
      if (!current) {
        setLoading(false);
        return;
      }
      try {
        await resolveAccess(current);
        if (
          version !== generation.current ||
          auth.currentUser?.uid !== current.uid
        )
          return;
        unsubscribeAccess = onSnapshot(
          doc(db, 'userAccess', current.uid),
          (snapshot) => {
            if (version !== generation.current) return;
            const data = snapshot.exists() ? snapshot.data() : null;
            const next = isActiveAccess(data)
              ? { ...data, id: snapshot.id }
              : null;
            if (!next) {
              window.dispatchEvent(new Event('elyx:vault-locked'));
              window.dispatchEvent(new Event('ELYX_VAULT_LOCKED'));
            }
            setAccess(next);
            setAccessError(next ? '' : deniedMessage);
            setLoading(false);
          },
          () => {
            if (version !== generation.current) return;
            setAccess(null);
            setAccessError(
              'Access verification failed. Reconnect and try again.',
            );
            setLoading(false);
          },
        );
      } catch {
        if (version !== generation.current) return;
        setAccess(null);
        setAccessError(
          'Access could not be verified. Reconnect and try again.',
        );
        setLoading(false);
      }
    });
    return () => {
      ++generation.current;
      unsubscribeAuth();
      unsubscribeAccess();
    };
  }, []);

  useEffect(() => {
    if (!user?.uid || !isActiveAccess(access)) return;
    return setupUserPresence(user.uid); // No account metadata or decrypted media titles in presence.
  }, [user?.uid, access?.status]);
  // The SDK renews ID tokens; on refresh failure, access fails closed.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible' && auth.currentUser)
        auth.currentUser.getIdToken(true).catch(() => {
          setAccess(null);
          setAccessError('Your session needs verification. Sign in again.');
        });
    };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);
  const value = useMemo(
    () => ({
      user,
      access,
      loading,
      accessError,
      refreshAccess,
      loginWithGoogle: () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        return signInWithPopup(auth, provider);
      },
      logout: () => {
        ++generation.current;
        setAccess(null);
        setUser(null);
        window.dispatchEvent(new Event('elyx:vault-locked'));
        window.dispatchEvent(new Event('ELYX_VAULT_LOCKED'));
        return signOut(auth);
      },
    }),
    [user, access, loading, accessError, refreshAccess],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
};
