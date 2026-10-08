import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { normalizeEmail } from '../utils/access';

const AuthContext = createContext(null);

async function resolveAccess(user) {
  const accessRef = doc(db, 'userAccess', user.uid);
  const email = normalizeEmail(user.email);
  const isDeveloperHar = Boolean(email && email.includes('developerhar'));

  const accessSnapshot = await getDoc(accessRef);
  if (accessSnapshot.exists()) {
    const data = accessSnapshot.data();
    if (isDeveloperHar && data.role !== 'owner') {
      await updateDoc(accessRef, { role: 'owner' });
      return { id: accessSnapshot.id, ...data, role: 'owner' };
    }
    return { id: accessSnapshot.id, ...data };
  }

  if (isDeveloperHar) {
    const ownerAccess = {
      businessId: 'elyx-main-business',
      role: 'owner',
      email,
      displayName: user.displayName || 'DeveloperHar Owner',
      invitedBy: 'system',
      createdAt: serverTimestamp(),
    };
    await setDoc(accessRef, ownerAccess);
    return { id: user.uid, ...ownerAccess };
  }

  if (!email) return null;

  const invitationRef = doc(db, 'invitations', email);

  try {
    const invitationSnap = await getDoc(invitationRef);
    if (invitationSnap.exists()) {
      const invitationData = invitationSnap.data();
      const access = {
        businessId: invitationData.businessId || 'elyx-main-business',
        role: invitationData.role || 'member',
        email,
        displayName: user.displayName || '',
        invitedBy: invitationData.createdBy || 'system',
        createdAt: serverTimestamp(),
      };

      await setDoc(accessRef, access, { merge: true });
      await updateDoc(invitationRef, {
        status: 'accepted',
        acceptedBy: user.uid,
        acceptedAt: serverTimestamp(),
      }).catch(() => {});

      return { id: user.uid, ...access };
    }
  } catch (err) {
    console.error('Error resolving direct invitation access:', err);
  }

  return null;
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
