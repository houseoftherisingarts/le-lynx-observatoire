import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../services/firebaseConfig';

const FONCTIONS = 'https://us-central1-le-lynx-observatoire.cloudfunctions.net';

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
        // Le serveur décide du rôle. Si la personne figure sur la liste
        // d'administration, le mode s'allume sans qu'elle ait à le demander.
        const role = await verifierRoleServeur(user);
        setProfile(role && role !== p.role ? { ...p, role } : p);
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
    const role = await verifierRoleServeur(result.user);
    setProfile(role && role !== p.role ? { ...p, role } : p);
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

/** Demande au serveur quel rôle porte cette personne. */
async function verifierRoleServeur(user: User): Promise<'admin' | 'member' | null> {
  try {
    const jeton = await user.getIdToken();
    const res = await fetch(`${FONCTIONS}/verifierRole`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { role?: 'admin' | 'member' };
    return data.role ?? null;
  } catch {
    return null;
  }
}
