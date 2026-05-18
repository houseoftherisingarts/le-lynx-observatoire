import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../services/firebaseConfig';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  joinedAt: unknown;
  role: 'admin' | 'member';
  implicationLevel: number;
  skills: string;
  hasVotedNoInReferendum: boolean;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const p = await fetchOrCreateProfile(user);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const p = await fetchOrCreateProfile(result.user);
    setProfile(p);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

async function fetchOrCreateProfile(user: User): Promise<UserProfile> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as UserProfile;
  }

  const newProfile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName || 'Membre',
    email: user.email || '',
    photoURL: user.photoURL || '',
    joinedAt: serverTimestamp(),
    role: 'member',
    implicationLevel: 1,
    skills: '',
    hasVotedNoInReferendum: false,
  };

  await setDoc(ref, newProfile);
  return newProfile;
}
