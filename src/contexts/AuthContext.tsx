import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  auth,
  googleProvider,
  ensureUserProfile,
  subscribeUserScans,
  updatePreferredLanguage,
  ScanRecord,
  UserProfileRecord,
} from '../firebase';

interface AuthContextValue {
  user: User | null;
  profile: UserProfileRecord | null;
  authReady: boolean;
  authLoading: boolean;
  authError: string | null;
  scans: ScanRecord[];
  scansLoading: boolean;
  scansError: string | null;
  signInWithGoogle: () => Promise<User | null>;
  signOutUser: () => Promise<void>;
  setPreferredLanguage: (lang: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [scansLoading, setScansLoading] = useState(false);
  const [scansError, setScansError] = useState<string | null>(null);

  useEffect(() => {
    let unsubScans: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthError(null);

      if (unsubScans) {
        unsubScans();
        unsubScans = null;
      }

      if (!nextUser) {
        setProfile(null);
        setScans([]);
        setScansLoading(false);
        setScansError(null);
        setAuthReady(true);
        return;
      }

      setAuthReady(true);
      setScansLoading(true);
      setScansError(null);

      try {
        const ensured = await ensureUserProfile({
          uid: nextUser.uid,
          displayName: nextUser.displayName,
          email: nextUser.email,
          photoURL: nextUser.photoURL,
        });
        setProfile(ensured);

        unsubScans = subscribeUserScans(
          nextUser.uid,
          (items) => {
            setScans(items);
            setScansLoading(false);
          },
          (err) => {
            setScansError(err.message);
            setScansLoading(false);
          }
        );
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Failed to initialize user profile.');
        setScansLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubScans) unsubScans();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const ensured = await ensureUserProfile({
        uid: cred.user.uid,
        displayName: cred.user.displayName,
        email: cred.user.email,
        photoURL: cred.user.photoURL,
      });
      setProfile(ensured);
      return cred.user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setAuthError(msg);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const setPreferredLanguage = useCallback(
    async (lang: string) => {
      if (!user) return;
      setProfile((prev) => (prev ? { ...prev, preferredLanguage: lang } : prev));
      await updatePreferredLanguage(user.uid, lang);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        authReady,
        authLoading,
        authError,
        scans,
        scansLoading,
        scansError,
        signInWithGoogle,
        signOutUser,
        setPreferredLanguage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
