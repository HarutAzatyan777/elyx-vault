import { useState, useEffect } from 'react';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Custom hook to manage Firebase authentication state and provide auth helpers.
 *
 * @returns {{
 *   user: import('firebase/auth').User | null,
 *   loading: boolean,
 *   loginWithGoogle: () => Promise<import('firebase/auth').UserCredential>,
 *   logout: () => Promise<void>
 * }}
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      return await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('[Auth Error] Google sign-in failed:', error?.message || error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('[Auth Error] Sign-out failed:', error?.message || error);
      throw error;
    }
  };

  return { user, loading, loginWithGoogle, logout };
};
