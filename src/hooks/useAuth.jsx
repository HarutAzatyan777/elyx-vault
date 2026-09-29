import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { normalizeEmail } from '../utils/access';

const AuthContext = createContext(null);

async function resolveAccess(user) {
  const accessRef = doc(db, 'userAccess', user.uid);
  const accessSnapshot = await getDoc(accessRef);
  if (accessSnapshot.exists()) return { id: accessSnapshot.id, ...accessSnapshot.data() };

  const email = normalizeEmail(user.email);
  if (!email || !user.emailVerified) return null;

  const invitationRef = doc(db, 'invitations', email);
  return runTransaction(db, async (transaction) => {
    const [currentAccess, invitation] = await Promise.all([
      transaction.get(accessRef),
      transaction.get(invitationRef),
    ]);

    if (currentAccess.exists()) return { id: currentAccess.id, ...currentAccess.data() };
    if (!invitation.exists()) return null;

    const invitationData = invitation.data();
    if (invitationData.status !== 'pending' || normalizeEmail(invitationData.email) !== email) {
      return null;
    }

    const access = {
      businessId: invitationData.businessId,
      role: invitationData.role,
      email,
      displayName: user.displayName || '',
      invitedBy: invitationData.createdBy,
      createdAt: serverTimestamp(),
    };
    transaction.set(accessRef, access);
    transaction.update(invitationRef, {
      status: 'accepted',
      acceptedBy: user.uid,
      acceptedAt: serverTimestamp(),
    });
    return { id: user.uid, ...access };
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState('');

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

  const value = useMemo(() => ({
    user,
    access,
    loading,
    accessError,
    loginWithGoogle: async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      return signInWithPopup(auth, provider);
    },
    logout: () => signOut(auth),
  }), [user, access, loading, accessError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
};
